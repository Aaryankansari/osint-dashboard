import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Radio, Shield, Wifi, Inbox } from 'lucide-react';
import { useAppStore } from '../store';

// Simulated SIGINT/OSINT intelligence alerts
const ALERT_MESSAGES = [
  { level: 'HIGH', icon: AlertTriangle, text: 'ELINT intercept detected — Freq: 9.4 GHz, PLR sweep, sector 7G', color: 'text-red-400' },
  { level: 'MED', icon: Radio, text: 'SIGINT — Encrypted burst transmission, bearing 274°, unknown origin', color: 'text-osint-amber' },
  { level: 'LOW', icon: Wifi, text: 'ADS-B anomaly — Squawk 7600 detected, NORDO suspected, en route EGLL', color: 'text-osint-cyan' },
  { level: 'HIGH', icon: Shield, text: 'GEOINT alert — Unusual vessel cluster at 34.05°N 118.25°W  (×8 AIS contacts)', color: 'text-red-400' },
  { level: 'MED', icon: AlertTriangle, text: 'MASINT — Seismic anomaly, non-tectonic origin, Lat 37.7749 Lon -122.4194', color: 'text-osint-amber' },
  { level: 'LOW', icon: Radio, text: 'COMINT — Unencrypted maritime VHF Ch.16 traffic spike, North Sea sector', color: 'text-osint-cyan' },
  { level: 'HIGH', icon: Shield, text: 'OSINT — Satellite imagery delta, new structure detected, classified coords', color: 'text-red-400' },
  { level: 'MED', icon: Wifi, text: 'TECHINT — GPS spoofing detected, area radius 120km, Black Sea region', color: 'text-osint-amber' },
  { level: 'LOW', icon: Inbox, text: 'HUMINT — Field report received, priority ROUTINE, source ALPHA-7', color: 'text-osint-cyan' },
  { level: 'MED', icon: AlertTriangle, text: 'IMINT — Thermal anomaly detected, industrial zone, coord REDACTED', color: 'text-osint-amber' },
  { level: 'LOW', icon: Radio, text: 'FISINT — Foreign instrumentation signal, telemetry burst, low orbit pass', color: 'text-osint-cyan' },
  { level: 'HIGH', icon: Shield, text: 'CYBINT — Port scan detected on critical infrastructure node, origin TOR exit', color: 'text-red-400' },
];

export default function AlertFeed() {
  const [visibleAlerts, setVisibleAlerts] = useState<typeof ALERT_MESSAGES>([]);
  const [alertCounter, setAlertCounter] = useState(0);
  const indexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const addAlert = useAppStore(state => state.addAlert);
  const removeAlert = useAppStore(state => state.removeAlert);

  useEffect(() => {
    // Add a new alert every 8 seconds (slower so it's less chaotic on map)
    const interval = setInterval(() => {
      const alertTemplate = ALERT_MESSAGES[indexRef.current % ALERT_MESSAGES.length];
      setVisibleAlerts(prev => [alertTemplate, ...prev].slice(0, 6)); // Keep max 6
      indexRef.current++;
      setAlertCounter(prev => prev + 1);

      // If it's a high or med priority alert, plot it on the tactical map for correlation
      if (alertTemplate.level === 'HIGH' || alertTemplate.level === 'MED') {
         const id = `alert-${Date.now()}`;
         
         // Extract coords if present, else random near interesting areas
         let lat = (Math.random() - 0.5) * 120; // -60 to 60
         let lon = (Math.random() - 0.5) * 360; // -180 to 180

         if (alertTemplate.text.includes('118.25')) { lat = 34.05; lon = -118.25; }
         else if (alertTemplate.text.includes('122.4194')) { lat = 37.77; lon = -122.41; }

         addAlert({
            id,
            lat,
            lon,
            radius: alertTemplate.level === 'HIGH' ? 500000 : 250000, // meters
            level: alertTemplate.level as 'HIGH' | 'MED',
            timestamp: Date.now()
         });

         // Auto-remove alert from map after 12 seconds
         setTimeout(() => {
            removeAlert(id);
         }, 12000);
      }
    }, 8000);

    // Add first alert immediately
    const firstAlert = ALERT_MESSAGES[0];
    setVisibleAlerts([firstAlert]);
    addAlert({
       id: `alert-first`,
       lat: 34.05,
       lon: -118.25,
       radius: 500000,
       level: 'HIGH',
       timestamp: Date.now()
    });
    setTimeout(() => removeAlert('alert-first'), 12000);
    
    indexRef.current = 1;

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-2 max-h-[280px] overflow-hidden">
      {visibleAlerts.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <div
            key={`${alertCounter}-${i}`}
            className={`flex items-start gap-2 text-[10px] leading-relaxed p-2 border border-white/[0.04] bg-white/[0.02] transition-all duration-500 ${
              i === 0 ? 'animate-slide-left opacity-100' : `opacity-${Math.max(20, 80 - i * 15)}`
            }`}
            style={{ opacity: i === 0 ? 1 : Math.max(0.15, 0.85 - i * 0.15) }}
          >
            <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${alert.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`font-bold tracking-wider text-[8px] px-1 py-px border ${
                  alert.level === 'HIGH' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                  alert.level === 'MED' ? 'border-osint-amber/40 text-osint-amber bg-osint-amber/10' :
                  'border-osint-cyan/40 text-osint-cyan bg-osint-cyan/10'
                }`}>
                  {alert.level}
                </span>
                <span className="text-white/20 text-[8px]">{new Date().toISOString().substring(11, 19)}Z</span>
              </div>
              <span className="text-white/50 break-words">{alert.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
