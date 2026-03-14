import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { fetchSatelliteData, getSatellitePosition } from '../utils/satellite-tracker';
import type { SatelliteRecord } from '../utils/satellite-tracker';
import { useAppStore } from '../store';

interface SatelliteLayerProps {
  viewer: Cesium.Viewer | null;
}

export default function SatelliteLayer({ viewer }: SatelliteLayerProps) {
  const [satellites, setSatellites] = useState<SatelliteRecord[]>([]);
  const pointCollection = useRef<Cesium.PointPrimitiveCollection | null>(null);
  
  // Track active layer state in store
  const isActive = useAppStore(state => state.layers.satellites);
  const updateLayerStats = useAppStore(state => state.updateLayerStats);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    const loadSatellites = async () => {
      // Wait for fetch
      const stats = await fetchSatelliteData();
      if (isMounted) {
        setSatellites(stats);
        updateLayerStats('satellites', stats.length);
      }
    };
    loadSatellites();
    
    return () => { isMounted = false; };
  }, [updateLayerStats]);

  // Manage Cesium Rendering Lifecycle
  useEffect(() => {
    if (!viewer || !isActive || satellites.length === 0) {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
      return;
    }

    // Initialize high-performance Primitive Collection
    pointCollection.current = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    
    // Create pre-allocated Points for all satellites
    const points: Cesium.PointPrimitive[] = [];
    satellites.forEach((sat) => {
      const p = pointCollection.current!.add({
        position: Cesium.Cartesian3.ZERO,
        color: Cesium.Color.CYAN,
        pixelSize: 2,
        outlineColor: Cesium.Color.DARKCYAN,
        outlineWidth: 1,
        id: {
          id: sat.id,
          name: sat.name,
          type: 'satellite',
          data: {
            norad_id: sat.id,
          }
        }
      });
      points.push(p);
    });

    // 60fps render loop hook
    const onPreRender = () => {
      const now = viewer.clock.currentTime;
      const jsDate = Cesium.JulianDate.toDate(now);
      
      for (let i = 0; i < satellites.length; i++) {
        const pos = getSatellitePosition(satellites[i].satrec, jsDate);
        if (pos) {
          points[i].show = true;
          points[i].position = pos;
        } else {
          points[i].show = false;
        }
      }
    };

    viewer.scene.preRender.addEventListener(onPreRender);

    return () => {
      viewer.scene.preRender.removeEventListener(onPreRender);
      if (pointCollection.current) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
    };
  }, [viewer, satellites, isActive]);

  return null; // Headless component, renders via Cesium primitives
}
