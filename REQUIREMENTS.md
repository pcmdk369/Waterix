# WATERIX — Requirements

## Product objective

Provide a browser-based media studio that lets a user add branded watermarks to image/video files and restore selected regions in media they own or are authorized to modify.

## Users and jobs to be done

1. **Creators and publishers** — consistently brand image and video exports.
2. **Small businesses** — place a logo, text, or campaign mark on product and promotional media.
3. **Media editors** — remove accidental overlays or restore damaged regions in authorized source material.
4. **Developers/operators** — deploy and operate a bounded media-processing service.

## Functional requirements

### Media intake
- Accept supported image and video uploads through a multipart form.
- Return a unique job identifier and media metadata.
- Reject missing files, oversized payloads, and unsupported content with structured errors.
- Keep original uploads separate from generated output.

### Watermark creation
- Add configurable text to images and videos.
- Add a user-supplied logo to images and videos.
- Support placement presets and custom coordinates.
- Support opacity, rotation, sizing and repeated/tiled application where implemented.
- Support video start/end timing and movement options where implemented.
- Produce a downloadable output without overwriting the original.

### Restoration
- Allow a user to select an image region using the editor tools and submit a mask for restoration.
- Allow a user to select a video region and submit a bounding box for FFmpeg delogo processing.
- Report queued/processing/completed/failed status and progress.
- Preserve the original media and make the processed output available after completion.

### Job lifecycle
- Provide status polling.
- Provide original/processed media preview and output download.
- Allow explicit job deletion.
- Expire temporary jobs and clean up stale directories.

### User experience
- Responsive upload, editor, processing and result screens.
- Clear errors and processing state.
- Inform users that results depend on input quality and restoration algorithms.
- Provide privacy and terms information.

## Non-functional requirements

- **Security:** never trust filename, extension, MIME type, client-supplied job IDs, masks, coordinates, or watermark options. Validate and bound all inputs server-side.
- **Privacy:** process only the media required for the requested job; minimize retention and disclose temporary storage behavior.
- **Reliability:** isolate media jobs, bound CPU/memory/concurrency, clean temporary files on failure, and expose health status.
- **Performance:** avoid loading unbounded files into memory; use streaming where practical; configure worker timeouts and resource quotas.
- **Accessibility:** keyboard-accessible controls, visible focus, labels, and adequate contrast.
- **Maintainability:** typed API contracts, repeatable builds, automated tests, and documented configuration.
- **Compatibility:** support current evergreen desktop and mobile browsers; verify actual device and codec coverage before claiming universal support.

## Current implementation status

| Area | Status |
|---|---|
| React/Vite UI and Express API | Implemented |
| Image and video upload | Implemented; server limit is 35 MB |
| Text/logo watermarking | Implemented in processing modules |
| Image restoration | Implemented; Gemini integration/configuration must be verified per deployment |
| Video region cleanup | Implemented using FFmpeg delogo (not generative AI) |
| Job status and temporary download | Implemented with in-memory state |
| Authentication and per-user authorization | Not implemented |
| Durable database/object storage | Not implemented |
| Distributed worker queue | Not implemented |
| Rate limiting/abuse prevention | Not implemented |
| Automated unit/integration/E2E suite | Not present in the audited baseline |
| Production deployment verification | Not performed by this repository audit |

## Acceptance criteria

- [ ] Valid supported media upload returns a job ID and dimensions/duration.
- [ ] Invalid, malformed and oversized uploads fail safely.
- [ ] Text and logo watermarks can be applied to image and video inputs.
- [ ] Image mask and video bounding-box restoration return a completed output or an actionable error.
- [ ] Job polling transitions correctly and output download is only available after completion.
- [ ] Deleting/expiring a job removes its temporary files.
- [ ] API input validation, authorization, rate limiting and resource limits are verified before public launch.
- [ ] CI runs type checks and production build on every pull request.
