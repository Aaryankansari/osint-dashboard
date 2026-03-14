export interface FlightRecord {
  callsign: string;
  origin_country: string;
  lon: number;
  lat: number;
  altitude: number;
  velocity: number;
  heading: number;
  on_ground: boolean;
  type: 'commercial' | 'military' | 'vip';
}

export async function fetchFlightData(): Promise<FlightRecord[]> {
  try {
    // OpenSky Network API. Free tier. No auth needed for public access, but data might be cached/rate-limited.
    // LboundingBox can be used to limit region if needed, but we'll try fetching all to start (it's ~5k-10k flights normally)
    // To avoid massive payloads or hitting rate limits quickly, we might limit the number of planes processed.
    const response = await fetch('https://opensky-network.org/api/states/all');
    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status}`);
    }
    const data = await response.json();
    
    // data.states is an array of arrays.
    // Index mapping (OpenSky State Vector):
    // 0: icao24
    // 1: callsign
    // 2: origin_country
    // 3: time_position
    // 4: last_contact
    // 5: longitude
    // 6: latitude
    // 7: baro_altitude
    // 8: on_ground
    // 9: velocity
    // 10: true_track (heading)
    // 11: vertical_rate
    // 12: sensors
    // 13: geo_altitude
    // 14: squawk
    // 15: spi
    // 16: position_source

    if (!data.states || !Array.isArray(data.states)) {
      return [];
    }

    const flights: FlightRecord[] = [];
    
    // Process only up to 2000 flights to keep rendering smooth and limit data size
    const limit = Math.min(data.states.length, 2000);
    
    for (let i = 0; i < limit; i++) {
      const state = data.states[i];
      // Only include valid airborne positions
      if (
        state[5] !== null && 
        state[6] !== null && 
        state[13] !== null && // use geo_altitude
        state[8] === false    // not on ground
      ) {
        const callsign = state[1] ? state[1].trim() : 'UNKNOWN';
        const altitude = state[13];
        
        // Simulating ADS-B Exchange logic: Identify military or VIP flights
        // Real logic would cross-reference an ICAO hex database. We use heuristics.
        let type: 'commercial' | 'military' | 'vip' = 'commercial';
        
        if (callsign.startsWith('RCH') || callsign.startsWith('AF') || altitude > 13000) {
            type = 'military'; // Reach (USAF), Air Force, or very high altitude
        } else if (callsign.length < 5 || altitude > 12500) {
            type = 'vip'; // Short callsigns often private jets
        }

        flights.push({
          callsign,
          origin_country: state[2] || 'Unknown',
          lon: state[5],
          lat: state[6],
          altitude, 
          velocity: state[9] || 0,
          heading: state[10] || 0,
          on_ground: state[8],
          type
        });
      }
    }

    return flights;
  } catch (error) {
    console.error('Failed to fetch flight data, using mock data:', error);
    return generateMockFlights(500);
  }
}

function generateMockFlights(count: number): FlightRecord[] {
  const flights: FlightRecord[] = [];
  for (let i = 0; i < count; i++) {
    flights.push({
      callsign: `MOCK${i}`,
      origin_country: 'Mock Country',
      lon: (Math.random() - 0.5) * 360,
      lat: (Math.random() - 0.5) * 180,
      altitude: 5000 + Math.random() * 5000,
      velocity: 200 + Math.random() * 100,
      heading: Math.random() * 360,
      on_ground: false,
      type: Math.random() > 0.9 ? 'military' : 'commercial'
    });
  }
  return flights;
}
