import { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { speak, startListening, getAssistantResponse } from '@/lib/speech';
import { store } from '@/lib/store';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastInput, setLastInput] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  const handleVoice = useCallback(() => {
    if (isListening && stopFn) {
      stopFn();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const stop = startListening(
      async (text) => {
        setLastInput(text);
        setIsListening(false);

        store.addLog({ type: 'interaction', message: `User said: "${text}"` });

        // Check for confusion patterns
        const logs = store.getLogs().filter(l => l.type === 'interaction');
        const recent = logs.slice(-5).map(l => l.message.toLowerCase());
        const repeated = recent.filter(m => m.includes(text.toLowerCase())).length >= 2;
        if (repeated) {
          store.addLog({ type: 'confusion', message: `Repeated question detected: "${text}"` });
        }

        const response = getAssistantResponse(text, {
          patientName: store.getPatientName(),
          persons: store.getPersons(),
          routines: store.getRoutines(),
        });
        setLastResponse(response);
        setIsSpeaking(true);
        await speak(response);
        setIsSpeaking(false);
      },
      () => setIsListening(false)
    );
    setStopFn(() => stop);
  }, [isListening, stopFn]);

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
      {/* Response bubble */}
      {(lastResponse || lastInput) && (
        <div className="max-w-[300px] card-calm text-sm animate-in fade-in slide-in-from-bottom-2">
          {lastInput && (
            <p className="text-muted-foreground mb-2 text-xs">
              You said: "{lastInput}"
            </p>
          )}
          {lastResponse && (
            <p className="text-foreground text-patient text-sm leading-relaxed">
              {lastResponse}
            </p>
          )}
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={handleVoice}
        className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isListening
            ? 'bg-destructive text-destructive-foreground animate-pulse scale-110'
            : isSpeaking
            ? 'bg-accent text-accent-foreground'
            : 'bg-primary text-primary-foreground hover:scale-105'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start voice assistant'}
      >
        {isListening ? (
          <MicOff className="w-7 h-7" />
        ) : isSpeaking ? (
          <Volume2 className="w-7 h-7 animate-pulse" />
        ) : (
          <Mic className="w-7 h-7" />
        )}
      </button>
    </div>
  );
}
