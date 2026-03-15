import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Orbit, Ship, X, Command } from 'lucide-react';
import type { TargetData } from '../store';
import { useAppStore } from '../store';
import { fetchSatelliteData } from '../utils/satellite-tracker';
import { fetchFlightData } from '../utils/flight-tracker';
import { fetchShipData } from '../utils/ship-tracker';

interface SearchResult extends TargetData {
  layer: string;
}

export default function CommandPalette() {
  const { isSearchOpen, toggleSearch, setSelectedTarget, layers } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isSearchOpen]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      
      if (e.key === 'Escape' && isSearchOpen) {
        toggleSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, toggleSearch]);

  // Handle search logic
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      const q = query.toLowerCase();
      const allResults: SearchResult[] = [];

      try {
        // Search Satellites
        if (layers.satellites) {
          const satsData = await fetchSatelliteData();
          const matches = satsData.satellites
            .filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q))
            .slice(0, 5)
            .map(s => ({
              id: s.id,
              name: s.name,
              type: 'satellite' as const,
              layer: 'Satellite',
              data: {
                 norad_id: s.id,
              }
            }));
          allResults.push(...matches);
        }

        // Search Flights
        if (layers.flights) {
          const flights = await fetchFlightData();
          const matches = flights
            .filter(f => (f.callsign && f.callsign.toLowerCase().includes(q)))
            .slice(0, 5)
            .map(f => ({
              id: `${f.lat.toFixed(2)},${f.lon.toFixed(2)}`,
              name: f.callsign || `FLT-UNKNOWN`,
              type: 'flight' as const,
              layer: 'Flight (ADS-B)',
              data: {
                 callsign: f.callsign || 'N/A',
                 altitude: `${Math.round(f.altitude || 0)}m`,
                 velocity: `${Math.round(f.velocity || 0)}m/s`,
                 origin_country: f.origin_country || 'Unknown'
              }
            }));
          allResults.push(...matches);
        }

        // Search Ships
        if (layers.ships) {
            const ships = await fetchShipData();
            const matches = ships
              .filter(s => (s.id && s.id.toLowerCase().includes(q)) || (s.mmsi && s.mmsi.toString().includes(q)))
              .slice(0, 5)
              .map(s => ({
                id: s.mmsi.toString(),
                name: s.id || `MMSI-${s.mmsi}`,
                type: 'ship' as const,
                layer: 'Ship (AIS)',
                data: {
                  mmsi: s.mmsi,
                  speed: `${s.speed ? s.speed.toFixed(1) : 0} knots`
                }
              }));
            allResults.push(...matches);
        }

      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setResults(allResults);
        setSelectedIndex(0);
        setIsSearching(false);
      }
    }, 300); // debounce

    return () => clearTimeout(searchTimeout);
  }, [query, layers]);

  // Handle keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    // Determine type for correct layer activation if needed, but assuming user searches active layers.
    setSelectedTarget(result);
    toggleSearch(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'satellite': return <Orbit className="w-4 h-4 text-cyan-400" />;
      case 'flight': return <Navigation className="w-4 h-4 text-emerald-400" />;
      case 'ship': return <Ship className="w-4 h-4 text-blue-400" />;
      case 'earthquake': return <MapPin className="w-4 h-4 text-rose-400" />;
      default: return <MapPin className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-auto bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0 -z-10" 
        onClick={() => toggleSearch(false)}
      />
      
      <div className="w-full max-w-xl bg-black/80 border border-osint-cyan/30 shadow-[0_0_40px_rgba(0,255,255,0.1)] overflow-hidden flex flex-col relative before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.05),transparent_50%)] pointer-events-auto">
        
        {/* Header / Input */}
        <div className="flex items-center p-3 sm:p-4 border-b border-osint-cyan/20 bg-black/40">
          <Search className={`w-5 h-5 mr-3 ${isSearching ? 'text-osint-cyan animate-pulse' : 'text-osint-cyan/50'}`} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white text-base sm:text-lg placeholder-white/20 font-mono tracking-wide"
            placeholder="Search targets, flights, satellites..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white/40 ml-3">
             <Command className="w-3 h-3" /> <span className="text-[11px]">K</span>
          </div>
          <button onClick={() => toggleSearch(false)} className="ml-2 sm:ml-4 text-white/30 hover:text-white/80 p-1">
             <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
          {query.length > 0 && query.length < 2 ? (
            <div className="p-4 sm:p-6 text-center text-sm text-white/30 font-mono">
              Keep typing...
            </div>
          ) : results.length === 0 && query.length >= 2 && !isSearching ? (
             <div className="p-4 sm:p-6 text-center text-sm text-white/30 font-mono flex flex-col items-center gap-2">
                <Search className="w-8 h-8 opacity-20" />
                No active targets found for '{query}'
             </div>
          ) : (
            <div className="flex flex-col p-2 gap-1 font-mono">
              {results.map((result, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-3 text-left transition-all duration-150 border-l-2 outline-none
                      ${isSelected 
                        ? 'bg-osint-cyan/10 border-osint-cyan shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]' 
                        : 'bg-transparent border-transparent hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                       <div className={`p-1.5 rounded bg-black/50 border ${isSelected ? 'border-osint-cyan/30' : 'border-white/10'}`}>
                          {getIcon(result.type)}
                       </div>
                       <div className="flex flex-col min-w-0">
                          <span className={`text-sm truncate font-bold tracking-wide ${isSelected ? 'text-osint-cyan text-glow-cyan' : 'text-white/80'}`}>
                            {result.name}
                          </span>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 max-w-full truncate">
                             {result.layer} // ID: {result.id}
                          </span>
                       </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-white/30">
                       {result.type === 'flight' && result.data.altitude && (
                          <span>ALT: {result.data.altitude}</span>
                       )}
                       {result.type === 'ship' && result.data.speed && (
                          <span>SPD: {result.data.speed}</span>
                       )}
                       {isSelected && (
                          <span className="text-osint-cyan/60 ml-2 animate-pulse">↵ SELECT</span>
                       )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-osint-cyan/20 bg-black/60 flex justify-between items-center text-[9px] text-white/30 font-mono tracking-widest uppercase">
           <div className="flex gap-4 px-2">
              <span className="flex items-center gap-1"><span className="border border-white/20 w-4 h-4 flex items-center justify-center rounded-[2px]">↑</span><span className="border border-white/20 w-4 h-4 flex items-center justify-center rounded-[2px]">↓</span> to navigate</span>
              <span className="flex items-center gap-1"><span className="border border-white/20 px-1 rounded-[2px]">ENTER</span> to select</span>
           </div>
           {isSearching && <span className="text-osint-cyan/50 pr-2">Scanning signals...</span>}
        </div>
      </div>
    </div>
  );
}
