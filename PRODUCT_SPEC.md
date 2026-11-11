# WATERIX — Product Specification

## Positioning

WATERIX is a practical image/video watermark studio combining two workflows in one interface:

1. **Protect media:** add a text or logo watermark with positioning and visual controls.
2. **Restore authorized media:** select an unwanted overlay or damaged region and process a cleaned copy.

It is not a rights-management bypass tool. The interface and product policy should explicitly restrict removal to content the user owns or has permission to edit.

## Core workflows

### A. Add a text watermark
1. Choose Add Watermark mode.
2. Upload an image or video.
3. Enter watermark text and select typography, color, opacity, rotation and placement.
4. For video, configure timing and supported movement/repeat options.
5. Apply and monitor processing.
6. Preview and download the output.

### B. Add a logo watermark
1. Upload source media.
2. Choose a logo image or use the built-in sample.
3. Configure scale, opacity, rotation and placement.
4. Configure video timing/repeat behavior if applicable.
5. Apply, preview and download.

### C. Restore an image region
1. Choose Remove Watermark mode and upload an authorized image.
2. Paint, erase, draw a rectangle or define a polygon over the region.
3. Submit the generated mask to the image restoration endpoint.
4. Poll job progress and review the output.
5. Download the restored copy.

### D. Restore a video region
1. Upload an authorized video.
2. Play/scrub to inspect the target region.
3. Position and resize the selection box.
4. Submit the bounding box.
5. Wait for FFmpeg processing, preview and download.

## UX principles

- Make Add and Restore modes distinct; never imply that restoration is always generative AI.
- Keep the source preview visible while editing.
- Make progress, failures and output actions explicit.
- Use safe defaults and constrain all numeric controls.
- Explain temporary retention and deletion behavior before upload.
- Work on a copy; never modify the original upload.

## Product boundaries in the current repository

- No user account or cloud library.
- No persistent project history.
- No collaborative workspace.
- No billing/subscription system.
- No guarantee of invisible or artifact-free restoration.
- Video removal currently uses FFmpeg's spatial delogo filter, not frame-aware AI inpainting.
- Job state is process-local and temporary.

## Roadmap

### P0 — Before public production
- Add authentication or signed, unguessable per-job access tokens.
- Add server-side validation for file signatures, media dimensions, duration, codec and processing options.
- Add request/job rate limits, concurrency limits and storage quotas.
- Validate range requests and prevent path/identifier abuse.
- Move processing to isolated workers with hard timeouts and memory/CPU limits.
- Add structured logs, metrics, graceful shutdown and deterministic cleanup.
- Add automated unit, API integration and browser E2E tests.

### P1 — Reliability and usability
- Persistent job metadata and object storage with lifecycle policies.
- Retry-safe job execution and cancellation.
- Better progress reporting and accessible editor controls.
- Batch processing and downloadable bundles.
- Presets/brand kits for repeatable business workflows.

### P2 — Commercial features
- User accounts and private project history.
- Usage metering and subscription/billing integration.
- Team workspaces and brand asset libraries.
- Auditable consent/rights confirmation for restoration workflows.
