import { useState } from 'react';
import { store, Person } from '@/lib/store';
import { speak } from '@/lib/speech';
import { Plus, Volume2, UserCircle } from 'lucide-react';

export default function People() {
  const [persons, setPersons] = useState(store.getPersons());
  const [showAdd, setShowAdd] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', relation: '', context: '' });

  const handleSpeak = (person: Person) => {
    speak(`This is ${person.name}, your ${person.relation}. ${person.context}`);
    store.addLog({ type: 'interaction', message: `Asked about ${person.name}` });
  };

  const handleAdd = () => {
    if (!newPerson.name || !newPerson.relation) return;
    const person: Person = {
      id: crypto.randomUUID(),
      ...newPerson,
      addedAt: new Date().toISOString(),
    };
    store.addPerson(person);
    setPersons(store.getPersons());
    setNewPerson({ name: '', relation: '', context: '' });
    setShowAdd(false);
  };

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-display text-foreground">👥 My People</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <p className="text-muted-foreground text-lg mb-6">Tap on a person to hear about them.</p>

      {showAdd && (
        <div className="card-feature mb-6">
          <h3 className="text-lg font-bold font-display mb-4">Add New Person</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              value={newPerson.name}
              onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
            />
            <input
              type="text"
              placeholder="Relation (e.g., Daughter, Doctor)"
              value={newPerson.relation}
              onChange={e => setNewPerson(p => ({ ...p, relation: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
            />
            <textarea
              placeholder="Context (e.g., She visits every Sunday)"
              value={newPerson.context}
              onChange={e => setNewPerson(p => ({ ...p, context: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
              rows={3}
            />
            <button
              onClick={handleAdd}
              className="w-full btn-big bg-accent text-accent-foreground font-bold"
            >
              Save Person
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {persons.map(person => (
          <button
            key={person.id}
            onClick={() => handleSpeak(person)}
            className="card-feature flex items-center gap-4 text-left w-full group"
          >
            <div className="w-16 h-16 rounded-full bg-calm-light flex items-center justify-center shrink-0">
              <UserCircle className="w-10 h-10 text-calm" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold font-display text-foreground">{person.name}</h3>
              <p className="text-primary font-semibold">{person.relation}</p>
              <p className="text-muted-foreground text-sm truncate">{person.context}</p>
            </div>
            <Volume2 className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
