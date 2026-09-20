import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { getVideoMetadata } from './videoProcessor';

export interface TextWatermarkOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string; // hex like #ffffff
  opacity?: number; // 0 to 1
  isBold?: boolean;
  isItalic?: boolean;
  rotation?: number; // degrees -180 to 180
  letterSpacing?: number;
  shadow?: boolean;
  outline?: boolean;
  outlineColor?: string;
  position: string; // 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'custom'
  customX?: number; // 0 - 100 percentage
  customY?: number; // 0 - 100 percentage
  margin?: number; // px margin from edge
  repeat?: boolean; // tiled watermark across surface
  background?: boolean;
  backgroundColor?: string;
  // Video specific timing & movement
  startTime?: number; // seconds
  endTime?: number; // seconds
  movement?: 'none' | 'left-to-right' | 'top-to-bottom' | 'bounce';
}

export interface ImageWatermarkOptions {
  logoDataUrl?: string; // base64 data url or file path
  logoPath?: string;
  scale?: number; // scale percent e.g. 10% to 100% of media width
  opacity?: number; // 0 to 1
  rotation?: number; // degrees
  position: string;
  customX?: number;
  customY?: number;
  margin?: number;
  repeat?: boolean; // tiled
  startTime?: number;
  endTime?: number;
  movement?: 'none' | 'left-to-right' | 'top-to-bottom' | 'bounce';
}

// Helper to calculate X and Y pixel positions from alignment
function calculatePosition(
  position: string,
  targetW: number,
  targetH: number,
  elementW: number,
  elementH: number,
  margin: number,
  customXPct?: number,
  customYPct?: number
): { x: number; y: number } {
  if (position === 'custom') {
    const x = Math.round(((customXPct ?? 50) / 100) * (targetW - elementW));
    const y = Math.round(((customYPct ?? 50) / 100) * (targetH - elementH));
    return {
      x: Math.max(margin, Math.min(targetW - elementW - margin, x)),
      y: Math.max(margin, Math.min(targetH - elementH - margin, y)),
    };
  }

  let x = margin;
  let y = margin;

  if (position.includes('center') && !position.includes('left') && !position.includes('right')) {
    x = Math.round((targetW - elementW) / 2);
  } else if (position.includes('right')) {
    x = Math.max(0, targetW - elementW - margin);
  }

  if (position.startsWith('center') || position === 'center') {
    y = Math.round((targetH - elementH) / 2);
  } else if (position.startsWith('bottom')) {
    y = Math.max(0, targetH - elementH - margin);
  }

  return { x, y };
}

// Escape SVG text characters
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Helper to save pipeline to output path with appropriate format
async function savePipelineToFile(pipeline: ReturnType<typeof sharp>, outputPath: string): Promise<void> {
  const outExt = path.extname(outputPath).toLowerCase();
  if (outExt === '.jpg' || outExt === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: 95 });
  } else if (outExt === '.webp') {
    pipeline = pipeline.webp({ quality: 95 });
  } else if (outExt === '.png') {
    pipeline = pipeline.png();
  }
  const buffer = await pipeline.toBuffer();
  await fs.promises.writeFile(outputPath, buffer);
}

// Render transparent badge buffer for text watermark
export async function renderTextWatermarkBadge(
  options: TextWatermarkOptions,
  baseWidth?: number
): Promise<Buffer> {
  const width = baseWidth || 1200;
  const text = escapeXml(options.text || 'WATERIX');
  const fontSize = options.fontSize || Math.max(20, Math.round(width * 0.04));
  const fill = options.color || '#ffffff';
  const opacity = options.opacity !== undefined ? options.opacity : 0.8;
  const fontWeight = options.isBold ? 'bold' : 'normal';
  const fontStyle = options.isItalic ? 'italic' : 'normal';
  const fontFamily = options.fontFamily || 'Inter, -apple-system, sans-serif';
  const letterSpacing = options.letterSpacing ? `${options.letterSpacing}px` : '0px';
  const rotation = options.rotation || 0;

  const outlineStyle = options.outline
    ? `stroke="${options.outlineColor || '#000000'}" stroke-width="2" paint-order="stroke fill"`
    : '';
  const filterShadow = options.shadow
    ? `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.8" />
       </filter>`
    : '';
  const filterAttr = options.shadow ? 'filter="url(#shadow)"' : '';

  const approxTextWidth = Math.max(60, text.length * fontSize * 0.75 + 40);
  const approxTextHeight = fontSize * 1.6 + 24;

  const bgBox = options.background
    ? `<rect x="0" y="0" width="100%" height="100%" rx="8" fill="${options.backgroundColor || '#000000'}" fill-opacity="${Math.min(0.85, opacity + 0.1)}" />`
    : '';

  const badgeSvg = `
    <svg width="${approxTextWidth}" height="${approxTextHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${filterShadow}
      </defs>
      ${bgBox}
      <text x="50%" y="50%"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        font-style="${fontStyle}"
        letter-spacing="${letterSpacing}"
        fill="${fill}"
        fill-opacity="${opacity}"
        text-anchor="middle"
        dominant-baseline="central"
        ${outlineStyle}
        ${filterAttr}>
        ${text}
      </text>
    </svg>
  `;

  let renderedBadge = await sharp(Buffer.from(badgeSvg))
    .png()
    .toBuffer();

  if (rotation !== 0) {
    renderedBadge = await sharp(renderedBadge)
      .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
  }

  return renderedBadge;
}

// Render transparent badge buffer for logo watermark
export async function renderLogoWatermarkBadge(
  logoBuffer: Buffer,
  options: ImageWatermarkOptions,
  baseWidth?: number
): Promise<Buffer> {
  const width = baseWidth || 1200;
  const scalePct = Math.min(100, Math.max(5, options.scale || 20)) / 100;
  const targetLogoWidth = Math.round(width * scalePct);

  let processedLogo = sharp(logoBuffer)
    .resize({ width: targetLogoWidth, fit: 'inside' })
    .ensureAlpha();

  const opacity = options.opacity !== undefined ? Math.max(0.05, Math.min(1, options.opacity)) : 0.8;

  if (options.rotation && options.rotation !== 0) {
    processedLogo = processedLogo.rotate(options.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }

  const logoRaw = await processedLogo.toBuffer();
  const { data: logoPixels, info: logoInfo } = await sharp(logoRaw)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const logoCh = logoInfo.channels;
  for (let i = 0; i < logoPixels.length; i += logoCh) {
    if (logoCh >= 4) {
      logoPixels[i + 3] = Math.round(logoPixels[i + 3] * opacity);
    }
  }

  return sharp(logoPixels, {
    raw: {
      width: logoInfo.width,
      height: logoInfo.height,
      channels: logoCh,
    },
  })
    .png()
    .toBuffer();
}

// 1. Process Text Watermark on Image
export async function processImageTextWatermark(
  imageInput: string | Buffer,
  outputPath: string,
  options: TextWatermarkOptions,
  onProgress?: (progress: number, stage: any) => void
): Promise<void> {
  onProgress?.(25, 'Preparing');
  const inputBuffer = typeof imageInput === 'string' ? await fs.promises.readFile(imageInput) : imageInput;
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 800;

  onProgress?.(50, 'AI Restoration');

  const text = escapeXml(options.text || 'WATERIX');
  const fontSize = options.fontSize || Math.max(20, Math.round(width * 0.04));
  const fill = options.color || '#ffffff';
  const opacity = options.opacity !== undefined ? options.opacity : 0.8;
  const fontWeight = options.isBold ? 'bold' : 'normal';
  const fontStyle = options.isItalic ? 'italic' : 'normal';
  const fontFamily = options.fontFamily || 'Inter, -apple-system, sans-serif';
  const letterSpacing = options.letterSpacing ? `${options.letterSpacing}px` : '0px';
  const rotation = options.rotation || 0;
  const margin = options.margin !== undefined ? options.margin : 24;

  const outlineStyle = options.outline
    ? `stroke="${options.outlineColor || '#000000'}" stroke-width="2" paint-order="stroke fill"`
    : '';
  const filterShadow = options.shadow
    ? `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.8" />
       </filter>`
    : '';
  const filterAttr = options.shadow ? 'filter="url(#shadow)"' : '';

  if (options.repeat) {
    // Tiled pattern watermark across the entire image
    const patternWidth = Math.max(200, fontSize * 6);
    const patternHeight = Math.max(120, fontSize * 3.5);
    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${filterShadow}
          <pattern id="wm-pattern" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotation})">
            <text x="${patternWidth / 2}" y="${patternHeight / 2}"
              font-family="${fontFamily}"
              font-size="${fontSize}"
              font-weight="${fontWeight}"
              font-style="${fontStyle}"
              letter-spacing="${letterSpacing}"
              fill="${fill}"
              fill-opacity="${opacity}"
              text-anchor="middle"
              dominant-baseline="central"
              ${outlineStyle}
              ${filterAttr}>
              ${text}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wm-pattern)" />
      </svg>
    `;

    const pipeline = sharp(inputBuffer).composite([{ input: Buffer.from(svgOverlay), blend: 'over' }]);
    await savePipelineToFile(pipeline, outputPath);
  } else {
    // Single placement watermark
    const renderedBadge = await renderTextWatermarkBadge(options, width);
    const badgeMeta = await sharp(renderedBadge).metadata();
    const bW = badgeMeta.width || 200;
    const bH = badgeMeta.height || 60;

    const { x, y } = calculatePosition(
      options.position,
      width,
      height,
      bW,
      bH,
      margin,
      options.customX,
      options.customY
    );

    onProgress?.(85, 'Rebuilding Media');

    const pipeline = sharp(inputBuffer).composite([{
      input: renderedBadge,
      left: Math.round(x),
      top: Math.round(y),
      blend: 'over',
    }]);

    await savePipelineToFile(pipeline, outputPath);
  }

  onProgress?.(100, 'Finalizing');
}

// 2. Process Logo / Image Watermark on Image
export async function processImageLogoWatermark(
  imageInput: string | Buffer,
  outputPath: string,
  logoBuffer: Buffer,
  options: ImageWatermarkOptions,
  onProgress?: (progress: number, stage: any) => void
): Promise<void> {
  onProgress?.(25, 'Preparing');
  const inputBuffer = typeof imageInput === 'string' ? await fs.promises.readFile(imageInput) : imageInput;
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 800;

  onProgress?.(50, 'AI Restoration');

  const finalLogo = await renderLogoWatermarkBadge(logoBuffer, options, width);
  const logoMeta = await sharp(finalLogo).metadata();
  const logoW = logoMeta.width || 200;
  const logoH = logoMeta.height || 200;
  const margin = options.margin !== undefined ? options.margin : 24;

  if (options.repeat) {
    // Tile logo across image
    const composites: Array<{ input: Buffer; left: number; top: number; blend?: any }> = [];
    const stepX = logoW + 80;
    const stepY = logoH + 80;
    for (let y = margin; y < height; y += stepY) {
      for (let x = margin; x < width; x += stepX) {
        composites.push({
          input: finalLogo,
          left: x,
          top: y,
          blend: 'over',
        });
      }
    }

    onProgress?.(80, 'Rebuilding Media');
    const pipeline = sharp(inputBuffer).composite(composites);
    await savePipelineToFile(pipeline, outputPath);
  } else {
    const { x, y } = calculatePosition(
      options.position,
      width,
      height,
      logoW,
      logoH,
      margin,
      options.customX,
      options.customY
    );

    onProgress?.(85, 'Rebuilding Media');
    const pipeline = sharp(inputBuffer).composite([{
      input: finalLogo,
      left: Math.round(x),
      top: Math.round(y),
      blend: 'over',
    }]);
    await savePipelineToFile(pipeline, outputPath);
  }

  onProgress?.(100, 'Finalizing');
}

// 3. Process Text / Logo Watermark on Video using FFmpeg
export async function processVideoWatermark(
  inputPath: string,
  outputPath: string,
  overlayImagePath: string,
  options: {
    startTime?: number;
    endTime?: number;
    duration?: number;
    movement?: 'none' | 'left-to-right' | 'top-to-bottom' | 'bounce';
    position?: string;
    customX?: number;
    customY?: number;
    margin?: number;
    isFullFrame?: boolean;
  },
  onProgress?: (progress: number, stage: any) => void
): Promise<void> {
  onProgress?.(15, 'Preparing');

  const videoMeta = await getVideoMetadata(inputPath);
  const totalDuration = Math.max(1, videoMeta.duration || 10);

  const startSec = Number.isFinite(options.startTime) ? Math.max(0, options.startTime!) : 0;
  const endSec = Number.isFinite(options.endTime) && options.endTime! > startSec
    ? Math.min(totalDuration, options.endTime!)
    : totalDuration;

  let overlayX: string;
  let overlayY: string;

  if (options.isFullFrame) {
    overlayX = '0';
    overlayY = '0';
  } else {
    const margin = options.margin !== undefined ? Math.max(0, options.margin) : 24;
    let baseX = `main_w-overlay_w-${margin}`;
    let baseY = `main_h-overlay_h-${margin}`;

    switch (options.position) {
      case 'top-left':
        baseX = `${margin}`;
        baseY = `${margin}`;
        break;
      case 'top-center':
        baseX = `(main_w-overlay_w)/2`;
        baseY = `${margin}`;
        break;
      case 'top-right':
        baseX = `main_w-overlay_w-${margin}`;
        baseY = `${margin}`;
        break;
      case 'center-left':
        baseX = `${margin}`;
        baseY = `(main_h-overlay_h)/2`;
        break;
      case 'center':
        baseX = `(main_w-overlay_w)/2`;
        baseY = `(main_h-overlay_h)/2`;
        break;
      case 'center-right':
        baseX = `main_w-overlay_w-${margin}`;
        baseY = `(main_h-overlay_h)/2`;
        break;
      case 'bottom-left':
        baseX = `${margin}`;
        baseY = `main_h-overlay_h-${margin}`;
        break;
      case 'bottom-center':
        baseX = `(main_w-overlay_w)/2`;
        baseY = `main_h-overlay_h-${margin}`;
        break;
      case 'bottom-right':
        baseX = `main_w-overlay_w-${margin}`;
        baseY = `main_h-overlay_h-${margin}`;
        break;
      case 'custom': {
        const px = Math.max(0, Math.min(100, options.customX ?? 50)) / 100;
        const py = Math.max(0, Math.min(100, options.customY ?? 50)) / 100;
        baseX = `(main_w-overlay_w)*${px.toFixed(4)}`;
        baseY = `(main_h-overlay_h)*${py.toFixed(4)}`;
        break;
      }
      default:
        baseX = `main_w-overlay_w-${margin}`;
        baseY = `main_h-overlay_h-${margin}`;
        break;
    }

    if (options.movement === 'left-to-right') {
      overlayX = `mod(t*120,main_w+overlay_w)-overlay_w`;
      overlayY = baseY;
    } else if (options.movement === 'top-to-bottom') {
      overlayX = baseX;
      overlayY = `mod(t*80,main_h+overlay_h)-overlay_h`;
    } else if (options.movement === 'bounce') {
      overlayX = `abs(mod(t*100,(main_w-overlay_w)*2)-(main_w-overlay_w))`;
      overlayY = `abs(mod(t*60,(main_h-overlay_h)*2)-(main_h-overlay_h))`;
    } else {
      overlayX = baseX;
      overlayY = baseY;
    }
  }

  const enableExpr = `between(t,${startSec.toFixed(2)},${endSec.toFixed(2)})`;
  const filterComplex = `[0:v][1:v]overlay=x='${overlayX}':y='${overlayY}':enable='${enableExpr}'[ov];[ov]scale=trunc(iw/2)*2:trunc(ih/2)*2[v]`;

  onProgress?.(45, 'AI Restoration');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-i', overlayImagePath,
      '-filter_complex', filterComplex,
      '-map', '[v]',
      '-map', '0:a?', // copy original audio if present
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      outputPath,
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (chunk) => {
      const line = chunk.toString();
      stderr += line;

      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch && totalDuration > 0) {
        const hours = parseFloat(timeMatch[1]);
        const mins = parseFloat(timeMatch[2]);
        const secs = parseFloat(timeMatch[3]);
        const currentSecs = hours * 3600 + mins * 60 + secs;
        const pct = Math.min(95, Math.round(45 + (currentSecs / totalDuration) * 50));
        onProgress?.(pct, 'Rebuilding Media');
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        onProgress?.(100, 'Finalizing');
        resolve();
      } else {
        reject(new Error(`FFmpeg video watermarking failed (code ${code}): ${stderr.slice(-300)}`));
      }
    });
  });
}
