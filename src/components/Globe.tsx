import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useAppStore } from '../store';
import { CRT_SHADER, NVG_SHADER, FLIR_SHADER } from '../utils/shaders';
import SatelliteLayer from './SatelliteLayer';
import EarthquakeLayer from './EarthquakeLayer';
import ShipLayer from './ShipLayer';
import FlightLayer from './FlightLayer';
import TrafficLayer from './TrafficLayer';

export default function Globe() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const activeStage = useRef<Cesium.PostProcessStage | null>(null);
  const [viewerReady, setViewerReady] = useState<Cesium.Viewer | null>(null);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  
  const shaderMode = useAppStore((state) => state.shaderMode);
  const setSelectedTarget = useAppStore((state) => state.setSelectedTarget);
  const clearSelectedTarget = useAppStore((state) => state.clearSelectedTarget);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    viewer.current = new Cesium.Viewer(cesiumContainer.current, {
      terrainProvider: undefined,
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      homeButton: false,
      fullscreenButton: false,
      baseLayerPicker: false,
      geocoder: false,
      sceneModePicker: false,
      infoBox: false,
      selectionIndicator: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity, // Helps performance when static
    });

    const creditContainer = viewer.current.bottomContainer as HTMLElement;
    if (creditContainer) creditContainer.style.display = 'none';

    viewer.current.scene.globe.enableLighting = true;
    viewer.current.scene.highDynamicRange = true;

    // Remove atmospheric glow to fit a darker space aesthetic
    if (viewer.current.scene.skyAtmosphere) {
      viewer.current.scene.skyAtmosphere.show = false;
    }
    viewer.current.scene.fog.enabled = false;
    viewer.current.scene.globe.baseColor = Cesium.Color.BLACK;

    viewer.current.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 0, 25000000),
    });

    // Add Google Photorealistic 3D Tiles
    const addGoogleTiles = async () => {
      try {
        const googleTileset = await Cesium.createGooglePhotorealistic3DTileset();
        if (viewer.current) {
          viewer.current.scene.primitives.add(googleTileset);
        }
      } catch (error) {
        console.warn("Failed to load Google 3D Tiles (API key may be required or rate limit hit). Falling back to base globe.", error);
      }
    };
    addGoogleTiles();

    setViewerReady(viewer.current);

    // Setup input handling for picking entities/primitives
    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);
    handlerRef.current.setInputAction((click: any) => {
      if (!viewer.current) return;
      const pickedObject = viewer.current.scene.pick(click.position);
      
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        // ID should contain target data bound during creation in Layer components
        setSelectedTarget(pickedObject.id);
        
        // Fly to the clicked location
        if (pickedObject.primitive && pickedObject.primitive.position) {
            viewer.current.camera.flyTo({
              destination: pickedObject.primitive.position,
              duration: 2.0,
            });
        }
      } else {
        clearSelectedTarget();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (viewer.current) {
        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, [setSelectedTarget, clearSelectedTarget]);

  // Effect to handle shader changes
  useEffect(() => {
    if (!viewer.current) return;
    
    const stages = viewer.current.scene.postProcessStages;
    
    // Remove existing custom stage
    if (activeStage.current) {
      stages.remove(activeStage.current);
      activeStage.current = null;
    }

    let fragmentShader = '';

    if (shaderMode === 'CRT') fragmentShader = CRT_SHADER;
    else if (shaderMode === 'NVG') fragmentShader = NVG_SHADER;
    else if (shaderMode === 'FLIR') fragmentShader = FLIR_SHADER;
    
    if (fragmentShader !== '') {
      activeStage.current = new Cesium.PostProcessStage({
        fragmentShader: fragmentShader,
      });
      stages.add(activeStage.current);
    }
    
    // Force a render frame so the shader applies immediately even when requestRenderMode is true
    viewer.current.scene.requestRender();

  }, [shaderMode]);

  return (
    <>
      <div id="cesiumContainer" ref={cesiumContainer} className="w-full h-full absolute inset-0 z-0 bg-black" />
      {/* Mount data layers once the Viewer is initialized */}
      {viewerReady && (
        <>
          <SatelliteLayer viewer={viewerReady} />
          <EarthquakeLayer viewer={viewerReady} />
          <ShipLayer viewer={viewerReady} />
          <FlightLayer viewer={viewerReady} />
          <TrafficLayer viewer={viewerReady} />
        </>
      )}
    </>
  );
}
