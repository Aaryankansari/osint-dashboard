import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { fetchEarthquakeData } from '../utils/earthquake-tracker';
import type { EarthquakeRecord } from '../utils/earthquake-tracker';
import { useAppStore } from '../store';

interface EarthquakeLayerProps {
  viewer: Cesium.Viewer | null;
}

export default function EarthquakeLayer({ viewer }: EarthquakeLayerProps) {
  const [earthquakes, setEarthquakes] = useState<EarthquakeRecord[]>([]);
  const pointCollection = useRef<Cesium.PointPrimitiveCollection | null>(null);
  
  const isActive = useAppStore(state => state.layers.earthquakes);
  const updateLayerStats = useAppStore(state => state.updateLayerStats);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const stats = await fetchEarthquakeData();
      if (isMounted) {
        setEarthquakes(stats);
        updateLayerStats('earthquakes', stats.length);
      }
    };
    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, [updateLayerStats]);

  // Manage Cesium Rendering Lifecycle
  useEffect(() => {
    if (!viewer || !isActive || earthquakes.length === 0) {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
      return;
    }

    pointCollection.current = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    
    earthquakes.forEach((eq) => {
      const [lon, lat] = eq.coordinates;
      // USGS depth is in km, convert to meters. We make them render slightly above ground or negative to show through globe?
      // For visibility on the tactical HUD, we place them right on the surface.
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);

      // Color mapping based on magnitude (yellow -> orange -> red)
      let color = Cesium.Color.YELLOW;
      if (eq.magnitude >= 5.0) color = Cesium.Color.RED;
      else if (eq.magnitude >= 4.0) color = Cesium.Color.ORANGE;

      // Size based on magnitude
      const pixelSize = Math.max(5, eq.magnitude * 3);

      pointCollection.current!.add({
        position: position,
        color: color.withAlpha(0.7),
        pixelSize: pixelSize,
        outlineColor: color,
        outlineWidth: 2,
        id: {
          id: eq.id,
          name: eq.place,
          type: 'earthquake',
          data: {
            magnitude: eq.magnitude,
            time: new Date(eq.time).toLocaleString(),
            lat: lat.toFixed(4),
            lon: lon.toFixed(4)
          }
        }
      });
    });

    // Request a single render frame since it's static data
    viewer.scene.requestRender();

    return () => {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
    };
  }, [viewer, earthquakes, isActive]);

  return null;
}
