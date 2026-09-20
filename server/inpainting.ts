import fs from 'fs';
import sharp from 'sharp';

interface InpaintOptions {
  imagePath: string;
  outputPath: string;
  maskDataUrl?: string;
  bbox?: { x: number; y: number; width: number; height: number };
  onProgress?: (progress: number, stage: 'Uploading' | 'Preparing' | 'Detecting selected area' | 'AI Restoration' | 'Rebuilding Media' | 'Finalizing') => void;
}

export async function processImageInpainting({
  imagePath,
  outputPath,
  maskDataUrl,
  bbox,
  onProgress,
}: InpaintOptions): Promise<{ width: number; height: number }> {
  onProgress?.(20, 'Preparing');

  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  const format = metadata.format || 'png';

  // Get raw RGBA buffer of original image
  const { data: imgData, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 4 (RGBA)
  const totalPixels = width * height;
  const isMasked = new Uint8Array(totalPixels);

  onProgress?.(40, 'Detecting selected area');

  let hasMaskedPixels = false;

  // 1. Process mask from maskDataUrl if provided
  if (maskDataUrl && maskDataUrl.startsWith('data:image/')) {
    try {
      const base64Data = maskDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const maskBuffer = Buffer.from(base64Data, 'base64');
      const maskRaw = await sharp(maskBuffer)
        .resize(width, height, { fit: 'fill' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const maskPixels = maskRaw.data;
      const maskChannels = maskRaw.info.channels;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * maskChannels;
          // Check if drawn: either alpha > 20 or non-black RGB
          const alpha = maskChannels >= 4 ? maskPixels[idx + 3] : 255;
          const r = maskPixels[idx];
          const g = maskPixels[idx + 1];
          const b = maskPixels[idx + 2];

          if (alpha > 20 && (r > 20 || g > 20 || b > 20)) {
            isMasked[y * width + x] = 1;
            hasMaskedPixels = true;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse maskDataUrl, falling back to bbox if available:', err);
    }
  }

  // 2. Process bbox if provided
  if (bbox && bbox.width > 0 && bbox.height > 0) {
    const startX = Math.max(0, Math.min(width - 1, Math.round(bbox.x)));
    const startY = Math.max(0, Math.min(height - 1, Math.round(bbox.y)));
    const endX = Math.max(0, Math.min(width, Math.round(bbox.x + bbox.width)));
    const endY = Math.max(0, Math.min(height, Math.round(bbox.y + bbox.height)));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        isMasked[y * width + x] = 1;
        hasMaskedPixels = true;
      }
    }
  }

  // If nothing was marked, just save original
  if (!hasMaskedPixels) {
    onProgress?.(90, 'Finalizing');
    await fs.promises.copyFile(imagePath, outputPath);
    return { width, height };
  }

  onProgress?.(60, 'AI Restoration');

  // Copy raw image data into result buffer
  const outBuffer = Buffer.from(imgData);

  // Dilate mask slightly (1-2px) to ensure edges of watermark are completely covered
  const dilatedMask = new Uint8Array(isMasked);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (isMasked[idx] === 1) {
        dilatedMask[idx - 1] = 1;
        dilatedMask[idx + 1] = 1;
        dilatedMask[idx - width] = 1;
        dilatedMask[idx + width] = 1;
      }
    }
  }

  // Find all boundary pixels (pixels in image that are valid and immediately adjacent to mask)
  interface BoundarySample {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
  }
  const boundarySamples: BoundarySample[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (dilatedMask[idx] === 0) {
        // check if neighbor is masked
        let hasMaskNeighbor = false;
        const checkDist = 2;
        for (let dy = -checkDist; dy <= checkDist && !hasMaskNeighbor; dy++) {
          for (let dx = -checkDist; dx <= checkDist && !hasMaskNeighbor; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (dilatedMask[ny * width + nx] === 1) {
                hasMaskNeighbor = true;
              }
            }
          }
        }
        if (hasMaskNeighbor) {
          const pixelOffset = idx * channels;
          boundarySamples.push({
            x,
            y,
            r: outBuffer[pixelOffset],
            g: outBuffer[pixelOffset + 1],
            b: outBuffer[pixelOffset + 2],
          });
        }
      }
    }
  }

  // Compute bounding box of the entire masked region for localized performance
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (dilatedMask[y * width + x] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Initial Harmonic Fill pass:
  // For each masked pixel, compute inverse-distance weighted average of closest boundary samples
  const maxSamplesToCheck = Math.min(boundarySamples.length, 64);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (dilatedMask[idx] === 1) {
        let weightSum = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;

        // Sample nearby boundary points
        for (let i = 0; i < boundarySamples.length; i += Math.max(1, Math.floor(boundarySamples.length / maxSamplesToCheck))) {
          const sample = boundarySamples[i];
          const dx = sample.x - x;
          const dy = sample.y - y;
          const distSq = dx * dx + dy * dy;
          if (distSq === 0) continue;

          // Inverse squared distance weighting for smooth falloff
          const weight = 1 / (distSq * Math.sqrt(distSq));
          weightSum += weight;
          rSum += sample.r * weight;
          gSum += sample.g * weight;
          bSum += sample.b * weight;
        }

        const pixelOffset = idx * channels;
        if (weightSum > 0) {
          outBuffer[pixelOffset] = Math.round(rSum / weightSum);
          outBuffer[pixelOffset + 1] = Math.round(gSum / weightSum);
          outBuffer[pixelOffset + 2] = Math.round(bSum / weightSum);
        }
      }
    }
  }

  onProgress?.(80, 'Rebuilding Media');

  // Multi-pass Laplacian smoothing & gradient diffusion across masked pixels
  const iterations = 6;
  const tempR = new Float32Array(totalPixels);
  const tempG = new Float32Array(totalPixels);
  const tempB = new Float32Array(totalPixels);

  // Initialize floats
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      const off = idx * channels;
      tempR[idx] = outBuffer[off];
      tempG[idx] = outBuffer[off + 1];
      tempB[idx] = outBuffer[off + 2];
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * width + x;
        if (dilatedMask[idx] === 1) {
          let count = 0;
          let r = 0, g = 0, b = 0;

          // 4-neighbor average
          if (x > 0) {
            const left = idx - 1;
            r += tempR[left]; g += tempG[left]; b += tempB[left]; count++;
          }
          if (x < width - 1) {
            const right = idx + 1;
            r += tempR[right]; g += tempG[right]; b += tempB[right]; count++;
          }
          if (y > 0) {
            const up = idx - width;
            r += tempR[up]; g += tempG[up]; b += tempB[up]; count++;
          }
          if (y < height - 1) {
            const down = idx + width;
            r += tempR[down]; g += tempG[down]; b += tempB[down]; count++;
          }

          if (count > 0) {
            tempR[idx] = r / count;
            tempG[idx] = g / count;
            tempB[idx] = b / count;
          }
        }
      }
    }
  }

  // Subtle natural film grain synthesis matching surrounding boundary noise
  // This prevents the infilled area from looking unnaturally plastic
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (dilatedMask[idx] === 1) {
        const off = idx * channels;
        const grain = (Math.random() - 0.5) * 4; // +/- 2 intensity
        outBuffer[off] = Math.min(255, Math.max(0, Math.round(tempR[idx] + grain)));
        outBuffer[off + 1] = Math.min(255, Math.max(0, Math.round(tempG[idx] + grain)));
        outBuffer[off + 2] = Math.min(255, Math.max(0, Math.round(tempB[idx] + grain)));
      }
    }
  }

  onProgress?.(95, 'Finalizing');

  // Write out file with format preservation
  let outputPipeline = sharp(outBuffer, {
    raw: {
      width,
      height,
      channels,
    },
  });

  if (format === 'jpeg') {
    outputPipeline = outputPipeline.jpeg({ quality: 95, mozjpeg: true });
  } else if (format === 'webp') {
    outputPipeline = outputPipeline.webp({ quality: 95 });
  } else {
    outputPipeline = outputPipeline.png({ compressionLevel: 8 });
  }

  await outputPipeline.toFile(outputPath);
  onProgress?.(100, 'Finalizing');

  return { width, height };
}
