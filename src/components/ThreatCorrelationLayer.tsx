import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useAppStore } from '../store';
import type { TargetData } from '../store';

interface ThreatEntity extends Cesium.Entity {
  threatData?: TargetData;
}

interface ThreatCorrelationLayerProps {
  viewer: Cesium.Viewer | null;
}

export default function ThreatCorrelationLayer({ viewer }: ThreatCorrelationLayerProps) {
  const activeAlerts = useAppStore(state => state.activeAlerts);
  const entitiesRef = useRef<Record<string, Cesium.Entity>>({});

  useEffect(() => {
    if (!viewer) return;

    const currentAlertIds = new Set(activeAlerts.map(a => a.id));

    // Remove old alerts
    Object.keys(entitiesRef.current).forEach(id => {
      if (!currentAlertIds.has(id)) {
        viewer.entities.remove(entitiesRef.current[id]);
        delete entitiesRef.current[id];
      }
    });

    // Add or update alerts
    activeAlerts.forEach(alert => {
      if (!entitiesRef.current[alert.id]) {
        const color = alert.level === 'HIGH' ? Cesium.Color.RED : Cesium.Color.ORANGE;
        
        // We use an Entity for easier pulsating ellipse geometry
        const entity = viewer.entities.add({
          id: alert.id,
          position: Cesium.Cartesian3.fromDegrees(alert.lon, alert.lat, 0),
          ellipse: {
            semiMinorAxis: new Cesium.CallbackProperty(() => {
               // Pulsating effect based on time
               const time = Date.now();
               const pulse = (Math.sin(time / 500) + 1) / 2; // 0 to 1
               return alert.radius * 0.5 + (alert.radius * 0.5 * pulse);
            }, false),
            semiMajorAxis: new Cesium.CallbackProperty(() => {
               const time = Date.now();
               const pulse = (Math.sin(time / 500) + 1) / 2;
               return (alert.radius * 0.5 + (alert.radius * 0.5 * pulse)) + 1.0; // Ensure major >= minor
            }, false),
            material: new Cesium.ColorMaterialProperty(
               new Cesium.CallbackProperty(() => {
                  const time = Date.now();
                  const alpha = 0.1 + ((Math.cos(time / 500) + 1) / 4); // 0.1 to 0.6
                  return color.withAlpha(alpha);
               }, false)
            ),
            outline: true,
            outlineColor: color,
            outlineWidth: 2,
            height: 100 // Slightly above ground
          },
          label: {
              text: `[ ${alert.level} ALERT ]`,
              font: '14px monospace',
              fillColor: color,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -20),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.7)
          }
        });
        
        // We override the click handling via our custom properties pattern
        (entity as ThreatEntity).threatData = {
           id: alert.id,
           name: `${alert.level} GEO-ALERT`,
           type: 'alert',
           data: {
             priority: alert.level,
             radius: `${Math.round(alert.radius / 1000)}km`,
             lat: alert.lat.toFixed(4),
             lon: alert.lon.toFixed(4)
           }
        };

        entitiesRef.current[alert.id] = entity;
      }
    });

  }, [viewer, activeAlerts]);

  // Clean up entirely on unmount
  useEffect(() => {
     return () => {
        if (viewer && !viewer.isDestroyed()) {
           Object.values(entitiesRef.current).forEach(entity => {
              viewer.entities.remove(entity);
           });
           entitiesRef.current = {};
        }
     }
  }, [viewer]);

  return null;
}
