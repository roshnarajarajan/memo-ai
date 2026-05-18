import { useState } from 'react';
import { store, Memory } from '@/lib/store';
import { speak } from '@/lib/speech';
import { Plus, Volume2, Heart, Star, Camera } from 'lucide-react';

const typeIcons: Record<string, any> = {
  photo: Camera,
  story: Heart,
  milestone: Star,
};

const typeColors: Record<string, string> = {
  photo: 'bg-calm-light text-calm',
  story: 'bg-love-light text-love',
  milestone: 'bg-alert-light text-alert',
};

export default function Memories() {
  const [memories, setMemories] = useState(store.getMemories());
  const [showAdd, setShowAdd] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', description: '', date: '', addedBy: '', type: 'photo' as Memory['type'] });

  const handleSpeak = (m: Memory) => {
    speak(`${m.title}. ${m.description}. This memory was from ${new Date(m.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`);
  };

  const handleAdd = () => {
    if (!newMemory.title || !newMemory.description) return;
    const memory: Memory = {
      id: crypto.randomUUID(),
      ...newMemory,
      date: newMemory.date || new Date().toISOString(),
    };
    store.addMemory(memory);
    setMemories(store.getMemories());
    setNewMemory({ title: '', description: '', date: '', addedBy: '', type: 'photo' });
    setShowAdd(false);
  };

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-display text-foreground">💝 Memories</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 rounded-full bg-love text-love-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      </div>

      <p className="text-muted-foreground text-lg mb-6">Your precious life moments. Tap to hear about them.</p>

      {showAdd && (
        <div className="card-feature mb-6">
          <h3 className="text-lg font-bold font-display mb-4">Add New Memory</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Memory title"
              value={newMemory.title}
              onChange={e => setNewMemory(m => ({ ...m, title: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
            />
            <textarea
              placeholder="Describe this memory..."
              value={newMemory.description}
              onChange={e => setNewMemory(m => ({ ...m, description: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
              rows={3}
            />
            <input
              type="date"
              value={newMemory.date}
              onChange={e => setNewMemory(m => ({ ...m, date: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
            />
            <input
              type="text"
              placeholder="Added by (e.g., Ananya)"
              value={newMemory.addedBy}
              onChange={e => setNewMemory(m => ({ ...m, addedBy: e.target.value }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
            />
            <select
              value={newMemory.type}
              onChange={e => setNewMemory(m => ({ ...m, type: e.target.value as Memory['type'] }))}
              className="w-full p-4 rounded-xl border border-border bg-background text-lg"
            >
              <option value="photo">📸 Photo Memory</option>
              <option value="story">💕 Story</option>
              <option value="milestone">⭐ Milestone</option>
            </select>
            <button onClick={handleAdd} className="w-full btn-big bg-love text-primary-foreground font-bold">
              Save Memory
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {memories.map(memory => {
          const Icon = typeIcons[memory.type] || Heart;
          return (
            <button
              key={memory.id}
              onClick={() => handleSpeak(memory)}
              className="card-feature text-left w-full group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${typeColors[memory.type]}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold font-display text-foreground">{memory.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{memory.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(memory.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    {memory.addedBy && <span>Added by {memory.addedBy}</span>}
                  </div>
                </div>
                <Volume2 className="w-5 h-5 text-muted-foreground group-hover:text-love transition-colors shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
