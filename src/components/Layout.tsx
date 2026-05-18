import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Clock, Heart, BarChart3, ScanFace, ScanSearch } from 'lucide-react';

const navItems = [
  { path: '/',         icon: Home,       label: 'Home'     },
  { path: '/people',   icon: Users,      label: 'People'   },
  { path: '/face',     icon: ScanFace,   label: 'Face'     },
  { path: '/objects',  icon: ScanSearch, label: 'Find'     },
  { path: '/routine',  icon: Clock,      label: 'Routine'  },
  { path: '/memories', icon: Heart,      label: 'Memories' },
  { path: '/caregiver',icon: BarChart3,  label: 'Caregiver'},
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto px-1 py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all duration-200 min-w-[44px] \${
                  active
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold font-display">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
