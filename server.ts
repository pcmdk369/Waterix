import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import crypto from 'crypto';
import sharp from 'sharp';
import { createServer as createViteServer } from 'vite';
import {
  createJob,
  getJob,
  updateJob,
  deleteJob,
  TEMP_BASE_DIR,
} from './server/jobStore';
import { processImageInpainting } from './server/inpainting';
import { processVideoDelogo, getVideoMetadata } from './server/videoProcessor';
import {
  processImageTextWatermark,
  processImageLogoWatermark,
  processVideoWatermark,
  renderTextWatermarkBadge,
  renderLogoWatermarkBadge,
} from './server/watermarkProcessor';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure temp upload directory exists
const UPLOAD_TEMP_DIR = path.join(os.tmpdir(), 'waterix_uploads');
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

// Multer storage setup for temporary upload isolation
const upload = multer({
  dest: UPLOAD_TEMP_DIR,
  limits: {
    fileSize: 35 * 1024 * 1024, // 35MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.avif', '.heic', '.heif', '.svg', '.ico'];
    const videoExts = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp', '.flv', '.wmv', '.ogv', '.ts'];

    const isImage = mime.startsWith('image/') || imageExts.includes(ext);
    const isVideo = mime.startsWith('video/') || videoExts.includes(ext);

    // Accept if mime is valid image/video, recognized extension, or clipboard blob without extension/generic mime
    if (isImage || isVideo || !ext || !mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format (${ext || mime}). Please upload an image or video file.`));
    }
  },
});

// API Routes FIRST

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WATERIX™ AI Watermark Removal Engine',
    timestamp: new Date().toISOString(),
  });
});

// 2. Upload endpoint with bulletproof JSON error wrapper
app.post(
  '/api/upload',
  (req, res, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        console.warn('Upload error from multer:', err.message);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File exceeds 25MB limit. Please upload a smaller file.' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Failed to parse uploaded file' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file received. Please choose a file to upload.' });
      }

      const file = req.file;
      const jobId = `job_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const jobDir = path.join(TEMP_BASE_DIR, jobId);
      await fs.promises.mkdir(jobDir, { recursive: true });

      // Determine extension and media type
      let origExt = path.extname(file.originalname).toLowerCase();
      const mime = (file.mimetype || '').toLowerCase();
      const isVideo = mime.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp'].includes(origExt);
      const mediaType = isVideo ? 'video' : 'image';

      if (!origExt) {
        origExt = isVideo ? '.mp4' : '.png';
      }

      const originalFilename = (path.basename(file.originalname) || `media${origExt}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetOriginalPath = path.join(jobDir, `original${origExt}`);

      // Safe move or copy in case of cross-filesystem temp paths
      try {
        await fs.promises.rename(file.path, targetOriginalPath);
      } catch (moveErr) {
        await fs.promises.copyFile(file.path, targetOriginalPath);
        await fs.promises.unlink(file.path).catch(() => {});
      }

      let width = 0;
      let height = 0;
      let duration: number | undefined = undefined;

      if (mediaType === 'image') {
        try {
          const metadata = await sharp(targetOriginalPath).metadata();
          width = metadata.width || 1200;
          height = metadata.height || 800;
        } catch (err) {
          console.warn('Sharp metadata warning, defaulting dimensions:', err);
          width = 1200;
          height = 800;
        }
      } else {
        try {
          const meta = await getVideoMetadata(targetOriginalPath);
          width = meta.width;
          height = meta.height;
          duration = meta.duration;
        } catch (err) {
          console.warn('Video metadata warning, defaulting dimensions:', err);
          width = 1280;
          height = 720;
          duration = 10;
        }
      }

      createJob(
        jobId,
        mediaType,
        originalFilename,
        targetOriginalPath,
        origExt,
        file.mimetype || (mediaType === 'image' ? 'image/png' : 'video/mp4'),
        width,
        height,
        duration
      );

      res.json({
        jobId,
        mediaType,
        filename: originalFilename,
        originalUrl: `/api/media/${jobId}/original`,
        width,
        height,
        duration,
      });
    } catch (err: any) {
      console.error('Upload handler error:', err);
      res.status(500).json({ error: err.message || 'Internal error processing media upload' });
    }
  }
);

// 3. Image Remove Endpoint
app.post(['/api/image/remove', '/api/remove/image'], async (req, res) => {
  const { jobId, maskDataUrl, bbox } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  if (job.mediaType !== 'image') {
    return res.status(400).json({ error: 'Job media type is not an image' });
  }

  updateJob(jobId, {
    status: 'processing',
    stage: 'Preparing',
    progress: 15,
  });

  const jobDir = path.join(TEMP_BASE_DIR, jobId);
  const processedPath = path.join(jobDir, `processed${job.originalExt}`);

  // Run inpainting asynchronously
  (async () => {
    try {
      await processImageInpainting({
        imagePath: job.originalPath,
        outputPath: processedPath,
        maskDataUrl,
        bbox,
        onProgress: (progress, stage) => {
          updateJob(jobId, { progress, stage });
        },
      });

      updateJob(jobId, {
        processedPath,
        status: 'completed',
        stage: 'Finalizing',
        progress: 100,
      });
    } catch (err: any) {
      console.error(`Image inpainting failed for job ${jobId}:`, err);
      updateJob(jobId, {
        status: 'failed',
        error: err.message || 'Image processing failed',
      });
    }
  })();

  res.json({
    jobId,
    status: 'processing',
    message: 'Image restoration initiated',
  });
});

// 4. Video Remove Endpoint
app.post(['/api/video/remove', '/api/remove/video'], async (req, res) => {
  const { jobId, bbox } = req.body;
  if (!jobId || !bbox) {
    return res.status(400).json({ error: 'Missing jobId or bbox' });
  }

  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  if (job.mediaType !== 'video') {
    return res.status(400).json({ error: 'Job media type is not video' });
  }

  updateJob(jobId, {
    status: 'processing',
    stage: 'Preparing',
    progress: 10,
  });

  const jobDir = path.join(TEMP_BASE_DIR, jobId);
  const processedPath = path.join(jobDir, 'processed.mp4');

  // Run video delogo asynchronously
  (async () => {
    try {
      await processVideoDelogo({
        inputPath: job.originalPath,
        outputPath: processedPath,
        bbox,
        videoMetadata: {
          width: job.width || 1280,
          height: job.height || 720,
          duration: job.duration || 10,
        },
        onProgress: (progress, stage) => {
          updateJob(jobId, { progress, stage });
        },
      });

      updateJob(jobId, {
        processedPath,
        status: 'completed',
        stage: 'Finalizing',
        progress: 100,
      });
    } catch (err: any) {
      console.error(`Video processing failed for job ${jobId}:`, err);
      updateJob(jobId, {
        status: 'failed',
        error: err.message || 'Video processing failed',
      });
    }
  })();

  res.json({
    jobId,
    status: 'processing',
    message: 'Video watermark removal initiated',
  });
});

// 5. Add Watermark - Text
app.post(['/api/watermark/text'], async (req, res) => {
  const { jobId, text, options } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  const wmOptions = {
    text: text || options?.text || 'WATERIX',
    ...(options || {}),
  };

  updateJob(jobId, {
    status: 'processing',
    stage: 'Preparing',
    progress: 15,
  });

  const jobDir = path.join(TEMP_BASE_DIR, jobId);

  if (job.mediaType === 'image') {
    const processedPath = path.join(jobDir, `processed${job.originalExt}`);
    (async () => {
      try {
        await processImageTextWatermark(job.originalPath, processedPath, wmOptions, (progress, stage) => {
          updateJob(jobId, { progress, stage });
        });
        updateJob(jobId, {
          processedPath,
          status: 'completed',
          stage: 'Finalizing',
          progress: 100,
        });
      } catch (err: any) {
        console.error(`Text watermark failed for image ${jobId}:`, err);
        updateJob(jobId, {
          status: 'failed',
          error: err.message || 'Watermarking failed',
        });
      }
    })();
  } else {
    // Video text watermarking
    const processedPath = path.join(jobDir, 'processed.mp4');
    (async () => {
      try {
        // Render text overlay image
        const vMeta = await getVideoMetadata(job.originalPath);
        const overlayImgPath = path.join(jobDir, 'overlay_temp.png');
        const isRepeat = !!wmOptions.repeat;

        if (isRepeat) {
          const blankCanvas = await sharp({
            create: {
              width: vMeta.width || 1280,
              height: vMeta.height || 720,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          })
            .png()
            .toBuffer();
          await processImageTextWatermark(blankCanvas, overlayImgPath, wmOptions);
        } else {
          const badgeBuffer = await renderTextWatermarkBadge(wmOptions, vMeta.width || 1280);
          await fs.promises.writeFile(overlayImgPath, badgeBuffer);
        }

        await processVideoWatermark(job.originalPath, processedPath, overlayImgPath, {
          startTime: wmOptions.startTime,
          endTime: wmOptions.endTime,
          movement: wmOptions.movement,
          position: wmOptions.position,
          customX: wmOptions.customX,
          customY: wmOptions.customY,
          margin: wmOptions.margin,
          isFullFrame: isRepeat,
        }, (progress, stage) => {
          updateJob(jobId, { progress, stage });
        });

        // Cleanup overlay image
        fs.promises.unlink(overlayImgPath).catch(() => {});

        updateJob(jobId, {
          processedPath,
          status: 'completed',
          stage: 'Finalizing',
          progress: 100,
        });
      } catch (err: any) {
        console.error(`Video text watermark failed for ${jobId}:`, err);
        updateJob(jobId, {
          status: 'failed',
          error: err.message || 'Video watermarking failed',
        });
      }
    })();
  }

  res.json({
    jobId,
    status: 'processing',
    message: 'Watermark application initiated',
  });
});

// 6. Add Watermark - Image / Logo
app.post(['/api/watermark/image', '/api/watermark/logo'], async (req, res) => {
  const { jobId, logoDataUrl, options } = req.body;
  if (!jobId || !logoDataUrl) {
    return res.status(400).json({ error: 'Missing jobId or logoDataUrl' });
  }

  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  updateJob(jobId, {
    status: 'processing',
    stage: 'Preparing',
    progress: 15,
  });

  const jobDir = path.join(TEMP_BASE_DIR, jobId);

  try {
    const base64Data = logoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const logoBuffer = Buffer.from(base64Data, 'base64');
    const wmOptions = { ...(options || {}) };

    if (job.mediaType === 'image') {
      const processedPath = path.join(jobDir, `processed${job.originalExt}`);
      (async () => {
        try {
          await processImageLogoWatermark(job.originalPath, processedPath, logoBuffer, wmOptions, (progress, stage) => {
            updateJob(jobId, { progress, stage });
          });
          updateJob(jobId, {
            processedPath,
            status: 'completed',
            stage: 'Finalizing',
            progress: 100,
          });
        } catch (err: any) {
          console.error(`Logo watermark failed for image ${jobId}:`, err);
          updateJob(jobId, {
            status: 'failed',
            error: err.message || 'Watermarking failed',
          });
        }
      })();
    } else {
      // Video logo watermark
      const processedPath = path.join(jobDir, 'processed.mp4');
      (async () => {
        try {
          const vMeta = await getVideoMetadata(job.originalPath);
          const overlayImgPath = path.join(jobDir, 'overlay_logo_temp.png');
          const isRepeat = !!wmOptions.repeat;

          if (isRepeat) {
            const blankCanvas = await sharp({
              create: {
                width: vMeta.width || 1280,
                height: vMeta.height || 720,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            })
              .png()
              .toBuffer();
            await processImageLogoWatermark(blankCanvas, overlayImgPath, logoBuffer, wmOptions);
          } else {
            const badgeBuffer = await renderLogoWatermarkBadge(logoBuffer, wmOptions, vMeta.width || 1280);
            await fs.promises.writeFile(overlayImgPath, badgeBuffer);
          }

          await processVideoWatermark(job.originalPath, processedPath, overlayImgPath, {
            startTime: wmOptions.startTime,
            endTime: wmOptions.endTime,
            movement: wmOptions.movement,
            position: wmOptions.position,
            customX: wmOptions.customX,
            customY: wmOptions.customY,
            margin: wmOptions.margin,
            isFullFrame: isRepeat,
          }, (progress, stage) => {
            updateJob(jobId, { progress, stage });
          });

          fs.promises.unlink(overlayImgPath).catch(() => {});

          updateJob(jobId, {
            processedPath,
            status: 'completed',
            stage: 'Finalizing',
            progress: 100,
          });
        } catch (err: any) {
          console.error(`Video logo watermark failed for ${jobId}:`, err);
          updateJob(jobId, {
            status: 'failed',
            error: err.message || 'Video logo watermarking failed',
          });
        }
      })();
    }

    res.json({
      jobId,
      status: 'processing',
      message: 'Logo watermark application initiated',
    });
  } catch (err: any) {
    console.error('Failed to parse logo buffer:', err);
    res.status(400).json({ error: 'Invalid logo image data' });
  }
});

// 7. Add Watermark - Video alias
app.post('/api/watermark/video', async (req, res) => {
  const { jobId, text, logoDataUrl, options } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  updateJob(jobId, {
    status: 'processing',
    stage: 'Preparing',
    progress: 15,
  });

  const jobDir = path.join(TEMP_BASE_DIR, jobId);
  const processedPath = path.join(jobDir, `processed.mp4`);

  (async () => {
    try {
      const vMeta = await getVideoMetadata(job.originalPath);
      const overlayImgPath = path.join(jobDir, 'overlay_video_temp.png');
      const wmOptions = { ...(options || {}) };

      const blankCanvas = await sharp({
        create: {
          width: vMeta.width || 1280,
          height: vMeta.height || 720,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer();

      const isRepeat = !!wmOptions.repeat;

      if (logoDataUrl) {
        const base64Data = logoDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const logoBuffer = Buffer.from(base64Data, 'base64');
        if (isRepeat) {
          await processImageLogoWatermark(blankCanvas, overlayImgPath, logoBuffer, wmOptions);
        } else {
          const badgeBuffer = await renderLogoWatermarkBadge(logoBuffer, wmOptions, vMeta.width || 1280);
          await fs.promises.writeFile(overlayImgPath, badgeBuffer);
        }
      } else {
        const textOptions = {
          text: text || options?.text || 'WATERIX',
          ...wmOptions,
        };
        if (isRepeat) {
          await processImageTextWatermark(blankCanvas, overlayImgPath, textOptions);
        } else {
          const badgeBuffer = await renderTextWatermarkBadge(textOptions, vMeta.width || 1280);
          await fs.promises.writeFile(overlayImgPath, badgeBuffer);
        }
      }

      await processVideoWatermark(
        job.originalPath,
        processedPath,
        overlayImgPath,
        {
          startTime: wmOptions.startTime,
          endTime: wmOptions.endTime,
          movement: wmOptions.movement,
          position: wmOptions.position,
          customX: wmOptions.customX,
          customY: wmOptions.customY,
          margin: wmOptions.margin,
          isFullFrame: isRepeat,
        },
        (progress: number, stage: any) => {
          updateJob(jobId, { progress, stage });
        }
      );

      fs.promises.unlink(overlayImgPath).catch(() => {});

      updateJob(jobId, {
        processedPath,
        status: 'completed',
        stage: 'Finalizing',
        progress: 100,
      });
    } catch (err: any) {
      console.error(`Video watermarking failed for job ${jobId}:`, err);
      updateJob(jobId, {
        status: 'failed',
        error: err.message || 'Video watermarking failed',
      });
    }
  })();

  res.json({
    jobId,
    status: 'processing',
    message: 'Video watermark application initiated',
  });
});

// 5. Job Status Polling
app.get('/api/job/:job_id', (req, res) => {
  const { job_id } = req.params;
  const job = getJob(job_id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  res.json({
    jobId: job.id,
    mediaType: job.mediaType,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    originalUrl: `/api/media/${job.id}/original`,
    processedUrl: job.status === 'completed' ? `/api/media/${job.id}/processed` : null,
    downloadUrl: job.status === 'completed' ? `/api/download/${job.id}` : null,
    error: job.error || null,
  });
});

// 6. Media Stream / Preview Endpoint
app.get('/api/media/:job_id/:type', (req, res) => {
  const { job_id, type } = req.params;
  const job = getJob(job_id);
  if (!job) {
    return res.status(404).send('Not found');
  }

  const filePath = type === 'processed' ? job.processedPath : job.originalPath;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Media file not ready or not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.webm') contentType = 'video/webm';

  // Support range requests for video playback
  const range = req.headers.range;
  if (range && job.mediaType === 'video') {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    fileStream.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 7. Download Endpoint
app.get('/api/download/:job_id', (req, res) => {
  const { job_id } = req.params;
  const job = getJob(job_id);

  if (!job || !job.processedPath || !fs.existsSync(job.processedPath)) {
    return res.status(404).send('Processed file not ready or expired');
  }

  const cleanName = `waterix-cleaned-${job.originalFilename}`;
  res.download(job.processedPath, cleanName, (err) => {
    if (err) {
      console.error(`Download error for job ${job_id}:`, err);
    }
  });
});

// 8. Delete Job (Manual cleanup after download or user reset)
app.delete('/api/job/:job_id', async (req, res) => {
  const { job_id } = req.params;
  await deleteJob(job_id);
  res.json({ success: true, message: 'Temporary files shredded and removed' });
});

// Global API error handler to guarantee all /api errors return JSON, never HTML
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error handler:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'An unexpected error occurred in the media processing engine.'
    });
  }
});

// Frontend Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WATERIX™ Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
