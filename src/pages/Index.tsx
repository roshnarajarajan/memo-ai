import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Heart, Mic, Sun, Moon, CloudSun } from 'lucide-react';
import { store } from '@/lib/store';
import { speak } from '@/lib/speech';

export default function Index() {
  const [patientName, setPatientName] = useState(store.getPatientName());
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [hasGreeted, setHasGreeted] = useState(false);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const g = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    setGreeting(g);
    setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));

    if (!hasGreeted) {
      setHasGreeted(true);
      const routines = store.getRoutines();
      const pending = routines.filter(r => !r.completed);
      const next = pending[0];
      const msg = `${g}, ${patientName}. Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. ${next ? `Your next task is ${next.title} at ${next.time}.` : 'You have completed all tasks today.'} I am here to help you.`;
      setTimeout(() => speak(msg), 1000);
    }
  }, []);

  const TimeIcon = () => {
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 20) return <Moon className="w-8 h-8 text-calm" />;
    if (hour < 12) return <Sun className="w-8 h-8 text-warm" />;
    return <CloudSun className="w-8 h-8 text-alert" />;
  };

  const quickActions = [
    { path: '/people', icon: '👥', label: 'My People', color: 'bg-calm-light', desc: 'See who you know' },
    { path: '/routine', icon: '⏰', label: 'My Day', color: 'bg-alert-light', desc: 'Daily schedule' },
    { path: '/memories', icon: '💝', label: 'Memories', color: 'bg-love-light', desc: 'Your life stories' },
  ];

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      {/* Greeting header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TimeIcon />
          <h1 className="text-3xl font-bold font-display text-foreground">{greeting}</h1>
        </div>
        <h2 className="text-2xl font-semibold font-display text-primary ml-12">{patientName}</h2>
        <p className="text-muted-foreground text-lg mt-2 ml-11">{dateStr}</p>
      </div>

      {/* Status card */}
      <div className="card-feature mb-5 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 mb-3">
          <Mic className="w-8 h-8" />
          <div>
            <h3 className="text-xl font-bold font-display text-black/80">Voice Assistant Ready</h3>
            <p className="text-primary-foreground/80 text-black/80">Tap the mic button to talk to me</p>
          </div>
        </div>
        <p className="text-primary-foreground/70 text-sm text-black/80">
          Try saying: "What should I do now?" or "What I did yesterday?"
        </p>
      </div>

      {/* Quick actions */}
      <h3 className="text-lg font-bold font-display text-foreground mb-4">What would you like to do?</h3>
      <div className="grid gap-4">
        {quickActions.map(({ path, icon, label, color, desc }) => (
          <Link key={path} to={path} className="card-feature flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-3xl shrink-0`}>
              {icon}
            </div>
            <div>
              <h4 className="text-xl font-bold font-display text-foreground">{label}</h4>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Safety message */}
      <div className="mt-8 card-calm bg-safe-light border-safe/20 text-center">
        <p className="text-lg font-semibold text-foreground">You are safe. 💚</p>
        <p className="text-muted-foreground">I am always here to help you.</p>
      </div>
    </div>
  );
}
