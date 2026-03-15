import { create } from 'zustand';

export type ShaderMode = 'NORMAL' | 'CRT' | 'NVG' | 'FLIR';

export type LayerKey = 'satellites' | 'flights' | 'earthquakes' | 'ships' | 'weather';

export interface TargetData {
  id: string;
  name: string;
  type: 'satellite' | 'flight' | 'ship' | 'earthquake' | 'alert';
  data: Record<string, string | number>;
}

export interface ThreatAlert {
  id: string;
  lat: number;
  lon: number;
  radius: number;
  level: 'HIGH' | 'MED' | 'LOW';
  timestamp: number;
}

interface AppState {
  shaderMode: ShaderMode;
  setShaderMode: (mode: ShaderMode) => void;

  layers: Record<LayerKey, boolean>;
  toggleLayer: (layer: LayerKey) => void;

  layerStats: Record<LayerKey, number>;
  updateLayerStats: (layer: LayerKey, stat: number) => void;

  // Timestamps of last data sync per layer
  layerLastSync: Record<LayerKey, number>;
  updateLayerLastSync: (layer: LayerKey) => void;

  selectedTarget: TargetData | null;
  setSelectedTarget: (target: TargetData) => void;
  clearSelectedTarget: () => void;

  // Help overlay
  showHelp: boolean;
  toggleHelp: () => void;

  // Mobile panel visibility
  showMobilePanel: boolean;
  toggleMobilePanel: () => void;

  // Search Palette
  isSearchOpen: boolean;
  toggleSearch: (isOpen?: boolean) => void;

  // Orbit Prediction Time Offset (in milliseconds)
  timeOffset: number;
  setTimeOffset: (offset: number) => void;

  // Active Map Alerts (for geographic correlation)
  activeAlerts: ThreatAlert[];
  addAlert: (alert: ThreatAlert) => void;
  removeAlert: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  shaderMode: 'NORMAL',
  setShaderMode: (mode) => set({ shaderMode: mode }),

  layers: {
    satellites: true,
    flights: false,
    earthquakes: false,
    ships: false,
    weather: false,
  },
  toggleLayer: (layer) => set((state) => ({
    layers: { ...state.layers, [layer]: !state.layers[layer] }
  })),

  layerStats: {
    satellites: 0,
    flights: 0,
    earthquakes: 0,
    ships: 0,
    weather: 0,
  },
  updateLayerStats: (layer, stat) => set((state) => ({
    layerStats: { ...state.layerStats, [layer]: stat }
  })),

  layerLastSync: {
    satellites: 0,
    flights: 0,
    earthquakes: 0,
    ships: 0,
    weather: 0,
  },
  updateLayerLastSync: (layer) => set((state) => ({
    layerLastSync: { ...state.layerLastSync, [layer]: Date.now() }
  })),

  selectedTarget: null,
  setSelectedTarget: (target) => set({ selectedTarget: target }),
  clearSelectedTarget: () => set({ selectedTarget: null }),

  showHelp: false,
  toggleHelp: () => set((state) => ({ showHelp: !state.showHelp })),

  showMobilePanel: false,
  toggleMobilePanel: () => set((state) => ({ showMobilePanel: !state.showMobilePanel })),

  isSearchOpen: false,
  toggleSearch: (isOpen) => set((state) => ({ 
    isSearchOpen: isOpen !== undefined ? isOpen : !state.isSearchOpen 
  })),

  timeOffset: 0,
  setTimeOffset: (offset) => set({ timeOffset: offset }),

  activeAlerts: [],
  addAlert: (alert) => set((state) => ({ activeAlerts: [...state.activeAlerts, alert] })),
  removeAlert: (id) => set((state) => ({ activeAlerts: state.activeAlerts.filter(a => a.id !== id) })),
}));
