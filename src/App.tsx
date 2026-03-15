import React, { useCallback } from 'react';
import Globe from './components/Globe';
import HelpOverlay from './components/HelpOverlay';
import AlertFeed from './components/AlertFeed';
import CommandPalette from './components/CommandPalette';
import TimelineOverlay from './components/TimelineOverlay';
import { useAppStore } from './store';
import type { ShaderMode, LayerKey } from './store';
import './App.css';
import {
  Activity, ShieldAlert, MonitorPlay, Satellite, Plane,
  Eye, Ship, Target, X, CloudRain, Zap, Signal, Hash,
  HelpCircle, Menu, Clock
} from 'lucide-react';

// Layer configuration — single source of truth
const LAYER_CONFIG = [
  { key: 'satellites' as LayerKey, label: 'Satellites (TLE)', icon: Satellite, shortcut: '1' },
  { key: 'flights' as LayerKey, label: 'Flights (ADS-B)', icon: Plane, shortcut: '2' },
  { key: 'earthquakes' as LayerKey, label: 'Earthquakes (USGS)', icon: Activity, shortcut: '3' },
  { key: 'ships' as LayerKey, label: 'Ships (AIS)', icon: Ship, shortcut: '4' },
  { key: 'weather' as LayerKey, label: 'Weather (RADAR)', icon: CloudRain, shortcut: '5' },
] as const;

const SHADERS: ShaderMode[] = ['NORMAL', 'CRT', 'NVG', 'FLIR'];

// Utility: format seconds ago from a timestamp
function formatSyncAge(ts: number): string {
  if (ts === 0) return '';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ago`;
}

function App() {
  const {
    shaderMode, setShaderMode,
    layers, layerStats, layerLastSync, toggleLayer,
    selectedTarget, clearSelectedTarget,
    toggleHelp, showMobilePanel, toggleMobilePanel,
    toggleSearch,
  } = useAppStore();

  // Initialize random location safely in state
  const [locationText] = React.useState(() =>
    `LOC: ${(Math.random() * 90).toFixed(4)}N ${(Math.random() * 180).toFixed(4)}W`
  );

  const [timeText, setTimeText] = React.useState('');
  const [uptimeText, setUptimeText] = React.useState('');
  // Force re-render to update "Xs ago" text
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const now = new Date();
      setTimeText(now.toISOString().replace('T', ' ').substring(0, 19) + 'Z');
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setUptimeText(`${m}:${s}`);
      setTick(t => t + 1); // Update sync age display
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts for layer toggles (1-5) and help (?)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleSearch();
      return;
    }

    const layerIndex = parseInt(e.key) - 1;
    if (layerIndex >= 0 && layerIndex < LAYER_CONFIG.length) {
      toggleLayer(LAYER_CONFIG[layerIndex].key);
    } else if (e.key === '?') {
      toggleHelp();
    }
  }, [toggleLayer, toggleHelp, toggleSearch]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Calculate totals
  const totalFeeds = Object.values(layerStats).reduce((sum, v) => sum + v, 0);
  const activeLayers = Object.values(layers).filter(Boolean).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-mono antialiased">
      <Globe />
      <HelpOverlay />
      <CommandPalette />

      {/* ============ HUD CORNER BRACKETS ============ */}
      <div className="absolute inset-0 pointer-events-none z-20 p-3">
        <div className="hud-corner hud-corner--tl animate-bracket-flash" />
        <div className="hud-corner hud-corner--tr animate-bracket-flash" style={{ animationDelay: '0.3s' }} />
        <div className="hud-corner hud-corner--bl animate-bracket-flash" style={{ animationDelay: '0.6s' }} />
        <div className="hud-corner hud-corner--br animate-bracket-flash" style={{ animationDelay: '0.9s' }} />
      </div>

      {/* ============ CENTRAL RETICLE ============ */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
          </div>
          <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-spin-slow" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 -mt-0.5 -ml-0.5 bg-cyan-400/30 rounded-full" />
        </div>
      </div>

      {/* ============ MOBILE HAMBURGER ============ */}
      <button
        onClick={toggleMobilePanel}
        className="lg:hidden fixed top-4 left-4 z-50 pointer-events-auto p-2 border border-osint-cyan/30 bg-black/80 backdrop-blur-lg text-osint-cyan hover:bg-osint-cyan/10 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ============ HUD UI OVERLAY ============ */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 flex flex-col justify-between p-4">

        {/* ─── TOP HEADER ─── */}
        <header className="flex items-center justify-between border-b pb-3 border-osint-cyan/20 animate-slide-up">
          <div className="flex flex-col">
            <h1 className="text-osint-cyan text-lg sm:text-xl md:text-2xl font-bold tracking-widest text-glow-cyan flex items-center gap-2 animate-glitch title-decoration">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">WORLDVIEW // PANOPTICON</span><span className="sm:hidden">PANOPTICON</span>
            </h1>
            <span className="text-[9px] sm:text-[10px] md:text-xs text-osint-cyan/40 tracking-[0.2em] mt-1">
              GEO-SPATIAL INTELLIGENCE // OSINT-LINK
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex flex-col items-end text-[10px] text-osint-cyan/40 tracking-[0.15em]">
                <span>REC {timeText}</span>
                <span className="text-[9px] text-white/30">UPTIME {uptimeText}</span>
              </div>
              <div className="px-2 sm:px-3 py-1.5 flex items-center gap-2 border border-osint-green/40 text-osint-green text-[10px] bg-osint-green/5 shadow-[0_0_15px_rgba(57,255,20,0.08)]">
                <Activity className="w-3 h-3 animate-pulse" />
                <span className="text-glow-green">ONLINE</span>
              </div>
            </div>
            <div className="hidden sm:block text-[9px] text-white/30 tracking-widest">
              {locationText} // FEEDS: {totalFeeds}
            </div>
          </div>
        </header>

        {/* ─── MAIN BODY LAYOUT ─── */}
        <main className="flex-1 flex justify-between items-stretch my-4 gap-4">

          {/* ──── LEFT PANEL: Data Layers ──── */}
          {/* On mobile: controlled by showMobilePanel, on lg+: always visible */}
          <aside className={`
            ${showMobilePanel ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'}
            transition-all duration-300 ease-out
            fixed lg:relative top-16 lg:top-auto left-0 lg:left-auto z-40 lg:z-auto
            w-64 border border-osint-cyan/20 bg-black/85 lg:bg-black/70 backdrop-blur-xl p-4 pointer-events-auto h-fit max-h-[calc(100vh-120px)] overflow-y-auto shadow-[0_0_25px_rgba(0,255,255,0.04)] scanline-overlay animate-slide-left
          `}>
            {/* Panel HUD corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-osint-cyan/40" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-osint-cyan/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-osint-cyan/40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-osint-cyan/40" />

            <h2 className="text-xs text-osint-cyan/70 mb-4 font-bold uppercase border-b border-osint-cyan/15 pb-2 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <Signal className="w-3 h-3" />
                Data Streams
              </span>
              <span className="text-[9px] text-osint-cyan/40 font-normal">{activeLayers}/5</span>
            </h2>

            <ul className="text-xs space-y-1 text-white/70">
              {LAYER_CONFIG.map((layer) => {
                const Icon = layer.icon;
                const isActive = layers[layer.key];
                const count = layerStats[layer.key];
                const isWeather = layer.key === 'weather';
                const syncAge = formatSyncAge(layerLastSync[layer.key]);

                return (
                  <li
                    key={layer.key}
                    onClick={() => toggleLayer(layer.key)}
                    className={`layer-item flex items-center gap-2 cursor-pointer transition-all duration-200 relative ${isActive ? 'layer-active text-white' : 'opacity-50 hover:opacity-75'}`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-osint-cyan' : 'text-white/40'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px]">{layer.label}</div>
                      {isActive && syncAge && (
                        <div className="text-[8px] text-white/25 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2 h-2" />
                          synced {syncAge}
                        </div>
                      )}
                    </div>
                    <span className="kbd-hint">{layer.shortcut}</span>
                    {isActive && !isWeather && count > 0 ? (
                      <span className="text-[9px] text-osint-green border border-osint-green/30 px-1.5 py-0.5 bg-osint-green/10 text-glow-green min-w-[28px] text-center">
                        {count}
                      </span>
                    ) : isActive && isWeather ? (
                      <span className="text-[9px] text-osint-cyan border border-osint-cyan/30 px-1.5 py-0.5 bg-osint-cyan/10 animate-pulse min-w-[28px] text-center">LIVE</span>
                    ) : isActive ? (
                      <span className="text-[9px] text-osint-amber border border-osint-amber/30 px-1.5 py-0.5 animate-pulse min-w-[28px] text-center">SYNC</span>
                    ) : (
                      <span className="text-[9px] text-white/20 border border-white/10 px-1.5 py-0.5 min-w-[28px] text-center">OFF</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Mini radar element */}
            <div className="mt-5 pt-4 border-t border-osint-cyan/15 flex items-center gap-3">
              <div className="radar-container flex-shrink-0">
                <div className="radar-ring" style={{ width: '33%', height: '33%' }} />
                <div className="radar-ring" style={{ width: '66%', height: '66%' }} />
                <div className="absolute top-1/2 left-1/2 w-1 h-1 -mt-0.5 -ml-0.5 bg-osint-cyan/60 rounded-full" />
              </div>
              <div className="flex flex-col text-[9px] text-white/30 tracking-wider">
                <span>SCAN ACTIVE</span>
                <span className="text-osint-green/60 text-glow-green">{totalFeeds} TARGETS</span>
                <span className="text-white/20 mt-1">{activeLayers} FEEDS ONLINE</span>
              </div>
            </div>

            {/* Help hint */}
            <div className="mt-4 pt-3 border-t border-osint-cyan/10 flex items-center justify-center gap-1.5 text-[9px] text-white/20 cursor-pointer hover:text-osint-cyan/40 transition-colors" onClick={toggleHelp}>
              <HelpCircle className="w-3 h-3" />
              Press <kbd className="px-1 border border-white/15 text-[8px]">?</kbd> for shortcuts
            </div>
          </aside>

          {/* ──── RIGHT PANEL: Threat Intel ──── */}
          <aside className={`hidden lg:flex w-72 border bg-black/70 backdrop-blur-xl p-4 pointer-events-auto h-fit max-h-[calc(100vh-140px)] overflow-y-auto shadow-[0_0_25px_rgba(255,0,0,0.04)] flex-col transition-all duration-500 animate-slide-right relative scanline-overlay ${
            selectedTarget
              ? 'border-osint-cyan/40 target-lock-active'
              : 'border-red-500/20'
          }`}>
            {/* HUD corners */}
            <div className={`absolute top-0 left-0 w-3 h-3 border-t border-l ${selectedTarget ? 'border-osint-cyan/60 animate-bracket-flash' : 'border-red-500/30'}`} />
            <div className={`absolute top-0 right-0 w-3 h-3 border-t border-r ${selectedTarget ? 'border-osint-cyan/60 animate-bracket-flash' : 'border-red-500/30'}`} />
            <div className={`absolute bottom-0 left-0 w-3 h-3 border-b border-l ${selectedTarget ? 'border-osint-cyan/60 animate-bracket-flash' : 'border-red-500/30'}`} />
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r ${selectedTarget ? 'border-osint-cyan/60 animate-bracket-flash' : 'border-red-500/30'}`} />

            <h2 className={`text-xs mb-3 font-bold uppercase border-b pb-2 flex justify-between items-center ${
              selectedTarget
                ? 'text-osint-cyan/80 border-osint-cyan/20'
                : 'text-red-500/60 border-red-500/15'
            }`}>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" />
                Threat Intel
              </span>
              <span className={`text-[9px] font-normal px-1.5 py-0.5 border ${
                selectedTarget
                  ? 'border-osint-cyan/30 text-osint-cyan/60 bg-osint-cyan/5'
                  : 'border-red-500/20 text-red-500/40'
              }`}>
                {selectedTarget ? 'LOCKED' : 'MONITORING'}
              </span>
            </h2>

            {!selectedTarget ? (
              /* ─── LIVE ALERT FEED when no target selected ─── */
              <AlertFeed />
            ) : (
              <div className="flex flex-col gap-3">
                {/* Target Header */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-osint-cyan font-bold tracking-widest text-sm uppercase text-glow-cyan">
                      <Target className="w-4 h-4 animate-pulse" />
                      TARGET LOCK
                    </div>
                    <span className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />
                      {selectedTarget.type.toUpperCase()} // {selectedTarget.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={clearSelectedTarget}
                    className="text-white/30 hover:text-red-400 hover:rotate-90 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Target Name */}
                <div className="text-lg font-bold bg-osint-cyan/5 text-osint-cyan py-2 px-3 border border-osint-cyan/20 break-all relative overflow-hidden">
                  {selectedTarget.name}
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-osint-cyan/40 to-transparent" />
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Object.entries(selectedTarget.data).map(([key, value]) => (
                    <div key={key} className="flex flex-col bg-white/[0.03] p-2 border border-white/[0.04] hover:border-osint-cyan/20 transition-colors group">
                      <span className="text-osint-cyan/40 text-[8px] uppercase tracking-[0.15em] mb-1 group-hover:text-osint-cyan/60 transition-colors">{key}</span>
                      <span className="text-white/80 font-medium truncate text-[11px]" title={String(value)}>
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-1 pt-2 border-t border-osint-cyan/15 flex justify-between items-center text-[9px] text-white/30">
                  <div className="flex items-center gap-1.5">
                    <span className="stats-dot stats-dot--live" />
                    TRACKING ACTIVE
                  </div>
                  <span className="text-white/20">SYS_COORD_LNK</span>
                </div>
              </div>
            )}
          </aside>
        </main>

        {/* ─── BOTTOM CONSOLE ─── */}
        <footer className="pointer-events-auto flex flex-col items-center gap-3 animate-slide-up pb-2">
          {/* Simulation Timeline (Integrated) */}
          <TimelineOverlay />

          <div className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-md border border-osint-cyan/10 p-2 sm:p-3 w-full max-w-[600px] shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-osint-cyan/20 to-transparent" />
            
            {/* Stats ticker */}
            <div className="hidden sm:flex items-center gap-1 text-[9px] text-white/30 tracking-[0.1em] mb-1">
              <Zap className="w-3 h-3 text-osint-cyan/40" />
              <div className="stats-ticker">
                {LAYER_CONFIG.map((layer) => {
                  const isActive = layers[layer.key];
                  const count = layerStats[layer.key];
                  return (
                    <div key={layer.key} className="stats-ticker-item">
                      <span className={`stats-dot ${isActive ? 'stats-dot--live' : 'stats-dot--idle'}`} />
                      <span className={isActive ? 'text-white/50' : 'text-white/20'}>
                        {layer.key.toUpperCase()}: {isActive ? (count > 0 ? count : '...') : 'OFF'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shader mode selector */}
            <div className="flex border border-osint-cyan/30 bg-black/40 p-0.5 gap-0.5">
              <div className="px-2 flex items-center border-r border-osint-cyan/15 mr-1">
                <MonitorPlay className="w-3 h-3 text-osint-cyan/40" />
              </div>
              {SHADERS.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setShaderMode(mode)}
                  className={`shader-btn px-3 sm:px-4 py-1 text-[10px] sm:text-[11px] tracking-wider transition-all duration-300
                    ${shaderMode === mode
                      ? 'bg-osint-cyan/15 text-osint-cyan border-b-2 border-osint-cyan shadow-[inset_0_-2px_12px_rgba(0,255,255,0.15)] font-bold text-glow-cyan'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03] border-b-2 border-transparent'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* ============ DECORATIVE HUD ELEMENTS ============ */}
      <div className="absolute inset-0 pointer-events-none z-5">
        {/* Left scale */}
        <div className="hidden md:flex absolute top-[18%] left-5 w-1 h-36 border-l border-white/10 flex-col justify-between py-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={`h-px bg-white/15 ${i % 2 === 0 ? 'w-3' : 'w-1.5'}`} />
              {i % 2 === 0 && (
                <span className="text-[7px] text-white/10 ml-1">{(80 - i * 10)}</span>
              )}
            </div>
          ))}
        </div>
        {/* Right scale */}
        <div className="hidden md:flex absolute top-[55%] right-5 w-1 h-36 border-r border-white/10 flex-col justify-between py-1 items-end">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center">
              {i % 2 === 0 && (
                <span className="text-[7px] text-white/10 mr-1">{(40 - i * 5)}</span>
              )}
              <div className={`h-px bg-white/15 ${i % 2 === 0 ? 'w-3' : 'w-1.5'}`} />
            </div>
          ))}
        </div>
        {/* Bottom-left coordinates */}
        <div className="hidden md:flex absolute bottom-20 left-5 text-[8px] text-white/10 tracking-widest flex-col gap-0.5">
          <span>AZ: 127.4° // EL: 34.2°</span>
          <span>RNG: 35,786 km</span>
        </div>

      </div>

      {/* ============ MOBILE PANEL BACKDROP ============ */}
      {showMobilePanel && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-35 pointer-events-auto" onClick={toggleMobilePanel} />
      )}

      {/* ============ CRT SCANLINE OVERLAY ============ */}
      {shaderMode === 'CRT' && (
        <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
      )}
    </div>
  );
}

export default App;
