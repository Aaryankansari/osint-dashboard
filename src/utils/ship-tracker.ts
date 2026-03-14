export interface ShipRecord {
  id: string;
  mmsi: number;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
}

const TRADE_ROUTES = [
  // English Channel
  { center: [50.1, -1.5], radius: 2, count: 150 },
  // Strait of Malacca
  { center: [4.0, 99.0], radius: 3, count: 300 },
  // Suez Canal approaches
  { center: [31.5, 32.5], radius: 1.5, count: 120 },
  // Panama Canal approaches
  { center: [9.0, -79.5], radius: 2, count: 80 },
  // South China Sea
  { center: [15.0, 115.0], radius: 5, count: 400 },
  // US East Coast
  { center: [35.0, -73.0], radius: 5, count: 250 },
  // US West Coast (LA/Long Beach)
  { center: [33.5, -118.5], radius: 1.5, count: 150 },
  // Mediterranean
  { center: [35.0, 18.0], radius: 6, count: 350 },
  // Global scattered
  { center: [0, 0], radius: 180, count: 1000 },
];

export async function fetchShipData(): Promise<ShipRecord[]> {
  // If user provides a real API key in the future, we replace this block
  // with a WebSocket connection to wss://stream.aisstream.io/v0/stream
  
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      const ships: ShipRecord[] = [];
      let idCounter = 1;

      TRADE_ROUTES.forEach(route => {
        for (let i = 0; i < route.count; i++) {
          // Generate random points around the center using standard normal distribution estimation
          const u = Math.random();
          const v = Math.random();
          const w = route.radius * Math.sqrt(u);
          const t = 2 * Math.PI * v;
          const x = w * Math.cos(t);
          const y = w * Math.sin(t);

          ships.push({
            id: `SHIP-${idCounter++}`,
            mmsi: 200000000 + Math.floor(Math.random() * 800000000),
            lat: route.center[0] + x,
            lon: route.center[1] + y,
            heading: Math.random() * 360,
            speed: Math.random() * 30, // knots
          });
        }
      });

      resolve(ships);
    }, 800);
  });
}
