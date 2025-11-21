import { Mesh, Group, Vector3 } from 'three';

export interface GameStats {
  score: number;
  hp: number;
  maxHp: number;
  breachCount: number;
  maxBreach: number;
  isGameOver: boolean;
  failReason: string;
  cannonReady: boolean;
  // Wave System
  currentWave: number;
  waveTimer: number; // Seconds remaining in spawn phase
  waveState: 'countdown' | 'spawning' | 'clearing';
}

export interface Enemy {
  mesh: Group;
  type: 'tank' | 'soldier';
  hp: number;
  speed: number;
  state: 'adv' | 'seek' | 'hide' | 'dying';
  stopZ?: number; // For tanks
  fireT?: number; // For tanks
  hitR: number;
  off?: number; // For soldiers animation offset
  coverT?: number; // For soldiers hiding
  target?: Vector3; // For soldiers seeking cover
  limbs?: {
    lLeg: Mesh;
    rLeg: Mesh;
    lArm: Mesh;
    rArm: Mesh;
  };
  turret?: Group; // For tanks
  deathTimer?: number;
}

export interface Bullet {
  mesh: Mesh;
  vel: Vector3;
  type: 'mg' | 'shell';
  life: number;
}

export interface Particle {
  mesh: Mesh;
  vel: Vector3;
  life: number;
  gravity?: number; // Default 0.05
  drag?: number;    // Default 1.0
}

export interface GameSceneRef {
  resetGame: () => void;
}