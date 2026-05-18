import { useEffect, useRef, useState } from 'react';
import { speak } from '@/lib/speech';
import { store } from '@/lib/store';
import { Camera, CameraOff, ScanSearch, ImagePlus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

// TensorFlow + COCO-SSD loaded via CDN in index.html
declare const cocoSsd: any;

// Common household items an Alzheimer's patient might misplace
const WATCHED_OBJECTS = [
  'cell phone', 'remote', 'glasses', 'book', 'cup', 'bottle',
  'bowl', 'chair', 'couch', 'bed', 'clock', 'umbrella',
  'handbag', 'backpack', 'laptop', 'keyboard', 'mouse', 'tv',
];

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h
}

interface CapturedItem {
  id: string;
  label: string;
  confidence: number;
  imageDataUrl: string;
  timestamp: string;
  location: string; // user-described location tag
}

const LOCATION_TAGS = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Table', 'Near Door'];

export default function ObjectDetection() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const modelRef   = useRef<any>(null);
  const loopRef    = useRef<number | null>(null);
  const lastSpokenRef = useRef<{ label: string; time: number } | null>(null);

  const [modelReady, setModelReady]     = useState(false);
  const [cameraOn, setCameraOn]         = useState(false);
  const [status, setStatus]             = useState('Loading object detection model…');
  const [detections, setDetections]     = useState<Detection[]>([]);
  const [tab, setTab]                   = useState<'live' | 'saved'>('live');
  const [savedItems, setSavedItems]     = useState<CapturedItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('memo_objects') || '[]'); } catch { return []; }
  });
  const [pendingCapture, setPendingCapture] = useState<{ label: string; confidence: number; dataUrl: string } | null>(null);
  const [locationTag, setLocationTag]   = useState(LOCATION_TAGS[0]);

  // ── Load COCO-SSD ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        setModelReady(true);
        setStatus('Model ready. Turn on camera to detect objects.');
      } catch (e) {
        setStatus('Could not load model. Check internet connection.');
        console.error(e);
      }
    }
    load();
    return () => { stopCamera(); };
  }, []);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatus('Scanning for objects…');
      startLoop();
    } catch {
      setStatus('Camera permission denied.');
    }
  };

  const stopCamera = () => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setDetections([]);
    setStatus('Camera off.');
  };

  // ── Detection loop ────────────────────────────────────────────────────────
  const startLoop = () => {
    const run = async () => {
      if (!videoRef.current || !canvasRef.current || !modelRef.current) {
        loopRef.current = requestAnimationFrame(run);
        return;
      }
      const video  = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2) {
        loopRef.current = requestAnimationFrame(run);
        return;
      }

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const preds: Detection[] = await modelRef.current.detect(canvas);
      const relevant = preds.filter(p => p.score > 0.55);
      setDetections(relevant);

      // Draw boxes
      drawBoxes(ctx, relevant, canvas.width, canvas.height);

      // Announce newly detected watched objects (with cooldown)
      for (const det of relevant) {
        if (WATCHED_OBJECTS.includes(det.class)) {
          const now = Date.now();
          const last = lastSpokenRef.current;
          if (!last || last.label !== det.class || now - last.time > 12_000) {
            speak(`I can see a ${det.class} here.`);
            lastSpokenRef.current = { label: det.class, time: now };
            store.addLog({ type: 'interaction', message: `Object detected: ${det.class}` });
            break; // announce only one object at a time
          }
        }
      }

      loopRef.current = requestAnimationFrame(run);
    };
    loopRef.current = requestAnimationFrame(run);
  };

  // ── Draw bounding boxes on canvas ─────────────────────────────────────────
  const drawBoxes = (ctx: CanvasRenderingContext2D, preds: Detection[], w: number, h: number) => {
    preds.forEach(({ class: label, score, bbox }) => {
      const [x, y, bw, bh] = bbox;
      const isWatched = WATCHED_OBJECTS.includes(label);
      ctx.strokeStyle = isWatched ? '#ef4444' : '#3b82f6';
      ctx.lineWidth   = 3;
      ctx.strokeRect(x, y, bw, bh);

      // Label background
      const text = `${label} ${Math.round(score * 100)}%`;
      ctx.font = `bold ${Math.max(14, w * 0.025)}px sans-serif`;
      const textW = ctx.measureText(text).width;
      ctx.fillStyle = isWatched ? '#ef4444' : '#3b82f6';
      ctx.fillRect(x, y - 26, textW + 10, 26);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 5, y - 6);
    });
  };

  // ── Capture snapshot ──────────────────────────────────────────────────────
  const captureSnapshot = () => {
    if (!canvasRef.current || detections.length === 0) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    const top = detections.reduce((a, b) => a.score > b.score ? a : b);
    setPendingCapture({ label: top.class, confidence: top.score, dataUrl });
  };

  const confirmSave = () => {
    if (!pendingCapture) return;
    const item: CapturedItem = {
      id: crypto.randomUUID(),
      label: pendingCapture.label,
      confidence: pendingCapture.confidence,
      imageDataUrl: pendingCapture.dataUrl,
      timestamp: new Date().toISOString(),
      location: locationTag,
    };
    const updated = [item, ...savedItems];
    setSavedItems(updated);
    localStorage.setItem('memo_objects', JSON.stringify(updated));
    setPendingCapture(null);
    speak(`${item.label} saved. Location: ${item.location}.`);
  };

  const deleteItem = (id: string) => {
    const updated = savedItems.filter(i => i.id !== id);
    setSavedItems(updated);
    localStorage.setItem('memo_objects', JSON.stringify(updated));
  };

  const announceItem = (item: CapturedItem) => {
    speak(`Your ${item.label} was last seen in the ${item.location}, saved on ${new Date(item.timestamp).toLocaleDateString()}.`);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold font-display text-foreground mb-2">🔍 Find My Things</h1>
      <p className="text-muted-foreground text-lg mb-5">
        Point the camera at any object to identify and remember where it is.
      </p>

      {/* Status */}
      <div className={`rounded-2xl p-3 mb-4 flex items-center gap-3 text-sm font-semibold
        ${modelReady ? 'bg-calm-light text-calm' : 'bg-muted text-muted-foreground'}`}>
        {modelReady
          ? <CheckCircle2 className="w-5 h-5 shrink-0" />
          : <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />}
        {status}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['live', 'saved'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
            {t === 'live' ? '📷 Live Camera' : `📦 Saved Items (${savedItems.length})`}
          </button>
        ))}
      </div>

      {/* ── LIVE TAB ────────────────────────────────────────────────────── */}
      {tab === 'live' && (
        <>
          {/* Camera view */}
          <div className="relative rounded-3xl overflow-hidden bg-black mb-4 shadow-lg" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                <CameraOff className="w-14 h-14 opacity-40" />
                <p className="opacity-60">Camera is off</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <button
            onClick={cameraOn ? stopCamera : startCamera}
            disabled={!modelReady}
            className={`w-full btn-big font-bold mb-4 flex items-center justify-center gap-3
              ${cameraOn ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {cameraOn
              ? <><CameraOff className="w-6 h-6" /> Stop Camera</>
              : <><Camera className="w-6 h-6" /> Start Camera</>}
          </button>

          {/* Capture button — only when objects detected */}
          {cameraOn && detections.length > 0 && (
            <button
              onClick={captureSnapshot}
              className="w-full btn-big bg-accent text-accent-foreground font-bold mb-4 flex items-center justify-center gap-2"
            >
              <ImagePlus className="w-5 h-5" /> Save This Object's Location
            </button>
          )}

          {/* Live detection list */}
          {cameraOn && detections.length > 0 && (
            <div className="card-calm mb-4">
              <p className="font-bold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Detected Now</p>
              <div className="flex flex-wrap gap-2">
                {detections.map((d, i) => (
                  <span key={i}
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      WATCHED_OBJECTS.includes(d.class)
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-calm-light text-calm'
                    }`}>
                    {d.class} · {Math.round(d.score * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pending capture confirm dialog */}
          {pendingCapture && (
            <div className="card-feature border-2 border-accent mb-4">
              <p className="font-bold text-lg mb-3">📍 Save location of this {pendingCapture.label}?</p>
              <img src={pendingCapture.dataUrl} alt="capture" className="w-full rounded-xl mb-3 object-cover max-h-40" />
              <p className="text-sm text-muted-foreground mb-2">Where is it?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {LOCATION_TAGS.map(loc => (
                  <button key={loc} onClick={() => setLocationTag(loc)}
                    className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                      locationTag === loc
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                    {loc}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={confirmSave}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold">
                  ✅ Save
                </button>
                <button onClick={() => setPendingCapture(null)}
                  className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SAVED TAB ───────────────────────────────────────────────────── */}
      {tab === 'saved' && (
        <>
          {savedItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ScanSearch className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p>No items saved yet.</p>
              <p className="text-sm mt-1">Use the Live Camera tab to detect and save objects.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {savedItems.map(item => (
                <div key={item.id} className="card-feature flex gap-4">
                  <img
                    src={item.imageDataUrl}
                    alt={item.label}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg capitalize">{item.label}</p>
                    <p className="text-primary font-semibold text-sm">📍 {item.location}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Confidence: {Math.round(item.confidence * 100)}%
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => announceItem(item)}
                      className="p-2 rounded-xl bg-calm-light text-calm hover:opacity-80"
                      title="Read aloud"
                    >
                      🔊
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 rounded-xl bg-destructive/10 text-destructive hover:opacity-80"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
