// Simple localStorage-based store for the memory assistant

export interface Person {
  id: string;
  name: string;
  relation: string;
  context: string;
  imageUrl?: string;
  phone?: string;               // ← NEW: WhatsApp number with country code e.g. 919876543210
  isEmergencyContact?: boolean; 
  addedAt: string;
}

export interface Routine {
  id: string;
  time: string;
  title: string;
  icon: string;
  description: string;
  completed: boolean;
  category: 'medicine' | 'meal' | 'exercise' | 'hygiene' | 'social' | 'other';
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  addedBy: string;
  type: 'photo' | 'story' | 'milestone';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'interaction' | 'reminder' | 'confusion' | 'alert';
  message: string;
}

const KEYS = {
  persons: 'memoria_persons',
  routines: 'memoria_routines',
  memories: 'memoria_memories',
  logs: 'memoria_logs',
  patientName: 'memoria_patient_name',
  caregiverPhone: 'memoria_caregiver_phone', // ← NEW
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  getPatientName: () => get<string>(KEYS.patientName, 'Devi'),
  setPatientName: (name: string) => set(KEYS.patientName, name),

  // ── NEW: caregiver phone ──────────────────────────────────────────────────
  getCaregiverPhone: () => get<string>(KEYS.caregiverPhone, ''),
  setCaregiverPhone: (phone: string) => set(KEYS.caregiverPhone, phone),

  getPersons: () => get<Person[]>(KEYS.persons, getDefaultPersons()),
  setPersons: (p: Person[]) => set(KEYS.persons, p),
  addPerson: (p: Person) => {
    const all = store.getPersons();
    all.push(p);
    store.setPersons(all);
  },

  getRoutines: () => get<Routine[]>(KEYS.routines, getDefaultRoutines()),
  setRoutines: (r: Routine[]) => set(KEYS.routines, r),
  toggleRoutine: (id: string) => {
    const all = store.getRoutines();
    const idx = all.findIndex(r => r.id === id);
    if (idx >= 0) all[idx].completed = !all[idx].completed;
    store.setRoutines(all);
  },

  getMemories: () => get<Memory[]>(KEYS.memories, getDefaultMemories()),
  setMemories: (m: Memory[]) => set(KEYS.memories, m),
  addMemory: (m: Memory) => {
    const all = store.getMemories();
    all.push(m);
    store.setMemories(all);
  },

  getLogs: () => get<LogEntry[]>(KEYS.logs, []),
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const all = store.getLogs();
    all.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    set(KEYS.logs, all);
  },
};

function getDefaultPersons(): Person[] {
  return [
    {
      id: '1',
      name: 'Ananya',
      relation: 'Daughter',
      context: 'She visits you every Sunday. She loves cooking for you.',
      phone: '',
      isEmergencyContact: true,
      addedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Dr. Sharma',
      relation: 'Doctor',
      context: 'Your family doctor. You see him every month for a checkup.',
      phone: '',
      isEmergencyContact: false,
      addedAt: new Date().toISOString(),
    },
  ];
}

function getDefaultRoutines(): Routine[] {
  return [
    { id: '1',  time: '07:00', title: 'Wake Up',            icon: '🌅', description: 'Good morning! Time to start your day.',           completed: false, category: 'other'    },
    { id: '2',  time: '07:30', title: 'Morning Medicine',   icon: '💊', description: 'Take your blood pressure medicine with water.',    completed: false, category: 'medicine' },
    { id: '3',  time: '08:00', title: 'Breakfast',          icon: '🍽️', description: 'Have a healthy breakfast.',                        completed: false, category: 'meal'     },
    { id: '4',  time: '10:00', title: 'Morning Walk',       icon: '🚶', description: 'A short walk in the garden.',                     completed: false, category: 'exercise' },
    { id: '5',  time: '12:30', title: 'Lunch',              icon: '🍲', description: 'Time for lunch.',                                 completed: false, category: 'meal'     },
    { id: '6',  time: '14:00', title: 'Afternoon Medicine', icon: '💊', description: 'Take your afternoon medicine.',                   completed: false, category: 'medicine' },
    { id: '7',  time: '18:00', title: 'Evening Tea',        icon: '☕', description: 'Enjoy a cup of tea.',                             completed: false, category: 'meal'     },
    { id: '8',  time: '20:00', title: 'Dinner',             icon: '🍛', description: 'Have your dinner.',                               completed: false, category: 'meal'     },
    { id: '9',  time: '21:00', title: 'Night Medicine',     icon: '💊', description: 'Take your night medicine before bed.',            completed: false, category: 'medicine' },
    { id: '10', time: '21:30', title: 'Bedtime',            icon: '🛏️', description: 'Time to rest. Good night!',                      completed: false, category: 'other'    },
  ];
}

function getDefaultMemories(): Memory[] {
  return [
    {
      id: '1',
      title: 'Birthday Celebration 2020',
      description: 'Your 70th birthday. The whole family was together. Ananya baked your favorite chocolate cake.',
      date: '2020-06-15',
      addedBy: 'Ananya',
      type: 'milestone',
    },
    {
      id: '2',
      title: 'Garden in Spring',
      description: 'You planted roses in the garden. They bloomed beautifully that year.',
      date: '2019-03-20',
      addedBy: 'Family',
      type: 'photo',
    },
  ];
}
