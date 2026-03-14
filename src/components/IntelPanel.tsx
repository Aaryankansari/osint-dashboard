import { X, Target, Crosshair } from 'lucide-react';
import { useAppStore } from '../store';

export default function IntelPanel() {
  const { selectedTarget, clearSelectedTarget } = useAppStore();

  if (!selectedTarget) return null;

  return (
    <aside className="absolute top-20 right-4 w-72 border border-osint-cyan/50 bg-black/70 backdrop-blur-lg p-5 pointer-events-auto shadow-[0_0_20px_rgba(0,255,255,0.1)] z-50 flex flex-col gap-4 transition-all animate-in slide-in-from-right-8 fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-start border-b border-osint-cyan/30 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-osint-cyan font-bold tracking-widest text-sm uppercase">
            <Target className="w-4 h-4" /> 
            TARGET LOCK
          </div>
          <span className="text-[10px] text-white/50">{selectedTarget.type.toUpperCase()}</span>
        </div>
        <button 
          onClick={clearSelectedTarget}
          className="text-white/50 hover:text-osint-cyan transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Data Readout */}
      <div className="flex flex-col gap-3">
        <div className="text-xl font-bold bg-osint-cyan/10 text-osint-cyan py-2 px-3 border border-osint-cyan/20 break-all">
          {selectedTarget.name}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(selectedTarget.data).map(([key, value]) => (
            <div key={key} className="flex flex-col bg-white/5 p-2 rounded-sm border border-white/5">
              <span className="text-osint-cyan/50 text-[9px] uppercase tracking-widest mb-1">{key}</span>
              <span className="text-white font-medium truncate" title={String(value)}>
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Details */}
      <div className="mt-2 pt-3 border-t border-osint-cyan/20 flex justify-between items-center text-[10px] text-white/40">
        <div className="flex items-center gap-1">
          <Crosshair className="w-3 h-3 text-osint-cyan/60 -animate-spin" />
          TRACKING ACTIVE
        </div>
        <span className="font-mono">SYS_COORD_LNK</span>
      </div>

    </aside>
  );
}
