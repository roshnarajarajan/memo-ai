import { useState } from 'react';
import { store, Routine as RoutineType } from '@/lib/store';
import { speak } from '@/lib/speech';
import { Check, Volume2 } from 'lucide-react';

const categoryColors: Record<string, string> = {
  medicine: 'bg-love-light border-love/30',
  meal: 'bg-alert-light border-alert/30',
  exercise: 'bg-safe-light border-safe/30',
  hygiene: 'bg-calm-light border-calm/30',
  social: 'bg-love-light border-love/30',
  other: 'bg-secondary border-border',
};

export default function Routine() {
  const [routines, setRoutines] = useState(store.getRoutines());

  const handleToggle = (id: string) => {
    store.toggleRoutine(id);
    setRoutines(store.getRoutines());
    const r = store.getRoutines().find(x => x.id === id);
    if (r?.completed) {
      speak(`Great job! You completed: ${r.title}.`);
      store.addLog({ type: 'reminder', message: `Completed: ${r.title}` });
    }
  };

  const handleSpeak = (r: RoutineType) => {
    speak(`${r.title} at ${r.time}. ${r.description}`);
  };

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const completed = routines.filter(r => r.completed).length;

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold font-display text-foreground mb-2">⏰ My Day</h1>
      <p className="text-muted-foreground text-lg mb-2">
        {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Progress */}
      <div className="card-calm mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-foreground">Today's Progress</span>
          <span className="font-bold text-primary">{completed}/{routines.length}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-4">
          <div
            className="bg-accent h-4 rounded-full transition-all duration-500"
            style={{ width: `${(completed / routines.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {routines.map(routine => {
          const isPast = routine.time < currentTime;
          const isCurrent = !routine.completed && isPast;

          return (
            <div
              key={routine.id}
              className={`card-calm flex items-center gap-4 border-2 transition-all ${
                categoryColors[routine.category] || ''
              } ${routine.completed ? 'opacity-60' : ''} ${
                isCurrent ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(routine.id)}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  routine.completed
                    ? 'bg-accent border-accent text-accent-foreground'
                    : 'border-border hover:border-primary'
                }`}
              >
                {routine.completed && <Check className="w-6 h-6" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{routine.icon}</span>
                  <h3 className={`text-lg font-bold font-display ${routine.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {routine.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">{routine.time} · {routine.description}</p>
              </div>

              <button
                onClick={() => handleSpeak(routine)}
                className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
              >
                <Volume2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
