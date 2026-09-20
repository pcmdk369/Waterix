import React, { useState, useRef, useEffect } from 'react';
import {
  Type,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Move,
  Clock,
  RotateCw,
  Eye,
  Grid,
  Palette,
  Check,
  ArrowRight,
  Upload,
} from 'lucide-react';
import {
  ActiveJob,
  WatermarkType,
  WatermarkPosition,
  TextWatermarkConfig,
  ImageWatermarkConfig,
} from '../types';

interface AddWatermarkEditorProps {
  job: ActiveJob;
  onApplyTextWatermark: (config: TextWatermarkConfig) => void;
  onApplyImageWatermark: (config: ImageWatermarkConfig) => void;
  onCancel: () => void;
}

const POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'center-left', label: 'Center Left' },
  { id: 'center', label: 'Center' },
  { id: 'center-right', label: 'Center Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'custom', label: 'Custom XY' },
];

const FONTS = [
  'Inter, sans-serif',
  'Impact, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Trebuchet MS, sans-serif',
  'Verdana, sans-serif',
];

export const AddWatermarkEditor: React.FC<AddWatermarkEditorProps> = ({
  job,
  onApplyTextWatermark,
  onApplyImageWatermark,
  onCancel,
}) => {
  const [wmType, setWmType] = useState<WatermarkType>('text');

  // Text Config State
  const [text, setText] = useState<string>('WATERIX PROTECTED');
  const [fontFamily, setFontFamily] = useState<string>('Inter, sans-serif');
  const [fontSize, setFontSize] = useState<number>(36);
  const [isBold, setIsBold] = useState<boolean>(true);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [color, setColor] = useState<string>('#ffffff');
  const [opacity, setOpacity] = useState<number>(0.85);
  const [rotation, setRotation] = useState<number>(0);
  const [letterSpacing, setLetterSpacing] = useState<number>(1);
  const [shadow, setShadow] = useState<boolean>(true);
  const [outline, setOutline] = useState<boolean>(true);
  const [outlineColor, setOutlineColor] = useState<string>('#000000');
  const [position, setPosition] = useState<WatermarkPosition>('bottom-right');
  const [customX, setCustomX] = useState<number>(50);
  const [customY, setCustomY] = useState<number>(50);
  const [margin, setMargin] = useState<number>(24);
  const [repeat, setRepeat] = useState<boolean>(false);
  const [background, setBackground] = useState<boolean>(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');

  // Video timing and movement
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(job.duration || 10);
  const [movement, setMovement] = useState<'none' | 'left-to-right' | 'top-to-bottom' | 'bounce'>('none');

  // Logo / Image Config State
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState<number>(22);
  const [logoOpacity, setLogoOpacity] = useState<number>(0.85);
  const [logoRotation, setLogoRotation] = useState<number>(0);
  const [logoPosition, setLogoPosition] = useState<WatermarkPosition>('bottom-right');
  const [logoCustomX, setLogoCustomX] = useState<number>(50);
  const [logoCustomY, setLogoCustomY] = useState<number>(50);
  const [logoMargin, setLogoMargin] = useState<number>(24);
  const [logoRepeat, setLogoRepeat] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a sample default logo on first mount if none uploaded
  useEffect(() => {
    if (!logoDataUrl) {
      // Create a clean branded SVG badge as default logo dataUrl
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100">
        <rect width="300" height="100" rx="16" fill="#0284c7"/>
        <text x="50" y="60" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="36">WATERIX</text>
        <circle cx="260" cy="50" r="18" fill="#38bdf8"/>
      </svg>`;
      setLogoDataUrl(`data:image/svg+xml;base64,${btoa(svg)}`);
    }
  }, [logoDataUrl]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setLogoDataUrl(loadEvt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    if (wmType === 'text') {
      onApplyTextWatermark({
        text: text.trim() || 'WATERIX',
        fontFamily,
        fontSize,
        isBold,
        isItalic,
        color,
        opacity,
        rotation,
        letterSpacing,
        shadow,
        outline,
        outlineColor,
        position,
        customX,
        customY,
        margin,
        repeat,
        background,
        backgroundColor,
        startTime,
        endTime,
        movement,
      });
    } else {
      if (!logoDataUrl) return;
      onApplyImageWatermark({
        logoDataUrl,
        scale: logoScale,
        opacity: logoOpacity,
        rotation: logoRotation,
        position: logoPosition,
        customX: logoCustomX,
        customY: logoCustomY,
        margin: logoMargin,
        repeat: logoRepeat,
        startTime,
        endTime,
        movement,
      });
    }
  };

  // Helper for live preview positioning
  const getPreviewPositionStyle = (pos: WatermarkPosition, cX: number, cY: number, m: number) => {
    if (pos === 'custom') {
      return {
        left: `${cX}%`,
        top: `${cY}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    const style: React.CSSProperties = {};
    if (pos.includes('left')) style.left = `${m}px`;
    else if (pos.includes('right')) style.right = `${m}px`;
    else {
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    }

    if (pos.startsWith('top')) style.top = `${m}px`;
    else if (pos.startsWith('bottom')) style.bottom = `${m}px`;
    else {
      style.top = '50%';
      style.transform = style.transform ? 'translate(-50%, -50%)' : 'translateY(-50%)';
    }

    return style;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 flex flex-col lg:flex-row gap-6">
      {/* Left: Interactive Live Preview Stage */}
      <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl relative min-h-[480px]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Live Interactive Preview
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {job.mediaType === 'video' ? 'Video Overlay' : 'Image Overlay'}
          </span>
        </div>

        {/* Media Frame with Interactive Watermark Overlay */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 p-2 min-h-[380px]">
          {job.mediaType === 'image' ? (
            <img
              src={job.originalUrl}
              alt="Preview target"
              className="max-h-[60vh] max-w-full object-contain rounded-xl select-none"
            />
          ) : (
            <video
              src={job.originalUrl}
              controls
              playsInline
              className="max-h-[60vh] max-w-full rounded-xl"
            />
          )}

          {/* Watermark Rendering Overlay on Preview */}
          {wmType === 'text' ? (
            repeat ? (
              <div
                className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none p-4 select-none overflow-hidden"
                style={{ opacity }}
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      fontFamily,
                      fontSize: `${Math.max(14, fontSize * 0.55)}px`,
                      fontWeight: isBold ? 'bold' : 'normal',
                      fontStyle: isItalic ? 'italic' : 'normal',
                      color,
                      letterSpacing: `${letterSpacing}px`,
                      textShadow: shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                      WebkitTextStroke: outline ? `1px ${outlineColor}` : 'none',
                    }}
                  >
                    {text || 'WATERIX'}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="absolute pointer-events-none select-none transition-all duration-75"
                style={{
                  ...getPreviewPositionStyle(position, customX, customY, margin),
                  transform: `${getPreviewPositionStyle(position, customX, customY, margin).transform || ''} rotate(${rotation}deg)`,
                  opacity,
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  color,
                  letterSpacing: `${letterSpacing}px`,
                  textShadow: shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                  WebkitTextStroke: outline ? `1.5px ${outlineColor}` : 'none',
                  backgroundColor: background ? backgroundColor : 'transparent',
                  padding: background ? '6px 14px' : '0',
                  borderRadius: background ? '8px' : '0',
                }}
              >
                {text || 'WATERIX'}
              </div>
            )
          ) : (
            /* Logo / Image Watermark Overlay */
            logoDataUrl && (
              logoRepeat ? (
                <div
                  className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none p-4 select-none overflow-hidden"
                  style={{ opacity: logoOpacity }}
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                      <img
                        src={logoDataUrl}
                        alt="logo watermark"
                        style={{
                          width: `${logoScale * 3.5}px`,
                          transform: `rotate(${logoRotation}deg)`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="absolute pointer-events-none select-none transition-all duration-75"
                  style={{
                    ...getPreviewPositionStyle(logoPosition, logoCustomX, logoCustomY, logoMargin),
                    transform: `${getPreviewPositionStyle(logoPosition, logoCustomX, logoCustomY, logoMargin).transform || ''} rotate(${logoRotation}deg)`,
                    opacity: logoOpacity,
                  }}
                >
                  <img
                    src={logoDataUrl}
                    alt="Logo Watermark"
                    style={{ width: `${logoScale * 5}px` }}
                  />
                </div>
              )
            )
          )}
        </div>

        {/* Bottom preview info */}
        <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <span>Target: {job.filename}</span>
          <span>
            {job.width && job.height ? `${job.width} × ${job.height}px` : ''}{' '}
            {job.duration ? `• ${job.duration.toFixed(1)}s` : ''}
          </span>
        </div>
      </div>

      {/* Right: Customization Controls Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5 overflow-y-auto max-h-[85vh]">
        {/* Mode Selector Tabs (Text vs Image/Logo) */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            id="tab-text-watermark"
            onClick={() => setWmType('text')}
            className={`flex-1 inline-flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              wmType === 'text'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Text Watermark</span>
          </button>

          <button
            id="tab-image-watermark"
            onClick={() => setWmType('image')}
            className={`flex-1 inline-flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              wmType === 'image'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Logo / Image</span>
          </button>
        </div>

        {/* 1. TEXT WATERMARK CONTROLS */}
        {wmType === 'text' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Watermark Text
              </label>
              <input
                id="watermark-text-input"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. © 2026 YourBrand"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Typography Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Font Family
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f.split(',')[0]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Size</span>
                  <span className="text-cyan-400 font-mono">{fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="96"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Formatting toggles */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsBold(!isBold)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isBold ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() => setIsItalic(!isItalic)}
                className={`flex-1 py-1.5 rounded-lg text-xs italic border transition-colors cursor-pointer ${
                  isItalic ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Italic
              </button>
              <button
                type="button"
                onClick={() => setShadow(!shadow)}
                className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  shadow ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Shadow
              </button>
              <button
                type="button"
                onClick={() => setOutline(!outline)}
                className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  outline ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Outline
              </button>
            </div>

            {/* Color & Opacity Row */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Color
                </label>
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded-xl p-1.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-300 uppercase">{color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Opacity</span>
                  <span className="text-cyan-400 font-mono">{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Rotation & Letter Spacing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Rotation</span>
                  <span className="text-cyan-400 font-mono">{rotation}°</span>
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Letter Space</span>
                  <span className="text-cyan-400 font-mono">{letterSpacing}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Position Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alignment & Placement
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                {POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPosition(p.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer truncate ${
                      position === p.id
                        ? 'bg-cyan-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom XY sliders if custom position */}
            {position === 'custom' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>X Position</span>
                    <span className="font-mono text-cyan-400">{customX}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customX}
                    onChange={(e) => setCustomX(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Y Position</span>
                    <span className="font-mono text-cyan-400">{customY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customY}
                    onChange={(e) => setCustomY(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Repeat Tiled Option */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300 font-medium">Tiled / Repeat Across Media</span>
              <input
                type="checkbox"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
              />
            </div>

            {/* Background Pill Option */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300 font-medium">Add Background Box</span>
              <input
                type="checkbox"
                checked={background}
                onChange={(e) => setBackground(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
              />
            </div>
          </div>
        ) : (
          /* 2. IMAGE / LOGO WATERMARK CONTROLS */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Upload Custom Logo (PNG, WebP, JPG)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload Logo File</span>
              </button>
            </div>

            {/* Scale Slider */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                <span>Logo Scale</span>
                <span className="text-cyan-400 font-mono">{logoScale}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="60"
                value={logoScale}
                onChange={(e) => setLogoScale(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Opacity & Rotation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Opacity</span>
                  <span className="text-cyan-400 font-mono">{Math.round(logoOpacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={logoOpacity}
                  onChange={(e) => setLogoOpacity(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Rotation</span>
                  <span className="text-cyan-400 font-mono">{logoRotation}°</span>
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={logoRotation}
                  onChange={(e) => setLogoRotation(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Logo Position */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Logo Position
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                {POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLogoPosition(p.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer truncate ${
                      logoPosition === p.id
                        ? 'bg-cyan-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Custom XY */}
            {logoPosition === 'custom' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>X Position</span>
                    <span className="font-mono text-cyan-400">{logoCustomX}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={logoCustomX}
                    onChange={(e) => setLogoCustomX(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Y Position</span>
                    <span className="font-mono text-cyan-400">{logoCustomY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={logoCustomY}
                    onChange={(e) => setLogoCustomY(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Logo Repeat Tiled */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300 font-medium">Tiled Logo Pattern</span>
              <input
                type="checkbox"
                checked={logoRepeat}
                onChange={(e) => setLogoRepeat(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
              />
            </div>
          </div>
        )}

        {/* 3. VIDEO DURATION & MOVEMENT (Shown if media is video) */}
        {job.mediaType === 'video' && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-cyan-900/30 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Video Sync & Timeline</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Start Time: {startTime}s
                </label>
                <input
                  type="range"
                  min="0"
                  max={Math.max(1, (job.duration || 10) - 1)}
                  step="0.5"
                  value={startTime}
                  onChange={(e) => setStartTime(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  End Time: {endTime}s
                </label>
                <input
                  type="range"
                  min={startTime + 0.5}
                  max={job.duration || 10}
                  step="0.5"
                  value={endTime}
                  onChange={(e) => setEndTime(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Watermark Motion Path
              </label>
              <select
                value={movement}
                onChange={(e) => setMovement(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
              >
                <option value="none">Fixed Position (Standard)</option>
                <option value="left-to-right">Scroll Left to Right</option>
                <option value="top-to-bottom">Scroll Top to Bottom</option>
                <option value="bounce">Floating Bounce Path</option>
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            id="apply-watermark-btn"
            onClick={handleApply}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
          >
            <Sparkles className="w-4 h-4" />
            <span>APPLY WATERMARK</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel & Upload Another File
          </button>
        </div>
      </div>
    </div>
  );
};
