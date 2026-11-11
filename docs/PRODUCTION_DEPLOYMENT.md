# Production Deployment

This guide describes the supported container deployment path for Waterix. It does not imply that every production-readiness requirement is already implemented.

## Container image

The root `Dockerfile` uses a multi-stage build:

- Bun installs the exact dependency graph from `bun.lock`.
- TypeScript validation and the Vite/server production build run in the build stage.
- The runtime image includes FFmpeg/FFprobe for video processing.
- The application runs as the unprivileged `bun` user.
- A container health check calls `/api/health`.

Build and run locally:

```bash
docker build -t waterix:local .
docker run --rm -p 3000:3000 -e PORT=3000 waterix:local
```

Open `http://localhost:3000`. Verify `GET /api/health` before testing uploads.

## Required configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Container listen port; current application listener is 3000 |
| `GEMINI_API_KEY` | For Gemini-backed restoration | Server-side AI provider credential |
| `APP_URL` | Deployment-specific | Public application URL where used by the app |

Never commit real secrets. Configure them through the deployment platform's secret manager.

## Deployment checks

Before exposing a deployment to users:

1. Build the image from the reviewed commit.
2. Confirm the health check remains healthy after startup.
3. Confirm FFmpeg and FFprobe are available in the runtime image.
4. Test image upload, image watermarking, video upload, video watermarking, job polling, preview, download, and deletion.
5. Test malformed files, oversized files, interrupted uploads, invalid job IDs, and concurrent processing.
6. Confirm logs do not contain uploaded media, API keys, or other sensitive payloads.
7. Configure platform-level TLS, request limits, monitoring, backups where applicable, and alerting.

## Current production limitations

The current application is a single-process prototype architecture. A successful container build is not proof of horizontally scalable or fully production-ready operation.

- Job metadata is stored in process memory. Restarting the process loses job status.
- Uploaded and processed media are stored on local temporary disk. Ephemeral container filesystems can be cleared during restart or redeploy.
- There is no durable queue or distributed worker coordination.
- There is no user authentication or per-user job authorization. Treat the current API as unsuitable for private multi-user workloads on a public internet endpoint.
- There is no distributed rate limiter, tenant quota, or global processing concurrency control.
- Local cleanup timers do not replace durable retention and deletion policies.

## Required architecture work before public multi-user launch

1. Add authentication and enforce ownership on every job, media, download, and delete route.
2. Move job metadata to a durable database and media to private object storage with expiring signed access.
3. Move CPU/FFmpeg/AI work to a durable queue and separately deployed workers.
4. Add distributed rate limits, per-user quotas, upload validation, and bounded worker concurrency.
5. Add automated API/integration tests, dependency and container vulnerability scanning, and operational alerts.
6. Define retention, deletion, privacy, abuse reporting, and incident response policies.

Do not enable public multi-user traffic until these controls are implemented and verified.
