import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

interface TrafficLayerProps {
  viewer: Cesium.Viewer | null;
}

// A simple Procedural Traffic simulator that places moving particles in a grid
// around a specific major city to simulate heavy traffic flows without needing heavy OSM data.
export default function TrafficLayer({ viewer }: TrafficLayerProps) {
  const particleSystems = useRef<Cesium.ParticleSystem[]>([]);
  
  // We'll tie traffic visibility to a new or existing layer toggle. 
  // For now, let's tie it to 'vehicles' if we had one, or just hardcode it to always on for the demo.
  // Actually, let's just make it always active if the viewer exists, to ensure it shows up.
  const isActive = true;

  useEffect(() => {
    if (!viewer || !isActive) return;

    const scene = viewer.scene;

    // Simulate traffic in a few major tech hubs where 3D Tiles look best
    // NY, SF, London
    const hubs = [
      { lon: -74.0060, lat: 40.7128 }, // NYC
      { lon: -122.4194, lat: 37.7749 }, // SF
      { lon: -0.1276, lat: 51.5072 }    // London
    ];

    hubs.forEach(hub => {
        // Create a fake "highway" grid around the hub
        for(let i=0; i<5; i++) {
           const offsetLon = hub.lon + (Math.random() - 0.5) * 0.1;
           const offsetLat = hub.lat + (Math.random() - 0.5) * 0.1;

           const position = Cesium.Cartesian3.fromDegrees(offsetLon, offsetLat, 10);
           
           // Simulated traffic particle stream (like headlights/taillights on a highway)
           const system = scene.primitives.add(new Cesium.ParticleSystem({
               image: 'https://cesium.com/downloads/cesiumjs/releases/1.106/Build/Cesium/Assets/Textures/particle.png', // Fallback to a basic circle if needed, or just let it use default
               startColor: Cesium.Color.RED.withAlpha(0.8), // Taillights
               endColor: Cesium.Color.YELLOW.withAlpha(0.0),
               startScale: 1.0,
               endScale: 0.0,
               minimumParticleLife: 1.5,
               maximumParticleLife: 3.0,
               minimumSpeed: 5.0, // Moving at ~10mph
               maximumSpeed: 25.0, // Moving at ~50mph
               imageSize: new Cesium.Cartesian2(4, 4),
               emissionRate: 5.0,
               modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
               lifetime: 16.0,
               emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(10.0)),
           }));

           particleSystems.current.push(system);
        }
    });

    return () => {
        if (!viewer.isDestroyed) {
             particleSystems.current.forEach(sys => {
                 viewer.scene.primitives.remove(sys);
             });
        }
        particleSystems.current = [];
    };

  }, [viewer, isActive]);

  return null;
}
