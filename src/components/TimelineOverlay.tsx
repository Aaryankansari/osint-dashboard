import { useAppStore } from '../store';
import { Clock, SkipForward, SkipBack } from 'lucide-react';

export default function TimelineOverlay() {
  const { timeOffset, setTimeOffset } = useAppStore();

  const handleReset = () => setTimeOffset(0);

  // Offset up to 24 hours (86,400,000 ms)
  const MAX_OFFSET = 24 * 60 * 60 * 1000;

  const hours = Math.floor(timeOffset / (60 * 60 * 1000));
  const minutes = Math.floor((timeOffset % (60 * 60 * 1000)) / (60 * 1000));

  return (
    <div className="w-full max-w-[450px] pointer-events-auto">
      <div className="bg-black/60 backdrop-blur-md border border-osint-cyan/20 px-6 py-2 shadow-[0_0_15px_rgba(34,211,238,0.05)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-osint-cyan" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Simulation Offset</span>
          </div>
          <div className="text-[10px] font-mono text-osint-cyan">
             {timeOffset >= 0 ? '+' : ''}{hours}H {minutes}M
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTimeOffset(Math.max(-MAX_OFFSET, timeOffset - 3600000))}
            className="text-white/30 hover:text-osint-cyan transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={-MAX_OFFSET}
            max={MAX_OFFSET}
            step={600000} // 10 minute steps
            value={timeOffset}
            onChange={(e) => setTimeOffset(parseInt(e.target.value))}
            className="flex-1 accent-osint-cyan bg-white/10 h-1 appearance-none cursor-pointer"
          />

          <button 
            onClick={() => setTimeOffset(Math.min(MAX_OFFSET, timeOffset + 3600000))}
            className="text-white/30 hover:text-osint-cyan transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-between mt-1 text-[8px] font-mono text-white/20 uppercase tracking-tighter">
          <span>-24H</span>
          <button 
            onClick={handleReset}
            className="hover:text-osint-cyan transition-colors"
          >
            Real Time
          </button>
          <span>+24H</span>
        </div>
      </div>
    </div>
  );
}
