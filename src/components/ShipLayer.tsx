import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { fetchShipData } from '../utils/ship-tracker';
import type { ShipRecord } from '../utils/ship-tracker';
import { useAppStore } from '../store';

interface ShipLayerProps {
  viewer: Cesium.Viewer | null;
}

export default function ShipLayer({ viewer }: ShipLayerProps) {
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const pointCollection = useRef<Cesium.PointPrimitiveCollection | null>(null);
  
  const isActive = useAppStore(state => state.layers.ships);
  const updateLayerStats = useAppStore(state => state.updateLayerStats);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const stats = await fetchShipData();
      if (isMounted) {
        setShips(stats);
        updateLayerStats('ships', stats.length);
      }
    };
    loadData();
    // Refresh every 1 minute
    const interval = setInterval(loadData, 60 * 1000);
    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, [updateLayerStats]);

  // Manage Cesium Rendering Lifecycle
  useEffect(() => {
    if (!viewer || !isActive || ships.length === 0) {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
      return;
    }

    pointCollection.current = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    
    // Create pre-allocated Points for all ships
    const points: Cesium.PointPrimitive[] = [];
    ships.forEach((ship) => {
      // Ships are at sea level (0 meters)
      const position = Cesium.Cartesian3.fromDegrees(ship.lon, ship.lat, 0);
      
      const p = pointCollection.current!.add({
        position: position,
        color: Cesium.Color.DODGERBLUE.withAlpha(0.6),
        pixelSize: 3,
        outlineColor: Cesium.Color.CORNFLOWERBLUE.withAlpha(0.8),
        outlineWidth: 1,
        id: {
          id: ship.id,
          name: ship.id,
          type: 'ship',
          data: {
            mmsi: ship.mmsi,
            speed: `${ship.speed.toFixed(1)} kn`,
            heading: `${ship.heading.toFixed(0)}°`,
          }
        }
      });
      points.push(p);
    });

    viewer.scene.requestRender();

    return () => {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
    };
  }, [viewer, ships, isActive]);

  return null; 
}
