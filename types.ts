export interface BuildingParams {
  // === STRUCTURE (10) ===
  floors: number;                  // 1-120
  floorHeight: number;            // 2.5-6m
  buildingWidth: number;          // 10-80m
  buildingDepth: number;          // 10-80m
  structuralGrid: number;         // 3-12m column spacing
  coreSizeRatio: number;          // 0.1-0.4 core vs floor
  slabThickness: number;          // 0.15-0.5m
  basementLevels: number;         // 0-5
  podiumFloors: number;           // 0-8
  podiumSetback: number;          // 0-15m

  // === FORM (10) ===
  taperRatio: number;             // 0.3-1.0 top/bottom ratio
  twistAngle: number;             // 0-90 degrees total twist
  facadeWaviness: number;         // 0-3m amplitude
  waveFrequency: number;          // 0.5-5 cycles
  cornerRadius: number;           // 0-10m
  roofStyle: number;              // 0=flat, 1=sloped, 2=crown, 3=spire
  roofHeight: number;             // 0-30m
  setbackInterval: number;        // 0=none, 5-30 floor intervals
  setbackAmount: number;          // 0-5m per setback
  asymmetry: number;              // 0-1 symmetry breaking

  // === FACADE (10) ===
  glazingRatio: number;           // 0.2-0.95
  panelWidth: number;             // 0.5-4m
  panelHeight: number;            // 0.5-4m
  mullionWidth: number;           // 0.02-0.15m
  spandrelHeight: number;         // 0.2-1.5m
  doubleSkinn: number;            // 0=no, 1=yes
  louverDensity: number;          // 0-1
  louverAngle: number;            // 0-60 degrees
  balconyFrequency: number;       // 0-1
  balconyDepth: number;           // 0-3m

  // === MATERIALS (5) ===
  glassColor: string;             // hex color
  frameColor: string;             // hex color
  spandrelColor: string;          // hex color
  accentColor: string;            // hex color
  glassOpacity: number;           // 0.1-0.9

  // === LIGHTING (5) ===
  emissiveStrength: number;       // 0-2
  crownLighting: number;          // 0=off, 1=on
  stripLightFloors: number;       // 0-1 ratio of lit floors
  ambientIntensity: number;       // 0-3
  sunAngle: number;               // 0-360

  // === ENVIRONMENT (5) ===
  groundPlaneSize: number;        // 50-500m
  surroundingBuildings: number;   // 0-30
  landscaping: number;            // 0-1
  waterFeature: number;           // 0=none, 1=pool, 2=fountain
  skyStyle: number;               // 0=day, 1=sunset, 2=night

  // === DETAILS (5) ===
  antennaHeight: number;          // 0-20m
  helipad: number;                // 0=no, 1=yes
  canopy: number;                 // 0=no, 1=yes
  canopyExtension: number;        // 1-10m
  entranceHeight: number;         // 3-12m lobby height multiplier
}

export const DEFAULT_PARAMS: BuildingParams = {
  floors: 40,
  floorHeight: 3.8,
  buildingWidth: 35,
  buildingDepth: 30,
  structuralGrid: 8,
  coreSizeRatio: 0.25,
  slabThickness: 0.3,
  basementLevels: 2,
  podiumFloors: 3,
  podiumSetback: 5,

  taperRatio: 0.75,
  twistAngle: 15,
  facadeWaviness: 0.5,
  waveFrequency: 2,
  cornerRadius: 2,
  roofStyle: 2,
  roofHeight: 12,
  setbackInterval: 0,
  setbackAmount: 2,
  asymmetry: 0.1,

  glazingRatio: 0.75,
  panelWidth: 1.5,
  panelHeight: 3,
  mullionWidth: 0.05,
  spandrelHeight: 0.6,
  doubleSkinn: 0,
  louverDensity: 0.3,
  louverAngle: 30,
  balconyFrequency: 0.1,
  balconyDepth: 1.5,

  glassColor: '#88ccee',
  frameColor: '#1a1a2e',
  spandrelColor: '#2d2d44',
  accentColor: '#00d4ff',
  glassOpacity: 0.4,

  emissiveStrength: 0.8,
  crownLighting: 1,
  stripLightFloors: 0.6,
  ambientIntensity: 1.5,
  sunAngle: 45,

  groundPlaneSize: 200,
  surroundingBuildings: 12,
  landscaping: 0.7,
  waterFeature: 1,
  skyStyle: 1,

  antennaHeight: 8,
  helipad: 1,
  canopy: 1,
  canopyExtension: 6,
  entranceHeight: 8,
};

export interface ParamMeta {
  key: keyof BuildingParams;
  label: string;
  min: number;
  max: number;
  step: number;
  category: string;
  type: 'range' | 'color' | 'select';
  options?: { value: number; label: string }[];
}

export const PARAM_METADATA: ParamMeta[] = [
  // STRUCTURE
  { key: 'floors', label: 'Number of Floors', min: 1, max: 120, step: 1, category: 'Structure', type: 'range' },
  { key: 'floorHeight', label: 'Floor Height (m)', min: 2.5, max: 6, step: 0.1, category: 'Structure', type: 'range' },
  { key: 'buildingWidth', label: 'Building Width (m)', min: 10, max: 80, step: 1, category: 'Structure', type: 'range' },
  { key: 'buildingDepth', label: 'Building Depth (m)', min: 10, max: 80, step: 1, category: 'Structure', type: 'range' },
  { key: 'structuralGrid', label: 'Column Spacing (m)', min: 3, max: 12, step: 0.5, category: 'Structure', type: 'range' },
  { key: 'coreSizeRatio', label: 'Core Size Ratio', min: 0.1, max: 0.4, step: 0.01, category: 'Structure', type: 'range' },
  { key: 'slabThickness', label: 'Slab Thickness (m)', min: 0.15, max: 0.5, step: 0.01, category: 'Structure', type: 'range' },
  { key: 'basementLevels', label: 'Basement Levels', min: 0, max: 5, step: 1, category: 'Structure', type: 'range' },
  { key: 'podiumFloors', label: 'Podium Floors', min: 0, max: 8, step: 1, category: 'Structure', type: 'range' },
  { key: 'podiumSetback', label: 'Podium Setback (m)', min: 0, max: 15, step: 0.5, category: 'Structure', type: 'range' },

  // FORM
  { key: 'taperRatio', label: 'Taper Ratio', min: 0.3, max: 1.0, step: 0.01, category: 'Form', type: 'range' },
  { key: 'twistAngle', label: 'Twist Angle (°)', min: 0, max: 90, step: 1, category: 'Form', type: 'range' },
  { key: 'facadeWaviness', label: 'Facade Waviness (m)', min: 0, max: 3, step: 0.1, category: 'Form', type: 'range' },
  { key: 'waveFrequency', label: 'Wave Frequency', min: 0.5, max: 5, step: 0.1, category: 'Form', type: 'range' },
  { key: 'cornerRadius', label: 'Corner Radius (m)', min: 0, max: 10, step: 0.5, category: 'Form', type: 'range' },
  { key: 'roofStyle', label: 'Roof Style', min: 0, max: 3, step: 1, category: 'Form', type: 'select', options: [{ value: 0, label: 'Flat' }, { value: 1, label: 'Sloped' }, { value: 2, label: 'Crown' }, { value: 3, label: 'Spire' }] },
  { key: 'roofHeight', label: 'Roof Height (m)', min: 0, max: 30, step: 1, category: 'Form', type: 'range' },
  { key: 'setbackInterval', label: 'Setback Interval', min: 0, max: 30, step: 1, category: 'Form', type: 'range' },
  { key: 'setbackAmount', label: 'Setback Amount (m)', min: 0, max: 5, step: 0.1, category: 'Form', type: 'range' },
  { key: 'asymmetry', label: 'Asymmetry', min: 0, max: 1, step: 0.01, category: 'Form', type: 'range' },

  // FACADE
  { key: 'glazingRatio', label: 'Glazing Ratio', min: 0.2, max: 0.95, step: 0.01, category: 'Facade', type: 'range' },
  { key: 'panelWidth', label: 'Panel Width (m)', min: 0.5, max: 4, step: 0.1, category: 'Facade', type: 'range' },
  { key: 'panelHeight', label: 'Panel Height (m)', min: 0.5, max: 4, step: 0.1, category: 'Facade', type: 'range' },
  { key: 'mullionWidth', label: 'Mullion Width (m)', min: 0.02, max: 0.15, step: 0.01, category: 'Facade', type: 'range' },
  { key: 'spandrelHeight', label: 'Spandrel Height (m)', min: 0.2, max: 1.5, step: 0.05, category: 'Facade', type: 'range' },
  { key: 'doubleSkinn', label: 'Double Skin', min: 0, max: 1, step: 1, category: 'Facade', type: 'select', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }] },
  { key: 'louverDensity', label: 'Louver Density', min: 0, max: 1, step: 0.05, category: 'Facade', type: 'range' },
  { key: 'louverAngle', label: 'Louver Angle (°)', min: 0, max: 60, step: 1, category: 'Facade', type: 'range' },
  { key: 'balconyFrequency', label: 'Balcony Frequency', min: 0, max: 1, step: 0.05, category: 'Facade', type: 'range' },
  { key: 'balconyDepth', label: 'Balcony Depth (m)', min: 0, max: 3, step: 0.1, category: 'Facade', type: 'range' },

  // MATERIALS
  { key: 'glassColor', label: 'Glass Color', min: 0, max: 0, step: 0, category: 'Materials', type: 'color' },
  { key: 'frameColor', label: 'Frame Color', min: 0, max: 0, step: 0, category: 'Materials', type: 'color' },
  { key: 'spandrelColor', label: 'Spandrel Color', min: 0, max: 0, step: 0, category: 'Materials', type: 'color' },
  { key: 'accentColor', label: 'Accent Color', min: 0, max: 0, step: 0, category: 'Materials', type: 'color' },
  { key: 'glassOpacity', label: 'Glass Opacity', min: 0.1, max: 0.9, step: 0.05, category: 'Materials', type: 'range' },

  // LIGHTING
  { key: 'emissiveStrength', label: 'Emissive Strength', min: 0, max: 2, step: 0.05, category: 'Lighting', type: 'range' },
  { key: 'crownLighting', label: 'Crown Lighting', min: 0, max: 1, step: 1, category: 'Lighting', type: 'select', options: [{ value: 0, label: 'Off' }, { value: 1, label: 'On' }] },
  { key: 'stripLightFloors', label: 'Lit Floors Ratio', min: 0, max: 1, step: 0.05, category: 'Lighting', type: 'range' },
  { key: 'ambientIntensity', label: 'Ambient Intensity', min: 0, max: 3, step: 0.1, category: 'Lighting', type: 'range' },
  { key: 'sunAngle', label: 'Sun Angle (°)', min: 0, max: 360, step: 5, category: 'Lighting', type: 'range' },

  // ENVIRONMENT
  { key: 'groundPlaneSize', label: 'Ground Size (m)', min: 50, max: 500, step: 10, category: 'Environment', type: 'range' },
  { key: 'surroundingBuildings', label: 'Surrounding Buildings', min: 0, max: 30, step: 1, category: 'Environment', type: 'range' },
  { key: 'landscaping', label: 'Landscaping', min: 0, max: 1, step: 0.05, category: 'Environment', type: 'range' },
  { key: 'waterFeature', label: 'Water Feature', min: 0, max: 2, step: 1, category: 'Environment', type: 'select', options: [{ value: 0, label: 'None' }, { value: 1, label: 'Pool' }, { value: 2, label: 'Fountain' }] },
  { key: 'skyStyle', label: 'Sky Style', min: 0, max: 2, step: 1, category: 'Environment', type: 'select', options: [{ value: 0, label: 'Day' }, { value: 1, label: 'Sunset' }, { value: 2, label: 'Night' }] },

  // DETAILS
  { key: 'antennaHeight', label: 'Antenna Height (m)', min: 0, max: 20, step: 1, category: 'Details', type: 'range' },
  { key: 'helipad', label: 'Helipad', min: 0, max: 1, step: 1, category: 'Details', type: 'select', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }] },
  { key: 'canopy', label: 'Entrance Canopy', min: 0, max: 1, step: 1, category: 'Details', type: 'select', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }] },
  { key: 'canopyExtension', label: 'Canopy Extension (m)', min: 1, max: 10, step: 0.5, category: 'Details', type: 'range' },
  { key: 'entranceHeight', label: 'Lobby Height (m)', min: 3, max: 12, step: 0.5, category: 'Details', type: 'range' },
];
