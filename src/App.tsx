import React from 'react';
import Globe from './components/Globe';
import { useAppStore } from './store';
import type { ShaderMode } from './store';
import { Activity, ShieldAlert, MonitorPlay, RadioTower, Satellite, Plane, Eye, Ship, Target, Crosshair, X } from 'lucide-react';

function App() {
  const { shaderMode, setShaderMode, layers, layerStats, toggleLayer, selectedTarget, clearSelectedTarget } = useAppStore();

  const SHADERS: ShaderMode[] = ['NORMAL', 'CRT', 'NVG', 'FLIR'];
  
  // Initialize random location safely in state so it satisfies react-hooks/purity linter
  const [locationText] = React.useState(() => {
    return `LOC: ${(Math.random() * 90).toFixed(4)}N ${(Math.random() * 180).toFixed(4)}W`;
  });

  const [timeText, setTimeText] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeText(`REC ${now.toISOString().replace('T', ' ').substring(0, 19)}Z`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-mono antialiased">
      <Globe />
      
      {/* HUD UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-4 mix-blend-screen">
        
        {/* Top Header */}
        <header className="flex items-center justify-between border-b pb-2 border-osint-cyan/30">
          <div className="flex flex-col">
            <h1 className="text-osint-cyan text-xl md:text-2xl font-bold tracking-widest drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] flex items-center gap-2">
              <Eye className="w-6 h-6" /> WORLDVIEW // PANOPTICON
            </h1>
            <span className="text-[10px] md:text-xs text-osint-cyan/60 tracking-[0.2em]">TOP SECRET // SI-TK // NOFORN</span>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-osint-cyan/50 tracking-[0.2em]">{timeText}</span>
              <div className="px-3 py-1 flex items-center gap-2 border border-osint-green/50 text-osint-green text-[10px] bg-osint-green/10 shadow-[0_0_10px_rgba(57,255,20,0.1)]">
                <Activity className="w-3 h-3 animate-pulse" />
                SYS_STAT: ONLINE
              </div>
            </div>
            <div className="text-[10px] text-white/50 tracking-widest mt-1">
              {locationText}
            </div>
          </div>
        </header>

        {/* Main Body Layout */}
        <main className="flex-1 flex justify-between pr-4 items-stretch my-4">
          
          {/* Left Panel: Layers */}
          <aside className="w-56 md:w-64 border border-osint-cyan/30 bg-black/60 backdrop-blur-md p-4 pointer-events-auto h-fit shadow-[0_0_15px_rgba(0,255,255,0.05)]">
            <h2 className="text-xs text-osint-cyan/80 mb-3 font-bold uppercase border-b border-osint-cyan/20 pb-1 flex justify-between">
              Data Streams
              <RadioTower className="w-3 h-3" />
            </h2>
            <ul className="text-xs space-y-3 mt-4 text-white/70">
              <li 
                onClick={() => toggleLayer('satellites')}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${layers.satellites ? 'text-white' : 'opacity-50'}`}
              >
                <Satellite className="w-4 h-4 text-osint-cyan" />
                <span className="flex-1">Satellites (TLE)</span> 
                {layerStats.satellites > 0 ? (
                  <span className="text-[9px] text-osint-green border border-osint-green/30 px-1 bg-osint-green/10">
                    {layerStats.satellites}
                  </span>
                ) : (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 animate-pulse">SYNC</span>
                )}
              </li>
              <li 
                onClick={() => toggleLayer('flights')}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${layers.flights ? 'text-white' : 'opacity-50'}`}
              >
                <Plane className="w-4 h-4 text-osint-cyan" />
                <span className="flex-1">Flights (ADS-B)</span> 
                {layerStats.flights > 0 ? (
                  <span className="text-[9px] text-osint-green border border-osint-green/30 px-1 bg-osint-green/10">
                    {layerStats.flights}
                  </span>
                ) : layers.flights ? (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 animate-pulse">SYNC</span>
                ) : (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 opacity-50">OFF</span>
                )}
              </li>
              <li 
                onClick={() => toggleLayer('earthquakes')}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${layers.earthquakes ? 'text-white' : 'opacity-50'}`}
              >
                <Activity className="w-4 h-4 text-osint-cyan" />
                <span className="flex-1">Earthquakes</span> 
                {layerStats.earthquakes > 0 ? (
                  <span className="text-[9px] text-osint-green border border-osint-green/30 px-1 bg-osint-green/10">
                    {layerStats.earthquakes}
                  </span>
                ) : layers.earthquakes ? (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 animate-pulse">SYNC</span>
                ) : (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 opacity-50">OFF</span>
                )}
              </li>
              <li 
                onClick={() => toggleLayer('ships')}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${layers.ships ? 'text-white' : 'opacity-50'}`}
              >
                <Ship className="w-4 h-4 text-osint-cyan" />
                <span className="flex-1">Ships (AIS)</span> 
                {layerStats.ships > 0 ? (
                  <span className="text-[9px] text-osint-green border border-osint-green/30 px-1 bg-osint-green/10">
                    {layerStats.ships}
                  </span>
                ) : layers.ships ? (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 animate-pulse">SYNC</span>
                ) : (
                  <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1 opacity-50">OFF</span>
                )}
              </li>
            </ul>
          </aside>

          {/* Right Panel: Alerts and Intel */}
          <aside className="hidden lg:flex w-72 border border-red-500/30 bg-black/60 backdrop-blur-md p-4 pointer-events-auto h-fit shadow-[0_0_15px_rgba(255,0,0,0.05)] flex-col transition-all duration-300">
            <h2 className="text-xs text-red-500/80 mb-3 font-bold uppercase border-b border-red-500/20 pb-1 flex justify-between">
              Threat intel
              <ShieldAlert className="w-3 h-3" />
            </h2>
            
            {!selectedTarget ? (
              <div className="text-[10px] text-red-300 mt-2 opacity-50">
                No active surface threats detected in sector Alpha.
                <br /><br />
                Awaiting manual target selection...
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
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
                    <Crosshair className="w-3 h-3 text-osint-cyan/60" />
                    TRACKING ACTIVE
                  </div>
                  <span className="font-mono">SYS_COORD_LNK</span>
                </div>
              </div>
            )}
          </aside>
        </main>

        {/* Bottom Navigation / Style Selector */}
        <footer className="pointer-events-auto flex justify-center pb-2">
          <div className="flex border border-osint-cyan/40 bg-black/60 backdrop-blur-lg p-1 rounded-sm gap-1 shadow-[0_0_20px_rgba(0,255,255,0.05)]">
            <div className="px-2 flex items-center border-r border-osint-cyan/20 mr-2">
              <MonitorPlay className="w-3 h-3 text-osint-cyan/60" />
            </div>
            {SHADERS.map((mode) => (
              <button
                key={mode}
                onClick={() => setShaderMode(mode)}
                className={`px-4 py-1.5 text-xs tracking-wider transition-all duration-300
                  ${shaderMode === mode 
                    ? 'bg-osint-cyan/20 text-osint-cyan border-b-2 border-osint-cyan shadow-[inset_0_-2px_10px_rgba(0,255,255,0.2)] font-bold' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5 border-b-2 border-transparent'
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </footer>
      </div>

      {/* Decorative HUD Elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-4 w-1 h-32 border-l border-white/20 flex flex-col justify-between py-1">
          {[...Array(5)].map((_, i) => <div key={i} className="w-2 h-px bg-white/20"></div>)}
        </div>
        <div className="absolute top-[60%] right-4 w-1 h-32 border-r border-white/20 flex flex-col justify-between py-1 items-end">
          {[...Array(5)].map((_, i) => <div key={i} className="w-2 h-px bg-white/20"></div>)}
        </div>
      </div>

      {/* Screen CRT Scanline Overlay applied to UI as well */}
      {shaderMode === 'CRT' && (
        <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
      )}
    </div>
  );
}

export default App;
