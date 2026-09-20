import { spawn } from 'child_process';

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

export async function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,duration',
      '-show_entries', 'format=duration',
      '-of', 'json',
      inputPath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    ffprobe.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
      }

      try {
        const data = JSON.parse(stdout);
        const stream = data.streams?.[0] || {};
        const format = data.format || {};

        const width = Number(stream.width) || 1280;
        const height = Number(stream.height) || 720;
        const duration = Number(stream.duration) || Number(format.duration) || 10;

        resolve({ width, height, duration });
      } catch (err) {
        reject(err);
      }
    });
  });
}

interface VideoProcessOptions {
  inputPath: string;
  outputPath: string;
  bbox: { x: number; y: number; width: number; height: number };
  videoMetadata?: VideoMetadata;
  onProgress?: (
    progress: number,
    stage: 'Uploading' | 'Preparing' | 'Detecting selected area' | 'AI Restoration' | 'Rebuilding Media' | 'Finalizing'
  ) => void;
}

export async function processVideoDelogo({
  inputPath,
  outputPath,
  bbox,
  videoMetadata,
  onProgress,
}: VideoProcessOptions): Promise<void> {
  onProgress?.(10, 'Preparing');

  const meta = videoMetadata || (await getVideoMetadata(inputPath));
  const totalDuration = Math.max(1, meta.duration);

  // Clamp bbox safely within video dimensions
  const x = Math.max(0, Math.min(meta.width - 4, Math.floor(bbox.x)));
  const y = Math.max(0, Math.min(meta.height - 4, Math.floor(bbox.y)));
  const w = Math.max(4, Math.min(meta.width - x, Math.floor(bbox.width)));
  const h = Math.max(4, Math.min(meta.height - y, Math.floor(bbox.height)));

  onProgress?.(25, 'Detecting selected area');

  const filter = `delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0`;

  return new Promise((resolve, reject) => {
    onProgress?.(35, 'AI Restoration');

    const args = [
      '-y',
      '-i', inputPath,
      '-vf', filter,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '22',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-progress', 'pipe:1',
      outputPath,
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('out_time_us=')) {
          const us = Number(line.substring(12).trim());
          if (!isNaN(us) && us > 0) {
            const currentSec = us / 1000000;
            const fraction = Math.min(0.95, currentSec / totalDuration);
            // Map to 35% -> 85% for AI restoration, 85% -> 95% rebuilding
            const currentPercent = Math.round(35 + fraction * 55);

            let currentStage: 'AI Restoration' | 'Rebuilding Media' = 'AI Restoration';
            if (currentPercent > 75) {
              currentStage = 'Rebuilding Media';
            }

            onProgress?.(currentPercent, currentStage);
          }
        }
      }
    });

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
      onProgress?.(98, 'Finalizing');
      resolve();
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}
