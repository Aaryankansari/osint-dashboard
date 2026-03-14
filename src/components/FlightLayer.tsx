import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { fetchFlightData } from '../utils/flight-tracker';
import type { FlightRecord } from '../utils/flight-tracker';
import { useAppStore } from '../store';

interface FlightLayerProps {
  viewer: Cesium.Viewer | null;
}

export default function FlightLayer({ viewer }: FlightLayerProps) {
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const pointCollection = useRef<Cesium.PointPrimitiveCollection | null>(null);
  
  const isActive = useAppStore(state => state.layers.flights);
  const updateLayerStats = useAppStore(state => state.updateLayerStats);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      // Don't fetch if layer is not active to save API calls, OpenSky is strict
      if (!isActive) return;

      const stats = await fetchFlightData();
      if (isMounted) {
        setFlights(stats);
        updateLayerStats('flights', stats.length);
      }
    };
    
    // Initial load when layer becomes active
    if (isActive) {
      loadData();
    }
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30 * 1000);
    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, [updateLayerStats, isActive]);

  // Manage Cesium Rendering Lifecycle
  useEffect(() => {
    if (!viewer || !isActive || flights.length === 0) {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
      return;
    }

    // Always re-create the collection when data updates to prevent stale objects
    if (pointCollection.current) {
      viewer.scene.primitives.remove(pointCollection.current);
    }

    pointCollection.current = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    
    const points: Cesium.PointPrimitive[] = [];
    flights.forEach((flight) => {
      // Flights are placed at their geometric altitude
      const position = Cesium.Cartesian3.fromDegrees(flight.lon, flight.lat, flight.altitude);
      
      let color = Cesium.Color.ORANGE.withAlpha(0.8);
      let outlineColor = Cesium.Color.DARKORANGE.withAlpha(0.9);
      let pixelSize = 4;

      if (flight.type === 'military') {
        color = Cesium.Color.RED.withAlpha(0.9);
        outlineColor = Cesium.Color.DARKRED;
        pixelSize = 6;
      } else if (flight.type === 'vip') {
        color = Cesium.Color.YELLOW.withAlpha(0.9);
        outlineColor = Cesium.Color.GOLDENROD;
        pixelSize = 5;
      }
      
      const p = pointCollection.current!.add({
        position: position,
        color: color,
        pixelSize: pixelSize,
        outlineColor: outlineColor,
        outlineWidth: 1,
        id: {
          id: flight.callsign,
          name: flight.callsign,
          type: 'flight',
          data: {
            class: flight.type.toUpperCase(),
            origin: flight.origin_country,
            altitude: `${Math.round(flight.altitude)}m`,
            velocity: `${Math.round(flight.velocity)} m/s`,
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
  }, [viewer, flights, isActive]);

  return null; 
}
