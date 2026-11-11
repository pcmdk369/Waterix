# WATERIX™

**A media watermark studio for images and video.** Add text or logo watermarks, remove selected image regions, and process video overlays through a browser-based workflow.

WATERIX is a TypeScript application built with React, Vite, Express, Sharp, and FFmpeg. It is designed for media you own or are authorized to edit. Watermark removal must not be used to remove ownership, attribution, licensing, or rights-management marks from third-party content.

## Product capabilities

| Capability | Current implementation |
|---|---|
| Upload image/video | Express + Multer temporary upload flow (35 MB server-side limit) |
| Add text watermark | Image and video; typography, opacity, rotation, placement, repeat/timing options |
| Add logo watermark | Image and video; scale, opacity, rotation, placement and repeat/timing options |
| Remove image overlay | Brush/shape selection and server-side inpainting/restoration |
| Remove video overlay | Select a region and process with FFmpeg's `delogo` filter |
| Processing status | In-memory job state with progress polling |
| Preview/download | Temporary media preview and processed-file download |
| Privacy/terms pages | Client-side informational pages |

**Important:** The repository currently implements a single-process, temporary-job workflow. It does not currently provide user accounts, persistent job storage, multi-worker queueing, billing, or production-grade abuse controls. Do not expose an unrestricted public instance until the deployment hardening items in [Architecture](./ARCHITECTURE.md) are addressed.

## Technology

- React 19, TypeScript, Vite 8, Tailwind CSS 4
- Express 4 and Multer 2
- Sharp for image metadata and compositing
- FFmpeg + FFprobe for video metadata and processing
- Google GenAI SDK for configured AI-assisted processing paths

## Requirements

- Node.js 22 or newer (recommended)
- Bun (the repository includes `bun.lock`) or npm
- FFmpeg and FFprobe available on `PATH` for video workflows
- A Gemini API key for AI-backed features that call Gemini
- A host with writable temporary storage and sufficient CPU/RAM for media processing

## Local setup

### 1. Install system dependencies

Install FFmpeg and FFprobe using your operating system's package manager, then verify:

```bash
ffmpeg -version
ffprobe -version
```

### 2. Install JavaScript dependencies

Using Bun:

```bash
bun install --frozen-lockfile
```

Or using npm:

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` if using Gemini-backed functionality. Set `PORT` to select the HTTP port; the server defaults to `3000`. Never commit a real secret.

### 4. Run in development

```bash
bun run dev
# or
npm run dev
```

Open http://localhost:3000.

### 5. Build and run production bundle

```bash
bun run build
NODE_ENV=production bun run start
```

The build emits the Vite frontend and a bundled Express server under `dist/`.

## Scripts

| Script | Purpose |
|---|---|
| `dev` | Start Express with Vite middleware |
| `build` | Build the frontend and bundle the server |
| `start` | Start the production server bundle |
| `lint` | Run TypeScript compiler checks (`tsc --noEmit`) |
| `clean` | Remove generated build output |

## API overview

All endpoints are served from the same origin. See [API.md](./API.md) for request and response details.

- `GET /api/health`
- `POST /api/upload`
- `POST /api/watermark/text`
- `POST /api/watermark/image` (also `/api/watermark/logo`)
- `POST /api/watermark/video`
- `POST /api/image/remove` (also `/api/remove/image`)
- `POST /api/video/remove` (also `/api/remove/video`)
- `GET /api/job/:job_id`
- `GET /api/media/:job_id/:type`
- `GET /api/download/:job_id`
- `DELETE /api/job/:job_id`

## Operational notes

- Uploaded media and results are stored under the operating system's temporary directory, not durable object storage.
- Job metadata is held in process memory. Restarting the server loses job state.
- The current upload middleware accepts broad MIME/extension combinations. A production deployment must add content-signature validation, strict allow-lists, request rate limits, authentication/authorization, and resource quotas.
- Processing runs in the application process. For public production traffic, move FFmpeg and AI processing into isolated workers with bounded concurrency and timeouts.
- Configure reverse-proxy request body limits consistently with the application's 35 MB Multer limit.
- Use HTTPS and a restrictive origin/security-header policy at the deployment edge.

## Documentation

- [Requirements](./REQUIREMENTS.md)
- [Product specification](./PRODUCT_SPEC.md)
- [Architecture](./ARCHITECTURE.md)
- [API reference](./API.md)

## License

No license file is currently present. All rights are reserved by the repository owner unless a license is added.
