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
import WeatherLayer from './WeatherLayer';
import ThreatCorrelationLayer from './ThreatCorrelationLayer';
import CorrelationManager from './CorrelationManager';

const IDLE_TIMEOUT_MS = 8000; // Resume auto-rotate after 8s of inactivity
const ROTATION_SPEED = 0.05; // Degrees per frame (very gentle)

export default function Globe() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const activeStage = useRef<Cesium.PostProcessStage | null>(null);
  const [viewerReady, setViewerReady] = useState<Cesium.Viewer | null>(null);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

  // Auto-rotation refs
  const isUserInteracting = useRef(false);
  const lastInteractionTime = useRef(0);
  const rotationListenerId = useRef<(() => void) | null>(null);

  // Tracking refs
  const trackedPrimitiveRef = useRef<Cesium.PointPrimitive | Cesium.Billboard | null>(null);
  const isTrackingRef = useRef(false);

  const shaderMode = useAppStore((state) => state.shaderMode);
  const layers = useAppStore((state) => state.layers);
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
      requestRenderMode: false, // Continuous rendering for auto-rotation
    });

    const creditContainer = viewer.current.bottomContainer as HTMLElement;
    if (creditContainer) creditContainer.style.display = 'none';

    viewer.current.scene.globe.enableLighting = true;
    viewer.current.scene.highDynamicRange = true;

    // Enable Bloom
    viewer.current.scene.postProcessStages.bloom.enabled = true;
    viewer.current.scene.postProcessStages.bloom.uniforms.contrast = 1.2;
    viewer.current.scene.postProcessStages.bloom.uniforms.brightness = -0.1;
    viewer.current.scene.postProcessStages.bloom.uniforms.glowOnly = false;
    viewer.current.scene.postProcessStages.bloom.uniforms.delta = 1.0;
    viewer.current.scene.postProcessStages.bloom.uniforms.sigma = 2.0;
    viewer.current.scene.postProcessStages.bloom.uniforms.stepSize = 1.0;

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
        console.warn("Failed to load Google 3D Tiles. Falling back to base globe.", error);
      }
    };
    addGoogleTiles();

    // ─── Auto-rotation ───
    const markInteraction = () => {
      isUserInteracting.current = true;
      lastInteractionTime.current = Date.now();
      // Reset after a short delay to detect "ended"
      setTimeout(() => { isUserInteracting.current = false; }, 200);
    };

    const canvas = viewer.current.scene.canvas;
    canvas.addEventListener('pointerdown', markInteraction);
    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.buttons > 0) markInteraction();
    });
    canvas.addEventListener('wheel', markInteraction);

    // Idle rotation listener on the clock tick
    const v = viewer.current;
    const removeListener = v.clock.onTick.addEventListener(() => {
      if (!v || v.isDestroyed()) return;
      
      // If we are actively tracking a target, let the preRender handle camera
      if (isTrackingRef.current) return;

      const idleTime = Date.now() - lastInteractionTime.current;
      if (!isUserInteracting.current && idleTime > IDLE_TIMEOUT_MS) {
        v.camera.rotate(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(ROTATION_SPEED));
      }
    });
    rotationListenerId.current = removeListener;

    setViewerReady(viewer.current);

    // Setup input handling for picking entities/primitives
    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);
    handlerRef.current.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      if (!viewer.current) return;
      
      const pickedObject = viewer.current.scene.pick(click.position);

      if (Cesium.defined(pickedObject)) {
        // Handle Entity (Alerts)
        const entityId = pickedObject.id;
        if (entityId instanceof Cesium.Entity && 'threatData' in entityId) {
            setSelectedTarget((entityId as Cesium.Entity & { threatData: import('../store').TargetData }).threatData);
            isTrackingRef.current = false; // Entities (alerts) are static in this case
            trackedPrimitiveRef.current = null;
            
            const pos = pickedObject.id.position?.getValue(viewer.current.clock.currentTime);
            if (pos) {
               viewer.current.camera.flyTo({
                 destination: pos,
                 duration: 1.5
               });
            }
            return; // We selected an entity, exit early
        }

        // Handle Primitives
        if (pickedObject.id && typeof pickedObject.id === 'object' && pickedObject.id.type) {
            setSelectedTarget(pickedObject.id);
            
            if (pickedObject.primitive) {
              trackedPrimitiveRef.current = pickedObject.primitive;
              isTrackingRef.current = true;
              
              if (pickedObject.primitive.position) {
                 // Initial fly to get close
                viewer.current.camera.flyTo({
                  destination: pickedObject.primitive.position,
                  duration: 1.5
                });
              }
            }
            return;
        }
      }
      
      // If nothing valid was clicked, or we clicked empty space
      clearSelectedTarget();
      isTrackingRef.current = false;
      trackedPrimitiveRef.current = null;
      
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Continuous tracking loop
    const onPreRender = () => {
       if (!viewer.current || !isTrackingRef.current || !trackedPrimitiveRef.current) return;
       
       const pos = trackedPrimitiveRef.current.position;
       // Primitive might be hidden or destroyed
       if (!pos || !trackedPrimitiveRef.current.show) {
          // Keep tracking state but maybe the item moved out of bounds
          return; 
       }

       // Smoothly update camera to look at the tracked object
       // Getting the current camera position, recalculating the lookAt target
       const transform = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
       viewer.current.camera.lookAtTransform(transform, new Cesium.Cartesian3(0.0, -100000.0, 1500000.0));
    };
    
    viewer.current.scene.preRender.addEventListener(onPreRender);

    return () => {
      canvas.removeEventListener('pointerdown', markInteraction);
      canvas.removeEventListener('wheel', markInteraction);
      if (rotationListenerId.current) rotationListenerId.current();
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (viewer.current) {
        viewer.current.scene.preRender.removeEventListener(onPreRender);
        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, [setSelectedTarget, clearSelectedTarget]);

  // Effect to handle shader changes
  useEffect(() => {
    if (!viewer.current) return;

    const stages = viewer.current.scene.postProcessStages;

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

    viewer.current.scene.requestRender();

  }, [shaderMode]);

  return (
    <>
      <div id="cesiumContainer" ref={cesiumContainer} className="w-full h-full absolute inset-0 z-0 bg-black" />
      {viewerReady && (
        <>
          <SatelliteLayer viewer={viewerReady} />
          <EarthquakeLayer viewer={viewerReady} />
          <ShipLayer viewer={viewerReady} />
          {layers.flights && <FlightLayer viewer={viewerReady} />}
          {layers.weather && <WeatherLayer viewer={viewerReady} />}
          <TrafficLayer viewer={viewerReady} />
          <ThreatCorrelationLayer viewer={viewerReady} />
          <CorrelationManager viewer={viewerReady} />
        </>
      )}
    </>
  );
}
