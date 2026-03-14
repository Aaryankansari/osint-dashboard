// Fetch earthquakes from the last 7 days globally (M2.5+)
const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';

export interface EarthquakeRecord {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  coordinates: [number, number, number]; // [longitude, latitude, depth]
}

export async function fetchEarthquakeData(): Promise<EarthquakeRecord[]> {
  try {
    const response = await fetch(USGS_URL);
    if (!response.ok) throw new Error('Failed to fetch USGS Earthquakes');
    const data = await response.json();
    
    return data.features.map((feature: { id: string, properties: Record<string, unknown>, geometry: { coordinates: [number, number, number] } }) => ({
      id: feature.id,
      magnitude: feature.properties.mag,
      place: feature.properties.place,
      time: feature.properties.time,
      coordinates: feature.geometry.coordinates,
    }));
  } catch (error) {
    console.error("Error fetching earthquake data:", error);
    return [];
  }
}
