import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

interface WeatherLayerProps {
  viewer: Cesium.Viewer | null;
}

export default function WeatherLayer({ viewer }: WeatherLayerProps) {
  const radarLayer = useRef<Cesium.ImageryLayer | null>(null);

  useEffect(() => {
    if (!viewer) return;

    let isMounted = true;

    // 1. Fetch the latest RainViewer API map configuration
    // This provides the current timestamp paths for the live radar tiles
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (!isMounted || !viewer || viewer.isDestroyed()) return;

        // Get the most recent past radar frame timestamp
        const latestFrame = data.radar.past[data.radar.past.length - 1];
        
        if (latestFrame) {
          // 2. Construct the URL template for Cesium ImageryProvider
          // Format: https://{host}{path}/256/{z}/{x}/{y}/2/1_1.png
          // color=2 (original), smooth=1 (smoothed), snow=1 (show snow)
          const tileUrl = `https://${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

          const provider = new Cesium.UrlTemplateImageryProvider({
            url: tileUrl,
            credit: 'Weather data provided by RainViewer',
            maximumLevel: 6 // Limit zoom level to prevent blurry upscaling
          });

          // 3. Add as a layer and apply cinematic blending
          radarLayer.current = viewer.scene.imageryLayers.addImageryProvider(provider);
          
          // Make it semi-transparent so we can see the ground beneath it
          radarLayer.current.alpha = 0.6;
          // Apply a brightness boost to make the neon colors pop more
          radarLayer.current.brightness = 1.2;
        }
      })
      .catch(err => console.error("Failed to fetch RainViewer data:", err));

    return () => {
      isMounted = false;
      if (viewer && !viewer.isDestroyed() && radarLayer.current) {
        viewer.scene.imageryLayers.remove(radarLayer.current);
      }
    };
  }, [viewer]);

  return null;
}
