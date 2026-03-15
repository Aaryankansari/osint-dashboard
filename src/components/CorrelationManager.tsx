import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useAppStore } from '../store';

interface CorrelationManagerProps {
  viewer: Cesium.Viewer | null;
}

export default function CorrelationManager({ viewer }: CorrelationManagerProps) {
  const selectedTarget = useAppStore(state => state.selectedTarget);
  const polylines = useRef<Cesium.PolylineCollection | null>(null);

  useEffect(() => {
    if (!viewer) return;

    if (!polylines.current) {
        polylines.current = viewer.scene.primitives.add(new Cesium.PolylineCollection());
    }

    const collection = polylines.current;
    if (collection) {
        collection.removeAll();
    }

    if (!selectedTarget || !collection) return;

    // We only correlate if we have a position for the selected target
    // Selected target in our store can be a primitive object with a position
    let targetPos: Cesium.Cartesian3 | undefined;
    
    // Check primitives (Flights/Sats/Ships)
    // We search for the primitive that matches the ID to get its current position
    const primitives = viewer.scene.primitives;
    for (let i = 0; i < primitives.length; i++) {
        const p = primitives.get(i);
        if (p instanceof Cesium.PointPrimitiveCollection || p instanceof Cesium.BillboardCollection) {
            for (let j = 0; j < p.length; j++) {
                const item = p.get(j);
                if (item.id && item.id.id === selectedTarget.id) {
                    targetPos = item.position;
                    break;
                }
            }
        }
        if (targetPos) break;
    }

    // If not found in primitives, check entities (Alerts)
    if (!targetPos) {
        const entity = viewer.entities.getById(selectedTarget.id);
        if (entity && entity.position) {
            targetPos = entity.position.getValue(viewer.clock.currentTime);
        }
    }

    if (!targetPos) return;

    // Find nearby primitives
    // This is a naive O(N) search across visible collections.
    // In a real app we'd use a spatial index, but for ~10k items loop picking is okay for one-off selection.
    const MAX_CORRELATION_DIST = 1000000; // 1000km
    const result: Cesium.Cartesian3[] = [];

    // Search through all primitives in the scene - reusing 'primitives' variable from above
    for (let i = 0; i < primitives.length; i++) {
        const p = primitives.get(i);
        
        // We look for collections of points/billboards
        if (p instanceof Cesium.PointPrimitiveCollection || p instanceof Cesium.BillboardCollection) {
            for (let j = 0; j < p.length; j++) {
                const item = p.get(j);
                // Compare IDs since item is a primitive and selectedTarget is TargetData from store
                if (item.id && item.id.id === selectedTarget.id) continue;
                
                const pos = item.position;
                if (pos && Cesium.Cartesian3.distance(targetPos, pos) < MAX_CORRELATION_DIST) {
                    result.push(pos);
                    if (result.length >= 10) break;
                }
            }
        }
        if (result.length >= 10) break;
    }

    // Draw the lines
    result.forEach(pos => {
        collection.add({
            positions: [targetPos, pos],
            width: 1.5,
            material: Cesium.Material.fromType('PolylineGlow', {
                glowPower: 0.1,
                taperPower: 1,
                color: Cesium.Color.CYAN.withAlpha(0.3)
            })
        });
    });

  }, [viewer, selectedTarget]);

  useEffect(() => {
    return () => {
      if (viewer && polylines.current) {
        viewer.scene.primitives.remove(polylines.current);
        polylines.current = null;
      }
    };
  }, [viewer]);

  return null;
}
