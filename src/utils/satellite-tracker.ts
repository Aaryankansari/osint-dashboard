import * as satellite from 'satellite.js';
import * as Cesium from 'cesium';

// Use a highly populated active satellite list from CelesTrak (Active satellites)
const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

export interface SatelliteRecord {
  id: string;
  name: string;
  satrec: satellite.SatRec;
}

export async function fetchSatelliteData(): Promise<SatelliteRecord[]> {
  try {
    const response = await fetch(CELESTRAK_URL);
    if (!response.ok) throw new Error('Failed to fetch TLE data');
    const tleText = await response.text();
    return parseTLE(tleText);
  } catch (error) {
    console.error("Error fetching satellite data, using mock fallback:", error);
    return parseTLE(MOCK_TLE);
  }
}

const MOCK_TLE = `ISS (ZARYA)
1 25544U 98067A   21121.52590278 -.00000671  00000-0 -22822-4 0  9997
2 25544  51.6443  60.8122 0003204 132.8447  15.1539 15.48957448281133
HUBBLE SPACE TELESCOPE
1 20580U 90037B   21121.46494213  .00000639  00000-0  30043-4 0  9990
2 20580  28.4697 296.6575 0002821 217.4728 171.1663 15.06012461427814
`;

function parseTLE(tleData: string): SatelliteRecord[] {
  const lines = tleData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const satellites: SatelliteRecord[] = [];

  // TLE is in 3 lines: Name, Line 1, Line 2
  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;
    
    const name = lines[i];
    const tleLine1 = lines[i + 1];
    const tleLine2 = lines[i + 2];

    try {
      const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
      // Ensure the satellite math is valid
      if (satrec && satrec.satnum) {
        satellites.push({
          id: satrec.satnum,
          name: name,
          satrec: satrec,
        });
      }
    } catch {
      // Ignore invalid TLE math
    }
  }
  
  return satellites;
}

// Calculate position for a given time
export function getSatellitePosition(satrec: satellite.SatRec, date: Date): Cesium.Cartesian3 | null {
  const positionAndVelocity = satellite.propagate(satrec, date);
  if (!positionAndVelocity || !positionAndVelocity.position) return null;
  const positionEci = positionAndVelocity.position;

  if (typeof positionEci !== 'boolean' && positionEci) {
    const gmst = satellite.gstime(date);
    const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);

    const longitude = positionGd.longitude;
    const latitude = positionGd.latitude;
    const height = positionGd.height * 1000; // Convert km to meters

    if (isNaN(longitude) || isNaN(latitude) || isNaN(height)) {
        return null; // Ignore unstable computations
    }

    return Cesium.Cartesian3.fromRadians(longitude, latitude, height);
  }
  return null;
}
