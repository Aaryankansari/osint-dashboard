import { create } from 'zustand';

export type ShaderMode = 'NORMAL' | 'CRT' | 'NVG' | 'FLIR';

export interface TargetData {
  id: string;
  name: string;
  type: 'satellite' | 'flight' | 'ship' | 'earthquake';
  data: Record<string, string | number>;
}

interface AppState {
  shaderMode: ShaderMode;
  setShaderMode: (mode: ShaderMode) => void;
  // Controls which 3D data layers are rendering on the globe
  layers: {
    satellites: boolean;
    flights: boolean;
    earthquakes: boolean;
    ships: boolean;
  };
  toggleLayer: (layer: keyof AppState['layers']) => void;
  // Holds real-time stats from active layers
  layerStats: {
    satellites: number;
    flights: number;
    earthquakes: number;
    ships: number;
  };
  updateLayerStats: (layer: keyof AppState['layerStats'], stat: number) => void;

  selectedTarget: TargetData | null;
  setSelectedTarget: (target: TargetData) => void;
  clearSelectedTarget: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  shaderMode: 'NORMAL',
  setShaderMode: (mode) => set({ shaderMode: mode }),
  
  layers: {
    satellites: true, 
    flights: false,
    earthquakes: false,
    ships: false,
  },
  toggleLayer: (layer) => set((state) => ({ 
    layers: { ...state.layers, [layer]: !state.layers[layer] } 
  })),

  layerStats: {
    satellites: 0,
    flights: 0,
    earthquakes: 0,
    ships: 0,
  },
  updateLayerStats: (layer, stat) => set((state) => ({
    layerStats: { ...state.layerStats, [layer]: stat }
  })),

  selectedTarget: null,
  setSelectedTarget: (target) => set({ selectedTarget: target }),
  clearSelectedTarget: () => set({ selectedTarget: null }),
}));
