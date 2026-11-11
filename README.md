<!--
  WATERIX™
  Repository: pcmdk369/Waterix
  Purpose: Professional project documentation and developer onboarding.
-->

<div align="center">

# WATERIX™

### Image & Video Watermark Studio

**Create branded media. Refine authorized content. Keep your original files intact.**

[![CI](https://github.com/pcmdk369/Waterix/actions/workflows/ci.yml/badge.svg)](https://github.com/pcmdk369/Waterix/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey.svg)](#license)

[Overview](#overview) · [Capabilities](#capabilities) · [Quick start](#quick-start) · [Architecture](#architecture) · [API](#api-reference) · [Security](#security--responsible-use)

</div>

---

## Overview

**WATERIX™** is a browser-based media workspace for applying text and logo watermarks to images and videos, plus restoring selected regions in media the user owns or is authorized to edit.

The project combines a React and TypeScript interface with an Express API and native media-processing tools. It is designed around a simple principle: source media remains separate from generated output, and users can preview the result before downloading it.

> **Product boundary:** WATERIX is intended for legitimate media branding and restoration. Do not use restoration features to remove ownership, attribution, licensing, or rights-management marks from content without authorization.

## At a glance

| Area | Current implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4 |
| API server | Node.js, Express 4 |
| Upload handling | Multer 2 |
| Image processing | Sharp |
| Video processing | FFmpeg and FFprobe |
| AI integration | Google GenAI SDK for configured AI-assisted paths |
| Job state | Process-local in-memory registry |
| File storage | Temporary local filesystem |
| Package manager | Bun lockfile; npm-compatible package manifest |

## Capabilities

### Add watermarks

| Capability | Image | Video |
|---|:---:|:---:|
| Text watermark | Yes | Yes |
| Logo/image watermark | Yes | Yes |
| Position presets and custom placement | Yes | Yes |
| Opacity and rotation | Yes | Yes |
| Repeated/tiled watermark options | Yes | Supported by processing options |
| Timing and movement options | N/A | Supported by processing options |

### Restore selected regions

- **Image restoration:** select a region using the editor's brush and shape tools, then submit the generated mask for server-side restoration.
- **Video region cleanup:** select a rectangular region and process a copy using FFmpeg's `delogo` filter.
- **Preview and export:** inspect the processed media and download the generated output.
- **Job status:** poll processing state and progress while work is running.

Restoration quality depends on the source media, selected region, and processing method. Video `delogo` is a spatial filtering technique; it is not generative, frame-aware AI inpainting.

### Workflow

1. Select a workflow: add a watermark or restore an authorized region.
2. Upload a supported image or video.
3. Configure the watermark or select the target region.
4. Submit the processing request.
5. Monitor job status.
6. Preview and download the generated file.

## Quick start

### Prerequisites

| Dependency | Requirement | Used for |
|---|---|---|
| Node.js | 22+ recommended | API server and build tooling |
| Bun | Current stable | Reproducible dependency installation |
| FFmpeg | Installed and available on `PATH` | Video processing |
| FFprobe | Installed and available on `PATH` | Video metadata |
| Gemini API key | Only for Gemini-backed features | AI-assisted processing paths |

Sharp uses native platform binaries. Install dependencies on the same operating system and architecture used to run the application.

### 1. Clone the repository

```bash
git clone https://github.com/pcmdk369/Waterix.git
cd Waterix
```

### 2. Verify system tools

```bash
node --version
bun --version
ffmpeg -version
ffprobe -version
```

If you do not use video features, FFmpeg is not needed for image-only development. The video endpoints will require it.

### 3. Install dependencies

Use Bun to respect the repository lockfile:

```bash
bun install --frozen-lockfile
```

### 4. Configure environment

```bash
cp .env.example .env
```

Update the values required by your environment:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

- `GEMINI_API_KEY` is required only for code paths that call Gemini.
- `APP_URL` should be the externally reachable application URL in hosted environments.
- The Express server currently defaults to port `3000`.

Never commit `.env`, API keys, access tokens, or other secrets. Use the hosting provider's secret manager for deployed environments.

### 5. Start the development server

```bash
bun run dev
```

Open **http://localhost:3000**.

The development script starts the Express server through `tsx`; Vite is integrated into the server configuration.

### 6. Create and run a production build

```bash
bun run lint
bun run build
NODE_ENV=production bun run start
```

The build creates the frontend bundle and the bundled Express entry point under `dist/`.

### Available scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the development server |
| `bun run lint` | Run TypeScript validation with `tsc --noEmit` |
| `bun run build` | Build frontend assets and bundle the server |
| `bun run start` | Start the production server bundle |
| `bun run clean` | Remove generated build output |

## Architecture

WATERIX currently uses a single Node.js application process. The browser communicates with the Express API over same-origin HTTP. Media files are written to temporary local storage and job metadata is held in memory.

```text
┌──────────────────────────────────────────────┐
│                 Browser Client               │
│          React 19 · TypeScript · Vite        │
│                                              │
│  Upload UI · Watermark Editor · Region Tools │
│  Processing Status · Preview · Download      │
└──────────────────────┬───────────────────────┘
                       │ HTTP / JSON / multipart
                       ▼
┌──────────────────────────────────────────────┐
│                Express API                    │
│                                              │
│  Upload Routes · Validation · Job Lifecycle  │
│  Watermark Routes · Restoration Routes       │
└──────────────┬───────────────────┬───────────┘
               │                   │
               ▼                   ▼
┌────────────────────────┐  ┌───────────────────┐
│   Media Processors     │  │    Job Registry   │
│                        │  │                   │
│ Sharp · FFmpeg         │  │ In-memory state   │
│ FFprobe · Gemini SDK   │  │ Progress / status │
└────────────┬───────────┘  └───────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│           Temporary Local Storage            │
│         Original Uploads · Processed Output  │
└──────────────────────────────────────────────┘
```

### Source layout

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── server/
│   ├── inpainting.ts
│   ├── jobStore.ts
│   ├── videoProcessor.ts
│   └── watermarkProcessor.ts
├── src/
│   ├── components/
│   │   ├── AddWatermarkEditor.tsx
│   │   ├── Header.tsx
│   │   ├── ImageEditor.tsx
│   │   ├── PrivacyPage.tsx
│   │   ├── ProcessingView.tsx
│   │   ├── ResultView.tsx
│   │   ├── TermsPage.tsx
│   │   ├── UploadZone.tsx
│   │   └── VideoEditor.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── API.md
├── ARCHITECTURE.md
├── PRODUCT_SPEC.md
├── README.md
├── REQUIREMENTS.md
├── package.json
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

### Processing lifecycle

1. The client uploads media to `POST /api/upload`.
2. The server creates a job workspace and probes media metadata.
3. The client submits a watermark or restoration request using the job identifier.
4. The server starts processing and updates the job state.
5. The client polls `GET /api/job/:job_id`.
6. When complete, the client previews or downloads the generated output.
7. The user can delete the job and its temporary files.

For deeper implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## API reference

The API is served from the same origin as the frontend. The current implementation does not provide user authentication or per-user job authorization.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service health |
| `POST` | `/api/upload` | Upload image or video |
| `POST` | `/api/watermark/text` | Apply a text watermark |
| `POST` | `/api/watermark/image` | Apply an image/logo watermark |
| `POST` | `/api/watermark/logo` | Logo watermark alias |
| `POST` | `/api/watermark/video` | Apply video watermark |
| `POST` | `/api/image/remove` | Restore a selected image region |
| `POST` | `/api/remove/image` | Image restoration alias |
| `POST` | `/api/video/remove` | Process a selected video region |
| `POST` | `/api/remove/video` | Video restoration alias |
| `GET` | `/api/job/:job_id` | Read job status |
| `GET` | `/api/media/:job_id/:type` | Stream original or processed media |
| `GET` | `/api/download/:job_id` | Download processed output |
| `DELETE` | `/api/job/:job_id` | Delete a job and temporary files |

See **[API.md](./API.md)** for request payloads, response behavior, and error handling.

## Configuration reference

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Conditional | Credential for Gemini-backed operations |
| `APP_URL` | Environment-dependent | Public application URL for hosted deployments |

The application currently defaults to port `3000` in the server code. A configurable `PORT` variable is not currently documented as a supported setting in the repository's environment template.

## Security & responsible use

Media uploads are untrusted input. The current codebase is an early-stage, single-process application and should be deployed only in a controlled environment until the following controls are implemented and verified.

### Current operational limitations

- **No authentication or per-job authorization:** API routes do not establish user identity or verify job ownership.
- **Temporary local storage:** uploads and outputs are stored on the host filesystem; job metadata is held in process memory.
- **No durable queue:** CPU-intensive media processing runs within the application process.
- **Limited upload validation:** MIME types and filename extensions are not a sufficient content-validation boundary.
- **No complete abuse controls:** rate limits, global concurrency quotas, and per-user storage quotas are not yet implemented.
- **No automated end-to-end suite:** browser-level workflow verification remains outstanding.

### Before public multi-user deployment

- Add authentication and authorization for every job and media route.
- Validate actual file signatures and decoded media; allow only explicitly supported formats.
- Enforce limits for file size, dimensions, duration, frame rate, codec, and processing time.
- Add request rate limits, job quotas, concurrency controls, and cancellation.
- Run FFmpeg and image decoding in isolated workers with restricted filesystem access and CPU/memory/time limits.
- Use private object storage and durable job metadata with lifecycle cleanup.
- Validate HTTP range requests and prevent path traversal or identifier abuse.
- Configure HTTPS, secure headers, CORS/origin policy, structured logging, monitoring, and alerting.
- Add unit, API integration, and browser E2E tests before release.

Never process media that you do not have the right to modify. Do not use the application to bypass copyright, licensing, attribution, or ownership protections.

## Quality checks

The repository CI workflow is configured to:

1. Check out the source.
2. Install Bun and Node.js.
3. Install FFmpeg for video-tool availability.
4. Install dependencies from the Bun lockfile.
5. Run TypeScript validation.
6. Create a production build.

Run the same core checks locally:

```bash
bun run lint
bun run build
```

A passing typecheck/build does not by itself prove that all media workflows, AI integrations, deployment environments, or security controls are production-ready. Review the CI run and perform real media workflow tests before release.

## Project documentation

| Document | Description |
|---|---|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Functional and non-functional requirements |
| [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) | Product positioning, user journeys, and roadmap |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, runtime lifecycle, and deployment constraints |
| [API.md](./API.md) | API routes and payload reference |

## Development guidelines

- Preserve existing user-facing workflows when changing processing logic.
- Keep API validation and processing behavior on the server; never trust client-supplied metadata.
- Keep source files immutable and write generated output to a separate path.
- Avoid logging uploaded content, credentials, or sensitive request payloads.
- Add regression tests for every bug fix and new processing path.
- Update the API and architecture documentation when contracts or runtime behavior change.
- Keep dependencies and CI actions reviewed and updated.

## Roadmap

### P0 — Production safety
- Authentication and job-level authorization.
- Strict upload and processing validation.
- Rate limits, quotas, and bounded concurrency.
- Isolated processing workers and hard timeouts.
- Automated unit, integration, and E2E coverage.

### P1 — Reliability
- Durable job database and private object storage.
- Retry-safe queue processing and cancellation.
- Structured observability and operational dashboards.
- Improved progress reporting and batch workflows.

### P2 — Professional workspace
- User accounts and private project history.
- Reusable brand kits and watermark presets.
- Team collaboration and role-based access.
- Usage metering and billing after operational controls are established.

## Contributing

Contributions should be made through focused branches and pull requests.

1. Create a branch from the current base branch.
2. Make a scoped change with tests where applicable.
3. Run `bun run lint` and `bun run build`.
4. Update relevant documentation.
5. Open a pull request with a summary, validation evidence, and known limitations.

Do not include secrets, private media, generated build artifacts, or unrelated refactors in a contribution.

## License

No open-source license file is currently present in this repository. Unless the owner adds a license, the source is **All Rights Reserved** and no additional redistribution or modification rights are granted.

---

<div align="center">

**WATERIX™**  
*Media branding and restoration workspace.*

Built by **PCMDK369™**

</div>
