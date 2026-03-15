import * as satellite from 'satellite.js';

// The worker cannot return Cesium Cartesian3 objects directly because they contain functions.
// It will return raw numbers, and the main thread will construct Cartesian3 if needed.
// It also cannot pass the complex satellite.SatRec object back and forth efficiently,
// so we will initialize the worker with the TLE strings and keep the SatRec state here.

interface SatState {
   id: string;
   satrec: satellite.SatRec;
}

let satellites: SatState[] = [];

self.onmessage = (e: MessageEvent) => {
   const { type, payload } = e.data;

   if (type === 'INIT') {
      const { tles } = payload;
      satellites = parseTLE(tles);
      self.postMessage({ type: 'INIT_DONE', count: satellites.length });
   } 
   else if (type === 'CALC_POSITIONS') {
      const { timeMs } = payload;
      const date = new Date(timeMs);
      const positions = new Float32Array(satellites.length * 3);
      const visibilities = new Uint8Array(satellites.length);
      
      const gmst = satellite.gstime(date);

      for (let i = 0; i < satellites.length; i++) {
         const posVel = satellite.propagate(satellites[i].satrec, date);
         
         if (posVel && posVel.position && typeof posVel.position !== 'boolean') {
            const positionEci = posVel.position as satellite.EciVec3<number>;
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);
            const height = positionGd.height * 1000;
            
            if (!isNaN(positionGd.longitude) && !isNaN(positionGd.latitude) && !isNaN(height)) {
               // We need radians to pass back to Cesium.Cartesian3.fromRadians in the main thread
               // Or we can construct Cartesian3 mathematically here to save main thread time?
               // The exact math for Cartesian3 is: 
               // Too complex to rewrite. Returning radians is the most standard approach.
               positions[i*3] = positionGd.longitude;
               positions[i*3+1] = positionGd.latitude;
               positions[i*3+2] = height;
               visibilities[i] = 1;
               continue;
            }
         }
         visibilities[i] = 0;
      }

      // Transferrable objects are extremely fast
      // Transferrable objects are extremely fast
      const msg = { type: 'POSITIONS_RESULT', positions, visibilities };
      (self as unknown as Worker).postMessage(msg, [positions.buffer, visibilities.buffer]);
   }
};

function parseTLE(tleData: string): SatState[] {
  const lines = tleData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const sats: SatState[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;
    
    const tleLine1 = lines[i + 1];
    const tleLine2 = lines[i + 2];

    try {
      const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
      if (satrec && satrec.satnum) {
        sats.push({
          id: satrec.satnum,
          satrec: satrec,
        });
      }
    } catch {
       // Ignore
    }
  }
  
  return sats;
}
