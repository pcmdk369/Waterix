# WATERIX — Architecture

## System overview

```text
Browser (React 19 + Vite)
  | same-origin HTTP / JSON / multipart
  v
Express application (server.ts)
  |-- Multer temporary upload
  |-- Job registry (in-memory Map)
  |-- Sharp image metadata/compositing
  |-- Image restoration module (Gemini-assisted path + local processing)
  |-- FFmpeg / FFprobe video processing
  |-- Temporary media preview/download
  v
OS temporary filesystem
```

## Repository structure

- `src/App.tsx` — client workflow orchestration and API calls.
- `src/components/` — upload, image/video editing, watermark editor, progress/result, legal pages.
- `src/types.ts` — client-side job and editor contracts.
- `server.ts` — Express API, upload handling, processing orchestration and Vite/static serving.
- `server/jobStore.ts` — in-memory job registry and temporary directory cleanup.
- `server/watermarkProcessor.ts` — text/logo image and video watermark composition.
- `server/videoProcessor.ts` — FFprobe metadata and FFmpeg video operations.
- `server/inpainting.ts` — image restoration/inpainting.
- `package.json` — scripts and runtime/development dependencies.

## Runtime lifecycle

1. Browser sends `POST /api/upload` with multipart field `file`.
2. Server writes the upload to a temporary directory, creates a job folder, probes media and stores metadata in the process-local registry.
3. Browser calls a watermark or restoration endpoint with the job ID and options.
4. Server starts processing asynchronously in the same Node.js process and updates the job registry.
5. Browser polls `GET /api/job/:job_id`.
6. Completed output is streamed from temporary storage and downloaded.
7. User may delete the job; a periodic cleanup also removes expired jobs and orphan directories.

## External/runtime dependencies

- FFmpeg and FFprobe executables must be installed on the host for video operations.
- Sharp native binaries must be compatible with the deployment OS/architecture.
- Gemini API key is required only for code paths that invoke the Gemini service.
- A persistent writable temporary directory is required while jobs are active.

## Configuration

See `.env.example`. Current variables:
- `GEMINI_API_KEY` — Gemini credential for AI-backed operations.
- `APP_URL` — configured application URL (used by integrations where applicable).
- `PORT` — server port; current source defaults to 3000.

## Deployment constraints and security gaps

The current design is suitable for local development and controlled evaluation, not unrestricted multi-tenant public production:

- Job state is a process-local Map; restart or horizontal scaling loses job lookup.
- Job routes do not implement authentication or per-user ownership checks. Random IDs are not a substitute for authorization.
- Upload validation currently relies on filename/MIME hints and permits generic/empty MIME types. Validate file signatures and decoded media before processing.
- Express JSON/urlencoded limits are 50 MB while Multer file limit is 35 MB; keep edge/proxy limits consistent.
- CPU-intensive processing runs inside the API process without a durable queue or hard worker isolation.
- No explicit API rate limiting or global concurrency control is configured.
- Range request parsing should validate bounds and malformed headers before opening a stream.
- Temporary cleanup is process-local and must be coordinated when multiple replicas are used.

## Production target architecture

For a public service, evolve to:

- Reverse proxy/WAF with TLS, request-size limits and rate limits.
- Authenticated API with per-user authorization and short-lived signed job access.
- Object storage with private buckets and short retention lifecycle.
- Database-backed job records and idempotency keys.
- Queue-backed worker service isolated from the API; run FFmpeg and image decoders with CPU/memory/time limits and a restricted filesystem.
- Structured logs, metrics, tracing, alerting and graceful shutdown.
- Malware/content scanning and strict format/dimension/duration limits.
- CI security scanning plus unit, integration and E2E tests.

Do not run uploaded or generated files as executables. Treat all media and metadata as untrusted input.
