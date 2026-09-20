import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Job {
  id: string;
  mediaType: 'image' | 'video';
  originalFilename: string;
  originalPath: string;
  originalExt: string;
  mimeType: string;
  maskPath?: string;
  processedPath?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: 'Uploading' | 'Preparing' | 'Detecting selected area' | 'AI Restoration' | 'Rebuilding Media' | 'Finalizing';
  progress: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: number;
  error?: string;
}

export const TEMP_BASE_DIR = path.join(os.tmpdir(), 'waterix_jobs');

// Ensure base temporary directory exists
if (!fs.existsSync(TEMP_BASE_DIR)) {
  fs.mkdirSync(TEMP_BASE_DIR, { recursive: true });
}

const jobs = new Map<string, Job>();

export function createJob(
  id: string,
  mediaType: 'image' | 'video',
  originalFilename: string,
  originalPath: string,
  originalExt: string,
  mimeType: string,
  width?: number,
  height?: number,
  duration?: number
): Job {
  const job: Job = {
    id,
    mediaType,
    originalFilename,
    originalPath,
    originalExt,
    mimeType,
    status: 'queued',
    stage: 'Uploading',
    progress: 100,
    width,
    height,
    duration,
    createdAt: Date.now(),
  };

  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  const updated = { ...job, ...updates };
  jobs.set(id, updated);
  return updated;
}

export async function deleteJob(id: string): Promise<boolean> {
  const jobDir = path.join(TEMP_BASE_DIR, id);
  try {
    if (fs.existsSync(jobDir)) {
      await fs.promises.rm(jobDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Failed to delete directory for job ${id}:`, err);
  }
  return jobs.delete(id);
}

// Cleanup jobs older than 30 minutes
export async function cleanupExpiredJobs(maxAgeMs = 30 * 60 * 1000): Promise<number> {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > maxAgeMs) {
      await deleteJob(id);
      cleanedCount++;
    }
  }

  // Also clean up any orphan directories in TEMP_BASE_DIR
  try {
    const entries = await fs.promises.readdir(TEMP_BASE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(TEMP_BASE_DIR, entry.name);
        try {
          const stats = await fs.promises.stat(dirPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
            cleanedCount++;
          }
        } catch {
          // ignore stat errors
        }
      }
    }
  } catch (err) {
    console.error('Error during orphan cleanup:', err);
  }

  return cleanedCount;
}

// Periodic cleanup every 10 minutes
setInterval(() => {
  cleanupExpiredJobs().catch(console.error);
}, 10 * 60 * 1000);
