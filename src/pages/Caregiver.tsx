import { useState } from 'react';
import { store, Person } from '@/lib/store';
import { speak } from '@/lib/speech';
import {AlertTriangle, CheckCircle, Clock, Activity, User, Phone, PhoneCall, Save, Shield,} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
function buildWhatsAppUrl(phone: string, patientName: string): string {
  const msg = encodeURIComponent(
    `🚨 EMERGENCY ALERT 🚨\n\n` +
    `${patientName} needs help RIGHT NOW!\n` +
    `Please call or reach them immediately.\n\n` +
    `Sent from MEMO.AI Personal Memory Assistant.`
  );
  // Remove any spaces/dashes/+ from the number
  const clean = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${msg}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Caregiver() {
  const [patientName] = useState(store.getPatientName());
  const [routines]    = useState(store.getRoutines());
  const [logs, setLogs] = useState(store.getLogs());
  const [persons, setPersons] = useState(store.getPersons());

  // Caregiver phone (fallback / quick-set)
  const [caregiverPhone, setCaregiverPhone] = useState(store.getCaregiverPhone());
  const [phoneInput, setPhoneInput] = useState(store.getCaregiverPhone());
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);

  // SOS state
  const [sosSent, setSosSent] = useState(false);

  // Per-person phone editing
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personPhoneInput, setPersonPhoneInput] = useState('');

  const completed         = routines.filter(r => r.completed).length;
  const missed            = routines.filter(r => !r.completed && r.category === 'medicine').length;
  const confusionEvents   = logs.filter(l => l.type === 'confusion').length;
  const lastInteraction   = logs.length > 0 ? new Date(logs[logs.length - 1].timestamp) : null;
  const totalInteractions = logs.filter(l => l.type === 'interaction').length;

  const statusColor = missed > 0 || confusionEvents > 2
    ? 'bg-destructive/10 border-destructive/30'
    : 'bg-safe-light border-safe/30';
  const statusText = missed > 0
    ? 'Needs Attention'
    : confusionEvents > 2 ? 'Confusion Detected' : 'All Good';

  // Emergency contacts = persons with isEmergencyContact true + a phone number
  const emergencyContacts = persons.filter(p => p.isEmergencyContact && p.phone);

  // Primary SOS target: first emergency contact, or fallback caregiverPhone
  const primaryPhone = emergencyContacts[0]?.phone || caregiverPhone;

  // ── SOS handler ─────────────────────────────────────────────────────────
  const handleSOS = () => {
    speak('Emergency alert sent. Help is on the way. Please stay calm.');
    store.addLog({ type: 'alert', message: 'SOS triggered by patient' });
    setLogs(store.getLogs());
    setSosSent(true);
    setTimeout(() => setSosSent(false), 8000);

    if (primaryPhone) {
      const url = buildWhatsAppUrl(primaryPhone, patientName);
      window.open(url, '_blank');
    }

    // Also open WhatsApp for ALL other emergency contacts
    emergencyContacts.slice(1).forEach((p, i) => {
      setTimeout(() => {
        window.open(buildWhatsAppUrl(p.phone!, patientName), '_blank');
      }, (i + 1) * 800);
    });
  };

  // ── Save caregiver fallback phone ────────────────────────────────────────
  const saveCaregiverPhone = () => {
    store.setCaregiverPhone(phoneInput);
    setCaregiverPhone(phoneInput);
    setShowPhoneEdit(false);
  };

  // ── Toggle emergency contact + save phone ───────────────────────────────
  const toggleEmergency = (id: string) => {
    const updated = persons.map(p =>
      p.id === id ? { ...p, isEmergencyContact: !p.isEmergencyContact } : p
    );
    store.setPersons(updated);
    setPersons(store.getPersons());
  };

  const startEditPhone = (p: Person) => {
    setEditingPersonId(p.id);
    setPersonPhoneInput(p.phone || '');
  };

  const savePersonPhone = (id: string) => {
    const updated = persons.map(p =>
      p.id === id ? { ...p, phone: personPhoneInput } : p
    );
    store.setPersons(updated);
    setPersons(store.getPersons());
    setEditingPersonId(null);
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold font-display text-foreground mb-2">📊 Caregiver Dashboard</h1>
      <p className="text-muted-foreground text-lg mb-6">Patient overview at a glance</p>

      {/* ── SOS BUTTON ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={handleSOS}
          className={`w-full py-6 rounded-3xl text-white text-2xl font-bold font-display shadow-xl
            flex items-center justify-center gap-3 transition-all active:scale-95
            ${sosSent
              ? 'bg-orange-500 animate-pulse'
              : 'bg-destructive hover:bg-destructive/90'
            }`}
        >
          <PhoneCall className="w-8 h-8" />
          {sosSent ? 'Alert Sent! Help is Coming…' : '🆘 SOS – Call Caregiver'}
        </button>

        {!primaryPhone && (
          <p className="text-xs text-destructive mt-2 text-center font-semibold">
            ⚠️ No emergency contact phone set. Add one below.
          </p>
        )}
        {sosSent && primaryPhone && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            WhatsApp opened for {emergencyContacts[0]?.name || 'caregiver'}
          </p>
        )}
      </div>

      {/* ── Patient status ─────────────────────────────────────────────── */}
      <div className={`card-feature border-2 ${statusColor} mb-6`}>
        <div className="flex items-center gap-3 mb-3">
          <User className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">{patientName}</h2>
            <p className={`font-semibold ${missed > 0 ? 'text-destructive' : 'text-accent'}`}>{statusText}</p>
          </div>
        </div>
        {lastInteraction && (
          <p className="text-muted-foreground text-sm">
            Last interaction: {lastInteraction.toLocaleString()}
          </p>
        )}
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-calm text-center">
          <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold font-display text-foreground">{completed}/{routines.length}</p>
          <p className="text-muted-foreground text-sm">Tasks Done</p>
        </div>
        <div className="card-calm text-center">
          <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${missed > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          <p className="text-2xl font-bold font-display text-foreground">{missed}</p>
          <p className="text-muted-foreground text-sm">Missed Meds</p>
        </div>
        <div className="card-calm text-center">
          <Activity className={`w-8 h-8 mx-auto mb-2 ${confusionEvents > 0 ? 'text-alert' : 'text-muted-foreground'}`} />
          <p className="text-2xl font-bold font-display text-foreground">{confusionEvents}</p>
          <p className="text-muted-foreground text-sm">Confusion Events</p>
        </div>
        <div className="card-calm text-center">
          <Clock className="w-8 h-8 text-calm mx-auto mb-2" />
          <p className="text-2xl font-bold font-display text-foreground">{totalInteractions}</p>
          <p className="text-muted-foreground text-sm">Interactions</p>
        </div>
      </div>

      {/* ── Emergency Contacts manager ─────────────────────────────────── */}
      <h2 className="text-xl font-bold font-display mb-1 flex items-center gap-2">
        <Shield className="w-5 h-5 text-destructive" /> Emergency Contacts
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        Mark people as emergency contacts and add their WhatsApp number (with country code, e.g. <strong>919876543210</strong>).
      </p>

      <div className="grid gap-3 mb-4">
        {persons.map(person => (
          <div key={person.id} className={`card-feature border-2 transition-colors ${person.isEmergencyContact ? 'border-destructive/40' : 'border-transparent'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg leading-tight">{person.name}</p>
                <p className="text-primary text-sm">{person.relation}</p>
              </div>
              <button
                onClick={() => toggleEmergency(person.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  person.isEmergencyContact
                    ? 'bg-destructive text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {person.isEmergencyContact ? '🆘 SOS' : '+ Set SOS'}
              </button>
            </div>

            {/* Phone number row */}
            {editingPersonId === person.id ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="tel"
                  placeholder="919876543210"
                  value={personPhoneInput}
                  onChange={e => setPersonPhoneInput(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-border bg-background text-base"/> 
                <button
                  onClick={() => savePersonPhone(person.id)}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => startEditPhone(person)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-1"
              >
                <Phone className="w-4 h-4" />
                {person.phone ? person.phone : 'Tap to add WhatsApp number'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Fallback caregiver phone */}
      <div className="card-calm mb-6">
        <p className="font-semibold mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" /> Fallback Caregiver Number
        </p>
        {showPhoneEdit ? (
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="919876543210"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-border bg-background text-base"
            />
            <button onClick={saveCaregiverPhone}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
              Save
            </button>
          </div>
        ) : (
          <button onClick={() => setShowPhoneEdit(true)}
            className="text-sm text-muted-foreground hover:text-foreground">
            {caregiverPhone || 'Tap to set fallback number'}
          </button>
        )}
      </div>

      {/* ── Recent activity ─────────────────────────────────────────────── */}
      <h3 className="text-lg font-bold font-display text-foreground mb-3">Recent Activity</h3>
      {logs.length === 0 ? (
        <div className="card-calm text-center text-muted-foreground">
          <p>No activity logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.slice(-10).reverse().map(log => (
            <div key={log.id} className={`card-calm py-3 px-4 flex items-start gap-3 ${
              log.type === 'confusion'   ? 'border-l-4 border-l-alert'       :
              log.type === 'alert'      ? 'border-l-4 border-l-destructive'  : ''
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{log.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                log.type === 'confusion' ? 'bg-alert-light text-foreground'       :
                log.type === 'alert'    ? 'bg-destructive/10 text-destructive'    :
                log.type === 'reminder' ? 'bg-safe-light text-foreground'         :
                'bg-muted text-muted-foreground'
              }`}>
                {log.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
