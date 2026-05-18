import { useEffect, useRef, useState, useCallback } from 'react';
import { store, Person } from '@/lib/store';
import { speak } from '@/lib/speech';
import { Camera, CameraOff, UserCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

// face-api.js is loaded via CDN in index.html
declare const faceapi: any;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

type MatchResult =
  | { status: 'matched'; person: Person; distance: number }
  | { status: 'unknown' }
  | { status: 'no_face' }
  | { status: 'idle' };

export default function FaceRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<string>('Loading AI models...');
  const [matchResult, setMatchResult] = useState<MatchResult>({ status: 'idle' });
  const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
  const [persons, setPersons] = useState<Person[]>(store.getPersons());

  // ── Load face-api models once ──────────────────────────────────────────────
  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setStatus('AI models ready. Turn on camera to begin.');
      } catch (err) {
        setStatus('Could not load face AI models. Check internet connection.');
        console.error(err);
      }
    }
    loadModels();
  }, []);

  // ── Build labeled descriptors from stored person photos ───────────────────
  const buildDescriptors = useCallback(async () => {
    const current = store.getPersons().filter(p => p.imageUrl);
    const labeled: any[] = [];

    for (const person of current) {
      try {
        const img = await faceapi.fetchImage(person.imageUrl!);
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        if (detection) {
          labeled.push(
            new faceapi.LabeledFaceDescriptors(person.id, [detection.descriptor])
          );
        }
      } catch {
        // photo unreadable – skip
      }
    }
    setLabeledDescriptors(labeled);
  }, []);

  useEffect(() => {
    if (modelsLoaded) buildDescriptors();
  }, [modelsLoaded, buildDescriptors]);

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOn(true);
      setStatus('Camera on. Scanning for faces...');
      startDetectionLoop();
    } catch {
      setStatus('Camera permission denied. Please allow camera access.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraOn(false);
    setMatchResult({ status: 'idle' });
    setStatus('Camera off.');
  };

  // ── Continuous detection loop ──────────────────────────────────────────────
  const startDetectionLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(detectFaces, 10000);
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    const detections = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    // Draw bounding boxes
    const dims = { width: video.videoWidth, height: video.videoHeight };
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, faceapi.resizeResults(detections, dims));
    faceapi.draw.drawFaceLandmarks(canvas, faceapi.resizeResults(detections, dims));

    if (detections.length === 0) {
      setMatchResult({ status: 'no_face' });
      return;
    }

    // Try to match
    if (labeledDescriptors.length > 0) {
      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
      for (const det of detections) {
        const best = matcher.findBestMatch(det.descriptor);
        if (best.label !== 'unknown') {
          const person = store.getPersons().find(p => p.id === best.label);
          if (person) {
            setMatchResult({ status: 'matched', person, distance: best.distance });
            setStatus(`Recognised: ${person.name}`);
            speak(`This is ${person.name}, your ${person.relation}. ${person.context}`);
            store.addLog({ type: 'interaction', message: `Face recognised: ${person.name}` });
            return;
          }
        }
      }
      setMatchResult({ status: 'unknown' });
      setStatus('Face detected but not recognised.');
    } else {
      setMatchResult({ status: 'unknown' });
      setStatus('Face detected. Add photos to your People to enable recognition.');
    }
  };

  // Cleanup on unmount
  useEffect(() => () => { stopCamera(); }, []);

  // ── Add photo to a person ─────────────────────────────────────────────────
  const handlePhotoUpload = async (personId: string, file: File) => {
    const url = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target!.result as string);
      reader.readAsDataURL(file);
    });
    const all = store.getPersons().map(p => p.id === personId ? { ...p, imageUrl: url } : p);
    store.setPersons(all);
    setPersons(store.getPersons());
    await buildDescriptors();
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold font-display text-foreground mb-2">📷 Face Recognition</h1>
      <p className="text-muted-foreground text-lg mb-6">
        Recognise family members and friends automatically.
      </p>

      {/* Status bar */}
      <div className={`rounded-2xl p-4 mb-5 flex items-center gap-3 text-base font-semibold
        ${modelsLoaded ? 'bg-calm-light text-calm' : 'bg-muted text-muted-foreground'}`}>
        {modelsLoaded
          ? <CheckCircle2 className="w-5 h-5 shrink-0" />
          : <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />}
        {status}
      </div>

      {/* Camera view */}
      <div className="relative rounded-3xl overflow-hidden bg-black mb-5 shadow-lg" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover' }}
        />
        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <CameraOff className="w-16 h-16 opacity-40" />
            <p className="opacity-60 text-lg">Camera is off</p>
          </div>
        )}
      </div>

      {/* Camera toggle */}
      <button
        onClick={cameraOn ? stopCamera : startCamera}
        disabled={!modelsLoaded}
        className={`w-full btn-big font-bold mb-6 flex items-center justify-center gap-3
          ${cameraOn ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {cameraOn ? <><CameraOff className="w-6 h-6" /> Stop Camera</> : <><Camera className="w-6 h-6" /> Start Camera</>}
      </button>

      {/* Match result card */}
      {matchResult.status === 'matched' && (
        <div className="card-feature border-2 border-calm mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            {matchResult.person.imageUrl
              ? <img src={matchResult.person.imageUrl} className="w-16 h-16 rounded-full object-cover" alt="" />
              : <div className="w-16 h-16 rounded-full bg-calm-light flex items-center justify-center">
                  <UserCircle className="w-10 h-10 text-calm" />
                </div>
            }
            <div>
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">Recognised</p>
              <h2 className="text-2xl font-bold font-display">{matchResult.person.name}</h2>
              <p className="text-primary font-semibold">{matchResult.person.relation}</p>
              <p className="text-muted-foreground text-sm">{matchResult.person.context}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Confidence: {Math.round((1 - matchResult.distance) * 100)}%
          </p>
        </div>
      )}

      {matchResult.status === 'unknown' && cameraOn && (
        <div className="card-feature border-2 border-alert mb-6">
          <p className="font-bold text-lg">👤 Unknown Face Detected</p>
          <p className="text-muted-foreground text-sm">
            This person is not in your People list, or their photo hasn't been added yet.
          </p>
        </div>
      )}

      {/* People photo manager */}
      <h2 className="text-xl font-bold font-display mb-3">🖼️ Manage Face Photos</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Add a clear face photo for each person so they can be recognised automatically.
      </p>

      <div className="grid gap-3">
        {persons.map(person => (
          <div key={person.id} className="card-feature flex items-center gap-4">
            {person.imageUrl
              ? <img src={person.imageUrl} alt={person.name} className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-calm" />
              : <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserCircle className="w-8 h-8 text-muted-foreground" />
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg">{person.name}</p>
              <p className="text-primary text-sm">{person.relation}</p>
            </div>
            <label className="cursor-pointer px-3 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition shrink-0">
              {person.imageUrl ? 'Change' : '+ Photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(person.id, file);
                }}
              />
            </label>
          </div>
        ))}
      </div>

      {persons.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          <UserCircle className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p>No people added yet. Go to <strong>My People</strong> tab to add family members.</p>
        </div>
      )}
    </div>
  );
}
