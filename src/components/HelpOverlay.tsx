import { useEffect } from 'react';
import { useAppStore } from '../store';
import { X, Keyboard, Eye, Zap } from 'lucide-react';

const SHORTCUTS = [
  { key: '1', action: 'Toggle Satellites (TLE)' },
  { key: '2', action: 'Toggle Flights (ADS-B)' },
  { key: '3', action: 'Toggle Earthquakes (USGS)' },
  { key: '4', action: 'Toggle Ships (AIS)' },
  { key: '5', action: 'Toggle Weather (RADAR)' },
  { key: '?', action: 'Show/hide this help panel' },
  { key: 'ESC', action: 'Close help / Clear target' },
];

export default function HelpOverlay() {
  const { showHelp, toggleHelp, clearSelectedTarget } = useAppStore();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHelp) toggleHelp();
        else clearSelectedTarget();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showHelp, toggleHelp, clearSelectedTarget]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto" onClick={toggleHelp}>
      <div
        className="w-[400px] max-w-[90vw] border border-osint-cyan/30 bg-osint-dark/95 shadow-[0_0_40px_rgba(0,255,255,0.08)] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-osint-cyan/20">
          <div className="flex items-center gap-2 text-osint-cyan text-sm font-bold tracking-widest">
            <Keyboard className="w-4 h-4" />
            KEYBOARD SHORTCUTS
          </div>
          <button onClick={toggleHelp} className="text-white/30 hover:text-osint-cyan transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="px-5 py-4 space-y-2">
          {SHORTCUTS.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
              <span className="text-white/60">{action}</span>
              <kbd className="px-2 py-1 text-[10px] font-bold text-osint-cyan border border-osint-cyan/30 bg-osint-cyan/5 tracking-wider min-w-[32px] text-center">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-osint-cyan/10 flex items-center justify-between text-[9px] text-white/20">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            WORLDVIEW // PANOPTICON
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            v2.0 ENHANCED
          </div>
        </div>
      </div>
    </div>
  );
}
