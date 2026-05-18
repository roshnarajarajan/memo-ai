// Voice interaction utilities using Web Speech API

export function speak(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve();
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Prefer a calm, clear voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) 
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function startListening(onResult: (text: string) => void, onEnd?: () => void): (() => void) | null {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported');
    return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };
  
  recognition.onend = () => {
    onEnd?.();
  };
  
  recognition.onerror = () => {
    onEnd?.();
  };
  
  recognition.start();
  
  return () => {
    recognition.stop();
  };
}

export function getAssistantResponse(input: string, context: { patientName: string; persons: any[]; routines: any[] }): string {
  const lower = input.toLowerCase();
  const { patientName, persons, routines } = context;
  
  // Greetings
  if (lower.match(/hello|hi|hey|good morning|good evening/)) {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greeting}, ${patientName}. I am your memory assistant. I am here to help you. How are you feeling today?`;
  }
  
  // Who are you
  if (lower.match(/who are you|what are you/)) {
    return `I am your personal memory assistant, ${patientName}. I am here to help you remember important things and keep you safe. You can ask me about people, your schedule, or anything you need help with.`;
  }
  
  // Who is someone
  const whoMatch = lower.match(/who is (\w+)/);
  if (whoMatch) {
    const name = whoMatch[1];
    const person = persons.find(p => p.name.toLowerCase().includes(name));
    if (person) {
      return `${person.name} is your ${person.relation}. ${person.context}`;
    }
    return `I don't have information about ${name} yet. Would you like to add them?`;
  }
  
  // Medicine
  if (lower.match(/medicine|medication|pill|tablet/)) {
    const meds = routines.filter(r => r.category === 'medicine');
    const completed = meds.filter(r => r.completed);
    const pending = meds.filter(r => !r.completed);
    
    if (pending.length === 0) {
      return `Great news, ${patientName}! You have taken all your medicines for today.`;
    }
    return `You still need to take your medicine: ${pending.map(r => `${r.title} at ${r.time}`).join(', ')}. ${completed.length > 0 ? `You already took: ${completed.map(r => r.title).join(', ')}.` : ''}`;
  }
  
  // Schedule / routine
  if (lower.match(/schedule|routine|what.*do|plan|today/)) {
    const pending = routines.filter(r => !r.completed);
    if (pending.length === 0) {
      return `You have completed all your tasks for today, ${patientName}. Well done! Time to relax.`;
    }
    const next = pending[0];
    return `Your next task is: ${next.icon} ${next.title} at ${next.time}. ${next.description}`;
  }
  
  // Time
  if (lower.match(/what time|time is it/)) {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `It is ${time} on ${day}, ${patientName}.`;
  }
  
  // Feeling bad
  if (lower.match(/scared|worried|anxious|confused|lost|afraid|panic/)) {
    return `${patientName}, you are safe. Everything is okay. You are at home. Take a deep breath. Would you like me to call someone for you?`;
  }
  
  // Help
  if (lower.match(/help/)) {
    return `Of course, ${patientName}. You can ask me: "Who is someone?", "What time is it?", "Did I take my medicine?", "What should I do now?", or just tell me how you are feeling. I am always here for you.`;
  }
  
  // Default
  return `I understand, ${patientName}. I am here with you. You can ask me about people you know, your daily schedule, your medicines, or just talk to me. You are safe.`;
}
