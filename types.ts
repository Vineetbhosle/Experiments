// Station shapes represent different destination types
export type StationShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'star';

export interface Position {
  x: number;
  y: number;
}

export interface Passenger {
  id: string;
  destination: StationShape; // The shape of station they want to go to
  waitTime: number; // How long they've been waiting (in seconds)
  maxWaitTime: number; // Maximum wait time before they get angry
}

export interface Station {
  id: string;
  shape: StationShape;
  position: Position;
  passengers: Passenger[];
  maxPassengers: number; // Station capacity before overflow
  connectedLines: string[]; // Line IDs connected to this station
}

export interface Train {
  id: string;
  lineId: string;
  position: Position;
  currentStationIndex: number;
  direction: 1 | -1; // Moving forward or backward along the line
  passengers: Passenger[];
  capacity: number;
  speed: number;
  progress: number; // 0-1 progress between stations
}

export interface MetroLine {
  id: string;
  color: string;
  stations: string[]; // Station IDs in order
  trains: Train[];
}

export interface GameState {
  stations: Station[];
  lines: MetroLine[];
  availableTrains: number;
  score: number;
  passengersDelivered: number;
  gameTime: number; // Total game time in seconds
  isGameOver: boolean;
  isPaused: boolean;
  selectedLine: string | null;
  isDrawingLine: boolean;
  drawingFromStation: string | null;
  mousePosition: Position | null;
}

// Line colors for metro lines
export const LINE_COLORS = [
  '#E53935', // Red
  '#1E88E5', // Blue
  '#43A047', // Green
  '#FB8C00', // Orange
  '#8E24AA', // Purple
  '#00ACC1', // Cyan
  '#FFB300', // Amber
  '#6D4C41', // Brown
];

// Game configuration
export const GAME_CONFIG = {
  MAP_WIDTH: 800,
  MAP_HEIGHT: 600,
  INITIAL_STATIONS: 3,
  STATION_SPAWN_INTERVAL: 15, // seconds
  PASSENGER_SPAWN_INTERVAL: 3, // seconds
  PASSENGER_MAX_WAIT: 45, // seconds before game over
  STATION_MAX_CAPACITY: 6,
  TRAIN_CAPACITY: 6,
  TRAIN_SPEED: 80, // pixels per second
  INITIAL_TRAINS: 3,
  STATION_RADIUS: 20,
  TRAIN_RADIUS: 8,
  PASSENGER_SIZE: 8,
};
