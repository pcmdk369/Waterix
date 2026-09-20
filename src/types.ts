export type StudioMode = 'remove' | 'add';

export type MediaType = 'image' | 'video';

export type JobStage =
  | 'Uploading'
  | 'Preparing'
  | 'Detecting selected area'
  | 'AI Restoration'
  | 'Rebuilding Media'
  | 'Finalizing';

export type JobStatus = 'idle' | 'uploading' | 'ready' | 'processing' | 'completed' | 'failed';

export interface ActiveJob {
  jobId: string;
  mediaType: MediaType;
  filename: string;
  originalUrl: string;
  processedUrl?: string | null;
  downloadUrl?: string | null;
  width?: number;
  height?: number;
  duration?: number;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  error?: string | null;
  mode?: StudioMode;
}

export type EditorTool = 'brush' | 'eraser' | 'rectangle' | 'polygon';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PageView = 'home' | 'app' | 'privacy' | 'terms';

export type WatermarkType = 'text' | 'image';

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export interface TextWatermarkConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  opacity: number;
  rotation: number;
  letterSpacing: number;
  shadow: boolean;
  outline: boolean;
  outlineColor: string;
  position: WatermarkPosition;
  customX: number;
  customY: number;
  margin: number;
  repeat: boolean;
  background: boolean;
  backgroundColor: string;
  // Video-specific
  startTime: number;
  endTime: number;
  movement: 'none' | 'left-to-right' | 'top-to-bottom' | 'bounce';
}

export interface ImageWatermarkConfig {
  logoDataUrl: string;
  scale: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  customX: number;
  customY: number;
  margin: number;
  repeat: boolean;
  // Video-specific
  startTime: number;
  endTime: number;
  movement: 'none' | 'left-to-right' | 'top-to-bottom' | 'bounce';
}
