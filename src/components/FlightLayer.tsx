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
  const lineCollection = useRef<Cesium.PolylineCollection | null>(null);
  
  // To draw trails, we need to keep a brief history of positions for each flight
  const flightHistory = useRef<Record<string, Cesium.Cartesian3[]>>({});
  
  const isActive = useAppStore(state => state.layers.flights);
  const updateLayerStats = useAppStore(state => state.updateLayerStats);
  const updateLayerLastSync = useAppStore(state => state.updateLayerLastSync);

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
        updateLayerLastSync('flights');
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
  }, [updateLayerStats, updateLayerLastSync, isActive]);

  // Manage Cesium Rendering Lifecycle
  useEffect(() => {
    if (!viewer || !isActive || flights.length === 0) {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
      if (lineCollection.current && viewer) {
        viewer.scene.primitives.remove(lineCollection.current);
        lineCollection.current = null;
      }
      flightHistory.current = {}; // Clear history when layer is hidden
      return;
    }

    // Always re-create the collections when data updates to prevent stale objects
    if (pointCollection.current) {
      viewer.scene.primitives.remove(pointCollection.current);
    }
    if (lineCollection.current) {
      viewer.scene.primitives.remove(lineCollection.current);
    }

    pointCollection.current = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    lineCollection.current = viewer.scene.primitives.add(new Cesium.PolylineCollection());
    
    // Clean up history for flights that are no longer in the current dataset
    const currentFlightIds = new Set(flights.map(f => f.callsign));
    Object.keys(flightHistory.current).forEach(id => {
       if (!currentFlightIds.has(id)) {
          delete flightHistory.current[id];
       }
    });

    // Determine clustering level based on camera height
    const cameraHeight = viewer.camera.positionCartographic.height;
    const isZoomedOut = cameraHeight > 3000000; // Above 3000km
    const isVeryZoomedOut = cameraHeight > 10000000; // Above 10000km
    
    const points: Cesium.PointPrimitive[] = [];
    flights.forEach((flight, index) => {
      // Clustering Logic: Skip items based on zoom level to declutter
      if (isVeryZoomedOut && index % 10 !== 0) return;
      if (isZoomedOut && index % 3 !== 0) return;

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

      // Update history for trails
      if (!flightHistory.current[flight.callsign]) {
         flightHistory.current[flight.callsign] = [];
      }
      flightHistory.current[flight.callsign].push(position);
      // Keep only last 10 points (~5 minutes of history)
      if (flightHistory.current[flight.callsign].length > 10) {
         flightHistory.current[flight.callsign].shift();
      }

      // Draw trail if we have history
      if (flightHistory.current[flight.callsign].length > 1) {
         lineCollection.current!.add({
            positions: flightHistory.current[flight.callsign],
            width: 2,
            material: Cesium.Material.fromType('Color', {
               color: color.withAlpha(0.3)
            })
         });
      }
    });

    viewer.scene.requestRender();

    return () => {
      if (pointCollection.current && viewer) {
        viewer.scene.primitives.remove(pointCollection.current);
        pointCollection.current = null;
      }
      if (lineCollection.current && viewer) {
        viewer.scene.primitives.remove(lineCollection.current);
        lineCollection.current = null;
      }
    };
  }, [viewer, flights, isActive]);

  return null; 
}
