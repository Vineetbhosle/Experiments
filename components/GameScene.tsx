
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { Enemy, Bullet, Particle, GameSceneRef, GameStats } from '../types';

interface GameSceneProps {
  onStatsUpdate: (stats: Partial<GameStats>) => void;
  isPaused: boolean;
}

interface TreeData {
  mesh: THREE.InstancedMesh;
  index: number; // Instance index
  pos: THREE.Vector2; // X, Z for quick distance check
  baseMatrix: THREE.Matrix4; // Rest position
  shake: number; // 0.0 to 1.0
  isShaking: boolean;
}

// --- CONFIGURATION ---
// Replaced with the user provided Google Drive link (formatted for direct download)
const CUSTOM_MG_AUDIO_URL = "https://drive.google.com/uc?export=download&id=1fqwSs6ptFL6cH_nk37osw6BUZ2hhyXJC";

// --- VISUAL PALETTE (Strict Green/Gray Theme + Orange Accents) ---
const PALETTE = {
  sky: 0xf2f5f7,
  ground: 0x4A6531,
  groundDark: 0x42582A,
  // Vegetation (Darker Pine Forest Theme)
  wood: 0x2d382e, 
  leafLight: 0x5c7c5d, // Desaturated medium green (Darker than previous)
  leafMid: 0x3e5f40,   // Darker green
  leafDark: 0x254427,  // Deep pine green
  leafDarker: 0x132615,// Almost black green
  shrub1: 0x4a5d42,    // Dark sage
  shrub2: 0x2a3d2b,    // Dark foliage
  shrub3: 0x586e45,    // Olive
  shrub4: 0x6d8258,    // Muted yellow-green
  bud: 0xc5e1a5, // Pale green flower/bud
  berry: 0x1b5e20, // Dark green berry
  // Stones (Grays)
  stone1: 0xf5f5f5, // White-ish
  stone2: 0xbdbdbd, // Light Gray
  stone3: 0x9e9e9e, // Mid Gray
  stone4: 0x757575, // Dark Gray
  stone5: 0x616161, // Darker
  stone6: 0x424242, // Slate
  // Tech/Units
  tankBody: 0x5d7052,
  tankDark: 0x3e4a36,
  tankStripe: 0xff5500, // Orange stripe
  tread: 0x263238,
  soldierUniform: 0x8d8d8d,
  soldierVest: 0xff5500, // Safety Orange
  soldierSkin: 0xffccbc,
  soldierBoots: 0x1a1a1a,
  gunMetal: 0x222222,
  gunWood: 0x5d4037,
  // FX
  tracer: 0xffffcc, // Bright yellow-white
  shell: 0xff6600,  // Glowing orange
  fire: 0xffaa00,
};

// --- OPTIMIZATION CACHES ---
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const unitSphereGeo = new THREE.SphereGeometry(1, 8, 8);
const materialCache = new Map<number | string, THREE.MeshStandardMaterial>();

const getMaterial = (color: number | string) => {
  if (!materialCache.has(color)) {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      flatShading: true,
      roughness: 1.0,
      metalness: 0.0,
    });
    materialCache.set(color, mat);
  }
  return materialCache.get(color)!;
};

const getGlowingMaterial = (color: number | string) => {
  const key = `glow_${color}`;
  if (!materialCache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 3.0, // High intensity for "neon" look
      toneMapped: false,      // Bypass tone mapping to keep colors pure and bright
      flatShading: true,
    });
    materialCache.set(key, mat);
  }
  return materialCache.get(key)!;
};

// Helper to merge geometries for static instances (Low Poly support)
const createMergedMeshGeometry = (builderFn: (add: (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, rx?: number, ry?: number, rz?: number, sx?: number, sy?: number, sz?: number) => void) => void) => {
    const geometries: THREE.BufferGeometry[] = [];
    
    builderFn((geoOrig, color, x, y, z, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1) => {
        let geo = geoOrig.clone();
        if (geo.index) {
            geo = geo.toNonIndexed();
        }
        geo.scale(sx, sy, sz);
        geo.rotateX(rx);
        geo.rotateY(ry);
        geo.rotateZ(rz);
        geo.translate(x, y, z);
        geo.computeVertexNormals();
        
        const count = geo.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const cObj = new THREE.Color(color);
        for(let i=0; i<count; i++) {
            colors[i*3] = cObj.r;
            colors[i*3+1] = cObj.g;
            colors[i*3+2] = cObj.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometries.push(geo);
    });

    if (geometries.length === 0) return new THREE.BufferGeometry();

    let totalVerts = 0;
    geometries.forEach(g => totalVerts += g.attributes.position.count);
    
    const mergedPos = new Float32Array(totalVerts * 3);
    const mergedNorm = new Float32Array(totalVerts * 3);
    const mergedCol = new Float32Array(totalVerts * 3);
    
    let offset = 0;
    geometries.forEach(geo => {
        const pos = geo.attributes.position.array;
        const norm = geo.attributes.normal.array;
        const col = geo.attributes.color.array;
        const count = geo.attributes.position.count;
        for(let i=0; i<count*3; i++) {
            mergedPos[offset*3 + i] = pos[i];
            mergedNorm[offset*3 + i] = norm[i];
            mergedCol[offset*3 + i] = col[i];
        }
        offset += count;
    });

    const finalGeo = new THREE.BufferGeometry();
    finalGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    finalGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    finalGeo.setAttribute('color', new THREE.BufferAttribute(mergedCol, 3));
    return finalGeo;
};

const DETAIL = 4;

export const GameScene = forwardRef<GameSceneRef, GameSceneProps>(({ onStatsUpdate, isPaused }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- AUDIO SYSTEM ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const customMgBufferRef = useRef<AudioBuffer | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
        const bufferSize = audioCtxRef.current.sampleRate * 2; 
        const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noiseBufferRef.current = buffer;

        if (CUSTOM_MG_AUDIO_URL) {
          fetch(CUSTOM_MG_AUDIO_URL)
            .then(response => {
              if (!response.ok) throw new Error("Network response was not ok");
              return response.arrayBuffer();
            })
            .then(arrayBuffer => audioCtxRef.current?.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
              if (audioBuffer) {
                customMgBufferRef.current = audioBuffer;
              }
            })
            .catch(error => console.warn("Custom audio load failed.", error));
        }
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'mg' | 'cannon' | 'explosion' | 'impact' | 'reload') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = 0.4;

    if (type === 'mg') {
      if (customMgBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = customMgBufferRef.current;
        src.playbackRate.value = 0.95 + Math.random() * 0.1; 
        const bassBoost = ctx.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.value = 200;
        bassBoost.gain.value = 6; 
        src.connect(bassBoost);
        bassBoost.connect(masterGain);
        src.start(t);
        return;
      }
      // Fallback MG
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.2, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
      if (noiseBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBufferRef.current;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1.0;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.5, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
        src.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        src.start(t);
        src.stop(t + 0.06);
      }

    } else if (type === 'cannon') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.6);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(2.0, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.6);
      if (noiseBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBufferRef.current;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.5); 
        const env = ctx.createGain();
        env.gain.setValueAtTime(1.5, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        src.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        src.start(t);
        src.stop(t + 0.6);
      }

    } else if (type === 'explosion') {
      if (noiseBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBufferRef.current;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(50, t + 1.5);
        const env = ctx.createGain();
        env.gain.setValueAtTime(1.5, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        src.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        src.start(t);
        src.stop(t + 1.5);
      }
      if (noiseBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBufferRef.current;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.8, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        src.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        src.start(t);
        src.stop(t + 0.1);
      }
    } else if (type === 'impact') {
       if (noiseBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBufferRef.current;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.linearRampToValueAtTime(500, t + 0.15);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.5, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        src.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        src.start(t);
        src.stop(t + 0.2);
      }
    } else if (type === 'reload') {
      // 1. Mechanical Slide (Hydraulic Hiss)
      if (noiseBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBufferRef.current;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, t);
        g.gain.linearRampToValueAtTime(0, t + 0.3);
        src.connect(f); f.connect(g); g.connect(masterGain);
        src.start(t);
      }
      // 2. Breach Lock (Heavy Clunk)
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.35);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t + 0.25);
      og.gain.linearRampToValueAtTime(0.3, t + 0.26);
      og.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(og); og.connect(masterGain);
      osc.start(t + 0.25);
      osc.stop(t + 0.4);
    }
  };
  
  const gameState = useRef({
    bullets: [] as Bullet[],
    enemyBullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    trees: [] as TreeData[], 
    score: 0,
    playerHP: 20,
    maxHp: 20, // Added maxHp to track max health
    breachCount: 0,
    isGameOver: false,
    failReason: '',
    frameCount: 0,
    shakeIntensity: 0,
    lastShotTime_MG: 0,
    lastShotTime_Shell: 0,
    // Wave System
    currentWave: 1,
    waveState: 'countdown' as 'countdown' | 'spawning' | 'clearing',
    stateStartTime: 0, // Timestamp when current state started
    waveDuration: 60, // Seconds
  });

  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const turretPivotRef = useRef<THREE.Group | null>(null);
  const playerTankRef = useRef<THREE.Group | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const aimPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)); 
  const forestRef = useRef<THREE.Object3D[]>([]);
  const foliageMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const makeVoxel = (w: number, h: number, d: number, color: number | string, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mat = getMaterial(color);
    const mesh = new THREE.Mesh(unitBoxGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d); 
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // --- Static Asset Storage ---
  const treeGeos = useRef<THREE.BufferGeometry[]>([]);
  const shrubGeos = useRef<THREE.BufferGeometry[]>([]);
  const stoneGeos = useRef<THREE.BufferGeometry[]>([]);

  const initStaticGeometries = () => {
      if (treeGeos.current.length > 0) return;
      const D = DETAIL;
      const geoCyl = new THREE.CylinderGeometry(0.4, 0.5, 1, 7); 
      const geoCone = new THREE.ConeGeometry(0.5, 1, 7); 
      const geoIco = new THREE.IcosahedronGeometry(0.5, 0); 
      const geoDod = new THREE.DodecahedronGeometry(0.5, 0);

      const t1 = createMergedMeshGeometry((add) => {
          add(geoCyl, PALETTE.wood, 0, 4*D, 0, 0,0,0, 2*D, 8*D, 2*D);
          add(geoCone, PALETTE.leafDark, 0, 9*D, 0, 0,0,0, 8*D, 6*D, 8*D);
          add(geoCone, PALETTE.leafMid, 0, 14*D, 0, 0,0,0, 6*D, 6*D, 6*D);
          add(geoCone, PALETTE.leafLight, 0, 19*D, 0, 0,0,0, 4*D, 5*D, 4*D);
      });
      const t2 = createMergedMeshGeometry((add) => {
          add(geoCyl, PALETTE.wood, 0, 3*D, 0, 0,0,0, 3*D, 6*D, 3*D);
          add(geoCone, PALETTE.leafDarker, 0, 8*D, 0, 0,0,0, 10*D, 7*D, 10*D);
          add(geoCone, PALETTE.leafDark, 0, 12*D, 0, 0,0,0, 8*D, 8*D, 8*D);
      });
      const t3 = createMergedMeshGeometry((add) => {
          add(geoCyl, PALETTE.wood, 0, 3*D, 0, 0,0,0, 2*D, 6*D, 2*D);
          add(geoIco, PALETTE.leafMid, 0, 9*D, 0, 0,Math.random(),0, 8*D, 7*D, 8*D);
          add(geoIco, PALETTE.leafLight, 4*D, 7*D, 0, 0,Math.random(),0, 6*D, 5*D, 6*D);
          add(geoIco, PALETTE.leafDark, -1*D, 13*D, 0, 0,Math.random(),0, 5*D, 4*D, 5*D);
          add(geoDod, PALETTE.bud, 3*D, 10*D, 3*D, 0,0,0, 1*D, 1*D, 1*D); 
          add(geoDod, PALETTE.bud, -2*D, 8*D, 4*D, 0,0,0, 1*D, 1*D, 1*D);
      });
      treeGeos.current = [t1, t2, t3];
      const s1 = createMergedMeshGeometry((add) => { 
          add(geoIco, PALETTE.shrub1, 0, 1.5*D, 0, 0,0,0, 4*D, 3*D, 4*D);
          add(geoIco, PALETTE.shrub2, 0, 3.5*D, 0, 0,1,0, 3*D, 1*D, 3*D);
      });
      const s2 = createMergedMeshGeometry((add) => { 
          add(geoCone, PALETTE.shrub3, 0, 2*D, 0, 0,0,0, 1.5*D, 4*D, 1.5*D);
          add(geoCone, PALETTE.shrub3, 1.5*D, 1*D, 0, 0,0,-0.5, 1*D, 3*D, 1*D);
          add(geoCone, PALETTE.shrub3, -1.5*D, 2*D, 0, 0,0,0.5, 1*D, 3*D, 1*D);
      });
      const s3 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.shrub4, 0, 1.5*D, 0, 0,0,0, 3*D, 3*D, 3*D);
          add(geoDod, PALETTE.shrub1, 0, 1.5*D, 0, 1,1,0, 2*D, 2*D, 3.5*D);
      });
      const s4 = createMergedMeshGeometry((add) => { 
          add(geoIco, PALETTE.shrub2, 0, 1.2*D, 0, 0,0,0, 3*D, 2.5*D, 3*D);
          add(geoDod, PALETTE.berry, 1*D, 2*D, 1*D, 0,0,0, 1*D, 1*D, 1*D);
          add(geoDod, PALETTE.berry, -1*D, 1.5*D, -0.5*D, 0,0,0, 1*D, 1*D, 1*D);
      });
      const s5 = createMergedMeshGeometry((add) => { 
          add(geoIco, PALETTE.shrub3, 0, 0.75*D, 0, 0,0,0, 6*D, 1.5*D, 3*D);
          add(geoDod, PALETTE.shrub1, 0, 1.8*D, 0, 0,2,0, 4*D, 1*D, 2*D);
      });
      const s6 = createMergedMeshGeometry((add) => { 
          add(geoCyl, PALETTE.shrub2, 0, 2.5*D, 0, 0,0,0, 1.5*D, 5*D, 1.5*D);
          add(geoDod, PALETTE.shrub4, 0, 1.5*D, 0, 0,0,0, 2*D, 3*D, 2*D);
      });
      const s7 = createMergedMeshGeometry((add) => { 
          add(geoCone, PALETTE.leafLight, 0, 1.5*D, 0, 0,0,0, 1*D, 3*D, 1*D);
          add(geoCone, PALETTE.leafMid, 1*D, 1*D, 0, 0,0,-0.3, 1*D, 2*D, 1*D);
          add(geoCone, PALETTE.leafMid, -1*D, 1*D, 0, 0,0,0.3, 1*D, 2*D, 1*D);
      });
      const s8 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.shrub1, 0, 1.5*D, 0, 0,0,0, 3*D, 3*D, 3*D);
          add(geoDod, PALETTE.bud, 1*D, 2.8*D, 1*D, 0,0,0, 0.8*D, 0.8*D, 0.8*D);
          add(geoDod, PALETTE.bud, -0.8*D, 2.5*D, -0.8*D, 0,0,0, 0.8*D, 0.8*D, 0.8*D);
      });
      shrubGeos.current = [s1, s2, s3, s4, s5, s6, s7, s8];

      const st1 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone3, 0, 2*D, 0, Math.random(),Math.random(),0, 4*D, 4*D, 4*D);
          add(geoDod, PALETTE.stone4, 1*D, 1*D, 1*D, Math.random(),0,0, 3*D, 3*D, 3*D);
      });
      const st2 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone5, 0, 3*D, 0, 0,0,0, 2.5*D, 6*D, 4*D);
          add(geoDod, PALETTE.stone4, 0, 1*D, 0, 0,1,0, 3*D, 2*D, 5*D);
      });
      const st3 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone4, 0, 1*D, 0, 1,2,3, 2*D, 2*D, 2*D);
          add(geoDod, PALETTE.stone3, 1.5*D, 1*D, 0.5*D, 2,1,0, 2*D, 2*D, 2*D);
          add(geoDod, PALETTE.stone5, -1*D, 1*D, -1*D, 0,1,2, 2*D, 2*D, 2*D);
      });
      const st4 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone4, 0, 0.75*D, 0, 0,0,0, 5*D, 1.5*D, 5*D);
          add(geoDod, PALETTE.stone3, 0, 1.8*D, 0, 0.5,0,0, 3*D, 1*D, 3*D);
      });
      const st5 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone6, 0, 2.5*D, 0, 0,0,0, 2*D, 5*D, 2*D);
          add(geoDod, PALETTE.stone5, 1.5*D, 1.5*D, 0, 0,0,0.5, 2*D, 3*D, 2*D);
      });
      const st6 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone4, 0, 1.5*D, 0, 0,0,0, 4*D, 3*D, 4*D);
          add(geoDod, PALETTE.shrub3, 0, 3.1*D, 0, 0,0,0, 3.5*D, 1*D, 3.5*D); 
      });
      const st7 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone3, -1.5*D, 2*D, 0, 0,0,0.2, 2*D, 4*D, 2*D);
          add(geoDod, PALETTE.stone3, 1.5*D, 1.5*D, 0, 0,0,-0.2, 2*D, 3*D, 3*D);
      });
      const st8 = createMergedMeshGeometry((add) => { 
          add(geoDod, PALETTE.stone2, 0, 0.5*D, 0, 0,0,0, 5*D, 1*D, 5*D);
          add(geoDod, PALETTE.stone3, 0, 1.5*D, 0, 1,0,1, 3*D, 1.5*D, 3*D);
          add(geoDod, PALETTE.stone1, 0, 2.5*D, 0, 2,2,0, 1.5*D, 1*D, 1.5*D);
      });
      stoneGeos.current = [st1, st2, st3, st4, st5, st6, st7, st8];
  };

  const generateForest = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    forestRef.current.forEach(m => scene.remove(m));
    forestRef.current = [];
    gameState.current.trees = []; 
    
    const dummy = new THREE.Object3D();
    const D = DETAIL;

    const foliageMat = new THREE.MeshStandardMaterial({ 
      vertexColors: true, 
      roughness: 1, 
      flatShading: true 
    });
    
    foliageMat.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        foliageMat.userData.shader = shader;
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
            #include <begin_vertex>
            vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float noise = sin(time * 1.0 + worldPos.x * 0.02 + worldPos.z * 0.02) 
                        + sin(time * 2.0 + worldPos.x * 0.1) * 0.2;
            float h = max(0.0, position.y);
            float sway = noise * pow(h, 1.5) * 0.00225; 
            transformed.x += sway;
            transformed.z += sway * 0.5;
          `
        );
    };
    foliageMaterialRef.current = foliageMat;

    const staticMat = new THREE.MeshStandardMaterial({ 
      vertexColors: true, 
      roughness: 1, 
      flatShading: true 
    });
    
    const coverPositions: THREE.Vector3[] = [];

    const treeInstances: THREE.Matrix4[][] = treeGeos.current.map(() => []);
    const shrubInstances: THREE.Matrix4[][] = shrubGeos.current.map(() => []);
    const stoneInstances: THREE.Matrix4[][] = stoneGeos.current.map(() => []);
    
    for (let i = 0; i < 850; i++) {
        let x, z;
        const side = Math.random();
        if (side < 0.25) { 
            x = -170 - Math.random() * 150;
            z = 260 - Math.random() * 750;
        } else if (side < 0.5) { 
            x = 170 + Math.random() * 150;
            z = 260 - Math.random() * 750;
        } else { 
            x = (Math.random() - 0.5) * 700;
            z = -230 - Math.random() * 250;
        }
        dummy.position.set(x, 0, z);
        dummy.scale.setScalar((1.5 + Math.random()) / D);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.updateMatrix();
        const tIdx = Math.floor(Math.random() * treeGeos.current.length);
        treeInstances[tIdx].push(dummy.matrix.clone());
        for(let k=0; k<12; k++) {
            const sIdx = Math.floor(Math.random() * shrubGeos.current.length);
            const sx = x + (Math.random()-0.5) * 24; 
            const sz = z + (Math.random()-0.5) * 24;
            dummy.position.set(sx, 0, sz);
            dummy.scale.setScalar((1.0 + Math.random() * 0.5) / D);
            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
            dummy.updateMatrix();
            shrubInstances[sIdx].push(dummy.matrix.clone());
        }
        const nStones = 1 + Math.floor(Math.random() * 2);
        for(let k=0; k<nStones; k++) {
            const stIdx = Math.floor(Math.random() * stoneGeos.current.length);
            const sx = x + (Math.random()-0.5) * 15;
            const sz = z + (Math.random()-0.5) * 15;
            dummy.position.set(sx, 0, sz);
            dummy.scale.setScalar((0.8 + Math.random() * 0.5) / D);
            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
            dummy.updateMatrix();
            stoneInstances[stIdx].push(dummy.matrix.clone());
        }
    }
    for(let i=0; i<200; i++) { 
        const x = (Math.random() - 0.5) * 300; 
        const z = 60 - Math.random() * 280; 
        if (z > 30 && Math.abs(x) < 40) continue; 
        const isStone = Math.random() > 0.6;
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.updateMatrix();
        if (isStone) {
            const stIdx = Math.floor(Math.random() * stoneGeos.current.length);
            dummy.scale.setScalar((1.2 + Math.random() * 0.8) / D);
            dummy.updateMatrix();
            stoneInstances[stIdx].push(dummy.matrix.clone());
            coverPositions.push(new THREE.Vector3(x, 0, z));
            const nShrubs = 9 + Math.floor(Math.random() * 6); 
            for(let k=0; k<nShrubs; k++) {
                const sIdx = Math.floor(Math.random() * shrubGeos.current.length);
                const sx = x + (Math.random()-0.5) * 12;
                const sz = z + (Math.random()-0.5) * 12;
                dummy.position.set(sx, 0, sz);
                dummy.scale.setScalar((0.8 + Math.random() * 0.5) / D);
                dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                dummy.updateMatrix();
                shrubInstances[sIdx].push(dummy.matrix.clone());
            }
        } else {
            for(let k=0; k<3; k++) {
                const sIdx = Math.floor(Math.random() * shrubGeos.current.length);
                const sx = x + (Math.random()-0.5) * 8;
                const sz = z + (Math.random()-0.5) * 8;
                dummy.position.set(sx, 0, sz);
                dummy.scale.setScalar((1.0 + Math.random() * 0.5) / D);
                dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                dummy.updateMatrix();
                shrubInstances[sIdx].push(dummy.matrix.clone());
            }
        }
    }
    for(let i=0; i<300; i++) { 
        const x = (Math.random() - 0.5) * 420; 
        const z = 80 + Math.random() * 180; 
        if (Math.abs(x) < 25 && Math.abs(z - 110) < 40) continue; 
        if (Math.random() > 0.1) {
            for(let k=0; k<3; k++) {
                const sIdx = Math.floor(Math.random() * shrubGeos.current.length);
                const sx = x + (Math.random()-0.5) * 6;
                const sz = z + (Math.random()-0.5) * 6;
                dummy.position.set(sx, 0, sz);
                dummy.scale.setScalar((1.2 + Math.random() * 0.6) / D); 
                dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                dummy.updateMatrix();
                shrubInstances[sIdx].push(dummy.matrix.clone());
            }
        } else {
            const stIdx = Math.floor(Math.random() * stoneGeos.current.length);
            dummy.position.set(x, 0, z);
            dummy.scale.setScalar((0.6 + Math.random() * 0.4) / D); 
            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
            dummy.updateMatrix();
            stoneInstances[stIdx].push(dummy.matrix.clone());
        }
    }

    const createInstanced = (geos: THREE.BufferGeometry[], instances: THREE.Matrix4[][], material: THREE.Material, isTree = false) => {
        geos.forEach((geo, i) => {
            const data = instances[i];
            if (data.length === 0) return;
            const mesh = new THREE.InstancedMesh(geo, material, data.length);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            data.forEach((m, idx) => {
                mesh.setMatrixAt(idx, m);
                if (isTree) {
                  const pos = new THREE.Vector3();
                  pos.setFromMatrixPosition(m);
                  gameState.current.trees.push({
                    mesh: mesh,
                    index: idx,
                    pos: new THREE.Vector2(pos.x, pos.z),
                    baseMatrix: m.clone(),
                    shake: 0,
                    isShaking: false
                  });
                }
            });
            mesh.instanceMatrix.needsUpdate = true;
            scene.add(mesh);
            forestRef.current.push(mesh);
        });
    };

    createInstanced(treeGeos.current, treeInstances, foliageMat, true);
    createInstanced(shrubGeos.current, shrubInstances, foliageMat, false);
    createInstanced(stoneGeos.current, stoneInstances, staticMat, false);

    const coverHolder = new THREE.Object3D();
    coverHolder.userData.coverPositions = coverPositions;
    forestRef.current.push(coverHolder);
  };

  useImperativeHandle(ref, () => ({
    resetGame: () => {
      const s = gameState.current;
      const scene = sceneRef.current;
      if (!scene) return;
      s.enemies.forEach(e => scene.remove(e.mesh));
      s.bullets.forEach(b => scene.remove(b.mesh));
      s.enemyBullets.forEach(b => scene.remove(b.mesh));
      s.particles.forEach(p => scene.remove(p.mesh));
      s.enemies = []; s.bullets = []; s.enemyBullets = []; s.particles = [];
      s.score = 0; s.playerHP = 20; s.breachCount = 0; s.isGameOver = false; s.frameCount = 0;
      s.currentWave = 1;
      s.waveState = 'countdown';
      s.stateStartTime = performance.now();
      generateForest();
      onStatsUpdate({ isGameOver: false, score: 0, hp: 20, breachCount: 0, failReason: '', currentWave: 1, waveTimer: 3, waveState: 'countdown' });
    }
  }));

  const syncUI = (forcedTime?: number) => {
    const s = gameState.current;
    const now = performance.now();
    let displayTimer = 0;
    if (s.waveState === 'countdown') {
         displayTimer = Math.max(0, 3 - (now - s.stateStartTime) / 1000);
    } else if (s.waveState === 'spawning') {
         displayTimer = Math.max(0, s.waveDuration - (now - s.stateStartTime) / 1000);
    }

    onStatsUpdate({ 
        score: s.score, 
        hp: s.playerHP, 
        breachCount: s.breachCount, 
        isGameOver: s.isGameOver,
        currentWave: s.currentWave,
        waveTimer: forcedTime ?? displayTimer,
        waveState: s.waveState
    });
  };

  const createExplosion = (pos: THREE.Vector3, color: number, scale: number) => {
    playSound(scale > 4 ? 'explosion' : 'impact');
    scale *= 1.3; 

    const light = new THREE.PointLight(0xffaa00, 20 * scale, 50);
    light.position.copy(pos);
    sceneRef.current?.add(light);
    setTimeout(()=>sceneRef.current?.remove(light), 80);

    if (scale >= 4) {
        const geo = unitSphereGeo.clone(); 
        const mat = getGlowingMaterial(0xff8800); 
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.setScalar(scale * 1.5);
        mesh.position.copy(pos);
        sceneRef.current?.add(mesh);
        gameState.current.particles.push({
            mesh: mesh as any,
            vel: new THREE.Vector3(0, 0.2, 0),
            life: 15,
            gravity: -0.01,
            drag: 0.9,
        });
    }

    const count = Math.floor(12 * scale);
    for(let i=0; i<count; i++) {
        const r = Math.random();
        let pMat, pLife, pGrav, pDrag, pVelScale;
        
        if(r < 0.35) { 
            pMat = getGlowingMaterial(Math.random()>0.5 ? 0xffaa00 : 0xff4400);
            pLife = 20 + Math.random() * 20;
            pGrav = -0.02; 
            pDrag = 0.9;
            pVelScale = 1.0;
        } else if (r < 0.7) { 
            pMat = getMaterial(Math.random()>0.5 ? 0x333333 : 0x111111);
            pLife = 40 + Math.random() * 40;
            pGrav = -0.05; 
            pDrag = 0.92;
            pVelScale = 0.8;
        } else { 
             pMat = getMaterial(color); 
             pLife = 50 + Math.random() * 30;
             pGrav = 0.15; 
             pDrag = 0.98;
             pVelScale = 1.5;
        }

        const mesh = new THREE.Mesh(unitBoxGeo, pMat);
        const size = (0.3 + Math.random()*0.7) * scale;
        mesh.scale.setScalar(size);
        const offset = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(Math.random() * scale * 1.5);
        mesh.position.copy(pos).add(offset);
        mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        sceneRef.current?.add(mesh);
        const explosionForce = 1 + (scale * 0.1);
        const vel = offset.clone().normalize().multiplyScalar(Math.random() * 2 * pVelScale * explosionForce);
        gameState.current.particles.push({ 
          mesh, 
          vel, 
          life: pLife,
          gravity: pGrav,
          drag: pDrag
        });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    initStaticGeometries();
    
    // Reset game state on mount to ensure clean start
    gameState.current.stateStartTime = performance.now();
    gameState.current.waveState = 'countdown';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.sky); 
    scene.fog = new THREE.Fog(PALETTE.sky, 200, 900);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    const camBasePos = new THREE.Vector3(0, 240, 260);
    camera.position.copy(camBasePos);
    camera.lookAt(0, 0, -40);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const hemiLight = new THREE.HemisphereLight(0xffffff, PALETTE.ground, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    dirLight.position.set(100, 150, 60); 
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048); 
    dirLight.shadow.bias = -0.0004;
    dirLight.shadow.radius = 2; 
    const d = 350;
    dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const groundGeo = new THREE.PlaneGeometry(1200, 1200, 120, 120);
    const groundColors: number[] = [];
    const groundColor = new THREE.Color(PALETTE.ground);
    for (let i = 0; i < groundGeo.attributes.position.count; i++) {
        groundColors.push(groundColor.r, groundColor.g, groundColor.b);
    }
    const initialGroundColors = new Float32Array(groundColors);
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(initialGroundColors, 3));
    groundGeo.userData.initialColors = initialGroundColors;
    const ground = new THREE.Mesh(
        groundGeo,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })
    );
    ground.name = 'ground';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const playerTank = new THREE.Group();
    playerTank.position.set(0, 0, 110);
    playerTank.scale.setScalar(1.2 / DETAIL);
    scene.add(playerTank);
    playerTankRef.current = playerTank;
    
    const D = DETAIL;

    const tankHull = new THREE.Group();
    tankHull.scale.setScalar(0.6); 
    playerTank.add(tankHull);
    const cBody = PALETTE.tankBody;
    const cDark = PALETTE.tankDark;
    const cTread = PALETTE.tread;
    const cMetal = 0x333333;
    const cBlack = 0x111111;
    const cBarrel = 0x5c6a79;
    makeVoxel(28*D, 6*D, 48*D, cBody, 0, 4*D, 0, tankHull); 
    makeVoxel(28*D, 2*D, 14*D, cBody, 0, 7*D, -20*D, tankHull); 
    makeVoxel(28*D, 1*D, 6*D, cDark, 0, 6.5*D, -26*D, tankHull); 
    makeVoxel(28*D, 3*D, 20*D, cBody, 0, 8*D, 14*D, tankHull);
    for(let x=-10*D; x<=10*D; x+=2*D) {
       makeVoxel(1*D, 0.5*D, 12*D, cBlack, x, 9.6*D, 14*D, tankHull);
    }
    makeVoxel(24*D, 4*D, 2*D, cBody, 0, 6*D, 24*D, tankHull);
    makeVoxel(6*D, 3*D, 2*D, cBlack, 8*D, 6*D, 24.5*D, tankHull);
    makeVoxel(6*D, 3*D, 2*D, cBlack, -8*D, 6*D, 24.5*D, tankHull);
    for (let i=0; i<7; i++) {
       const z = 18*D - i*6*D;
       makeVoxel(2*D, 6*D, 5.5*D, cBody, 15*D, 5*D, z, tankHull);
       makeVoxel(2.1*D, 5*D, 0.5*D, cBlack, 15*D, 5*D, z - 2.8*D, tankHull);
    }
    for (let i=0; i<7; i++) {
       const z = 18*D - i*6*D;
       makeVoxel(2*D, 6*D, 5.5*D, cBody, -15*D, 5*D, z, tankHull);
       makeVoxel(2.1*D, 5*D, 0.5*D, cBlack, -15*D, 5*D, z - 2.8*D, tankHull);
    }
    for(let i=0; i<7; i++) {
        const z = 18*D - i * 6*D;
        makeVoxel(3*D, 4*D, 4*D, cBlack, 13*D, 2*D, z, tankHull);
        makeVoxel(1*D, 1*D, 1*D, cMetal, 13*D, 2*D, z, tankHull);
        makeVoxel(3*D, 4*D, 4*D, cBlack, -13*D, 2*D, z, tankHull);
        makeVoxel(1*D, 1*D, 1*D, cMetal, -13*D, 2*D, z, tankHull);
    }
    makeVoxel(4*D, 4*D, 2*D, cMetal, 13*D, 5*D, 23*D, tankHull);
    makeVoxel(4*D, 4*D, 2*D, cMetal, -13*D, 5*D, 23*D, tankHull);
    makeVoxel(4*D, 4*D, 2*D, cMetal, 13*D, 5*D, -23*D, tankHull);
    makeVoxel(4*D, 4*D, 2*D, cMetal, -13*D, 5*D, -23*D, tankHull);
    makeVoxel(7*D, 1*D, 52*D, cTread, 13*D, 0, 0, tankHull);
    makeVoxel(7*D, 1*D, 52*D, cTread, -13*D, 0, 0, tankHull);
    makeVoxel(3*D, 3*D, 1*D, cMetal, 11*D, 7*D, -26*D, tankHull);
    makeVoxel(3*D, 3*D, 1*D, cMetal, -11*D, 7*D, -26*D, tankHull);
    makeVoxel(5*D, 1*D, 5*D, cDark, 0, 8.1*D, -12*D, tankHull);
    makeVoxel(3*D, 1*D, 2*D, cBlack, 0, 8.5*D, -13*D, tankHull);
    const turretPivot = new THREE.Group();
    turretPivot.position.set(0, 7*D, 0);
    turretPivot.scale.setScalar(0.6); 
    playerTank.add(turretPivot);
    turretPivotRef.current = turretPivot;
    makeVoxel(26*D, 5*D, 24*D, cBody, 0, 4*D, 0, turretPivot);
    makeVoxel(11*D, 5*D, 14*D, cBody, -8*D, 4*D, -10*D, turretPivot);
    makeVoxel(11*D, 5*D, 14*D, cBody, 8*D, 4*D, -10*D, turretPivot);
    makeVoxel(4*D, 3*D, 5*D, cBody, 8*D, 8*D, -6*D, turretPivot);
    makeVoxel(3*D, 2*D, 1*D, cBlack, 8*D, 8*D, -8.1*D, turretPivot);
    makeVoxel(10*D, 6*D, 8*D, cBody, 0, 4*D, -14*D, turretPivot);
    makeVoxel(1*D, 1*D, 1*D, cBlack, 3*D, 4*D, -18*D, turretPivot);
    makeVoxel(26*D, 5*D, 14*D, cBody, 0, 5*D, 16*D, turretPivot);
    makeVoxel(20*D, 0.5*D, 8*D, cDark, 0, 7.6*D, 16*D, turretPivot);
    makeVoxel(28*D, 1*D, 1*D, cMetal, 0, 8*D, 24*D, turretPivot);
    makeVoxel(28*D, 1*D, 1*D, cMetal, 0, 4*D, 24*D, turretPivot);
    makeVoxel(1*D, 5*D, 8*D, cMetal, 14*D, 6*D, 20*D, turretPivot);
    makeVoxel(1*D, 5*D, 8*D, cMetal, -14*D, 6*D, 20*D, turretPivot);
    makeVoxel(4*D, 3*D, 3*D, 0x6d4c41, 5*D, 5*D, 22*D, turretPivot);
    makeVoxel(3*D, 4*D, 2*D, 0x3e4a36, -5*D, 5*D, 22*D, turretPivot);
    makeVoxel(6*D, 2*D, 6*D, cBody, 6*D, 7*D, 4*D, turretPivot);
    makeVoxel(1*D, 3*D, 1*D, cMetal, 6*D, 9*D, 4*D, turretPivot);
    makeVoxel(1*D, 1*D, 8*D, cBlack, 6*D, 10*D, 2*D, turretPivot);
    makeVoxel(1.5*D, 2*D, 3*D, cMetal, 6*D, 9.5*D, 4*D, turretPivot);
    makeVoxel(2*D, 1*D, 1*D, cBlack, 6*D, 10*D, 6*D, turretPivot);
    makeVoxel(5*D, 1*D, 5*D, cBody, -6*D, 7*D, 4*D, turretPivot);
    makeVoxel(0.5*D, 0.5*D, 5*D, cBlack, -6*D, 8.5*D, 2*D, turretPivot);
    makeVoxel(0.5*D, 6*D, 0.5*D, cBody, 0, 9*D, 10*D, turretPivot);
    makeVoxel(0.1*D, 12*D, 0.1*D, cBlack, 12*D, 8*D, 10*D, turretPivot);
    makeVoxel(0.1*D, 10*D, 0.1*D, cBlack, -12*D, 8*D, 10*D, turretPivot);
    makeVoxel(3*D, 3*D, 2*D, cDark, 13*D, 5*D, -4*D, turretPivot);
    makeVoxel(3*D, 3*D, 2*D, cDark, -13*D, 5*D, -4*D, turretPivot);
    makeVoxel(3*D, 3*D, 60*D, cBarrel, 0, 4*D, -40*D, turretPivot); 
    makeVoxel(4*D, 4*D, 8*D, cBarrel, 0, 4*D, -45*D, turretPivot); 
    makeVoxel(1*D, 1.5*D, 1*D, cMetal, 0, 5.5*D, -69*D, turretPivot);
    makeVoxel(1.5*D, 1.5*D, 16*D, 0x111111, 6*D, 4*D, -18*D, turretPivot); 
    makeVoxel(0.5*D, 0.5*D, 4*D, 0x000000, 6*D, 4*D, -26*D, turretPivot);  

    const spawnEnemyTank = (x: number, z: number): { mesh: THREE.Group, turret: THREE.Group } => {
        const D = DETAIL;
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.scale.setScalar(1 / D);
        const eGreen = PALETTE.tankBody; 
        const eDark = PALETTE.tankDark;
        const eBlack = PALETTE.tread;
        const eStripe = PALETTE.tankStripe;
        const eCannon = 0x666666;

        makeVoxel(5*D, 6*D, 26*D, eBlack, -9*D, 3*D, 0, group);
        makeVoxel(5*D, 6*D, 26*D, eBlack, 9*D, 3*D, 0, group);
        for(let wz = -11*D; wz <= 11*D; wz+=4*D) {
            makeVoxel(6*D, 3*D, 3*D, 0x222222, -9*D, 1.5*D, wz, group);
            makeVoxel(6*D, 3*D, 3*D, 0x222222, 9*D, 1.5*D, wz, group);
        }
        makeVoxel(14*D, 5*D, 24*D, eGreen, 0, 3.5*D, 0, group);
        makeVoxel(14.2*D, 2*D, 4*D, eStripe, 0, 4.5*D, 5*D, group);
        
        makeVoxel(14*D, 2*D, 10*D, eGreen, 0, 5*D, 10*D, group);
        makeVoxel(14*D, 2*D, 4*D, 0x333333, 0, 6*D, -11*D, group);
        makeVoxel(4*D, 4*D, 2*D, eDark, 5*D, 5*D, -13*D, group);
        makeVoxel(4*D, 4*D, 2*D, eDark, -5*D, 5*D, -13*D, group);
        makeVoxel(2*D, 3*D, 24*D, eGreen, 12*D, 3*D, 0, group);
        makeVoxel(2*D, 3*D, 24*D, eGreen, -12*D, 3*D, 0, group);
        const turret = new THREE.Group();
        turret.position.set(0, 6*D, 0);
        group.add(turret);
        makeVoxel(10*D, 4*D, 10*D, eStripe, 0, 2*D, 0, turret);
        makeVoxel(10.2*D, 1.5*D, 10.2*D, eDark, 0, 2.5*D, 0, turret); 
        makeVoxel(9*D, 3*D, 11*D, eStripe, 0, 2*D, 1*D, turret);
        makeVoxel(8*D, 5*D, 8*D, eStripe, 0, 2*D, -1*D, turret);
        makeVoxel(2*D, 1*D, 1*D, 0x111111, 3*D, 5*D, 3*D, turret);
        makeVoxel(1*D, 2*D, 1*D, 0x222222, 5*D, 3*D, 2*D, turret);
        makeVoxel(1*D, 2*D, 1*D, 0x222222, -5*D, 3*D, 2*D, turret);
        makeVoxel(2*D, 2*D, 20*D, eCannon, 0, 2*D, 12*D, turret); 
        makeVoxel(2.5*D, 2.5*D, 3*D, eCannon, 0, 2*D, 8*D, turret);
        makeVoxel(2.2*D, 2.2*D, 2*D, 0x111111, 0, 2*D, 21*D, turret);
        scene.add(group);
        return { mesh: group, turret };
    };

    const spawnSoldier = (x: number, z: number) => {
        const D = DETAIL;
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.scale.setScalar(1.2 / D);
        const sUniform = PALETTE.soldierUniform;
        const sVest = PALETTE.soldierVest;
        const sSkin = PALETTE.soldierSkin;
        const sBoots = PALETTE.soldierBoots;
        const sGun = PALETTE.gunMetal;
        const sWood = PALETTE.gunWood;
        const lLeg = new THREE.Group();
        lLeg.position.set(-1.1*D, 3.5*D, 0);
        makeVoxel(1.2*D, 1.5*D, 1.8*D, sBoots, 0, -3.2*D, 0.2*D, lLeg);
        makeVoxel(1.1*D, 3.5*D, 1.5*D, sUniform, 0, -1.0*D, 0, lLeg);
        makeVoxel(1.3*D, 1.0*D, 0.5*D, 0x333333, 0, -1.5*D, 0.7*D, lLeg);
        makeVoxel(1.0*D, 0.8*D, 0.4*D, 0x111111, 0, 0.2*D, 0.8*D, lLeg);
        group.add(lLeg);
        const rLeg = new THREE.Group();
        rLeg.position.set(1.1*D, 3.5*D, 0);
        makeVoxel(1.2*D, 1.5*D, 1.8*D, sBoots, 0, -3.2*D, 0.2*D, rLeg);
        makeVoxel(1.1*D, 3.5*D, 1.5*D, sUniform, 0, -1.0*D, 0, rLeg);
        makeVoxel(1.3*D, 1.0*D, 0.5*D, 0x333333, 0, -1.5*D, 0.7*D, rLeg);
        makeVoxel(1.0*D, 0.8*D, 0.4*D, 0x111111, 0, 0.2*D, 0.8*D, rLeg); 
        group.add(rLeg);
        const torso = new THREE.Group();
        torso.position.set(0, 5.5*D, 0);
        makeVoxel(2.8*D, 1.5*D, 2.0*D, 0x222222, 0, -1.5*D, 0, torso);
        makeVoxel(2.6*D, 3.0*D, 1.8*D, sUniform, 0, 0.5*D, 0, torso);
        makeVoxel(2.9*D, 2.5*D, 2.2*D, sVest, 0, 1.0*D, 0, torso);
        makeVoxel(0.8*D, 1.2*D, 0.6*D, sVest, -0.9*D, 0.5*D, 1.2*D, torso); 
        makeVoxel(0.8*D, 1.2*D, 0.6*D, sVest, 0.9*D, 0.5*D, 1.2*D, torso);
        makeVoxel(2.4*D, 2.5*D, 1.0*D, 0x3e3e3e, 0, 1.0*D, -1.2*D, torso);
        makeVoxel(2.2*D, 2.5*D, 1.2*D, 0x2b3a42, 0, 1.5*D, -1.5*D, torso); 
        group.add(torso);
        const head = new THREE.Group();
        head.position.set(0, 8.5*D, 0);
        makeVoxel(1.0*D, 0.8*D, 1.0*D, sSkin, 0, -0.8*D, 0, head);
        makeVoxel(1.8*D, 2.2*D, 2.0*D, sSkin, 0, 0.5*D, 0, head);
        makeVoxel(2.1*D, 1.4*D, 2.3*D, sVest, 0, 1.2*D, 0, head); 
        makeVoxel(2.2*D, 0.4*D, 2.4*D, 0x333333, 0, 0.8*D, 0, head);
        makeVoxel(1.8*D, 0.6*D, 0.5*D, 0x111111, 0, 0.6*D, 1.0*D, head);
        group.add(head);
        const lArm = new THREE.Group();
        lArm.position.set(-2.0*D, 7.5*D, 0);
        makeVoxel(1.4*D, 1.4*D, 1.4*D, sUniform, 0, 0, 0, lArm);
        makeVoxel(1.0*D, 2.5*D, 1.0*D, sUniform, 0, -1.5*D, 0, lArm);
        makeVoxel(0.9*D, 1.0*D, 0.9*D, sSkin, 0, -3.0*D, 0, lArm);
        group.add(lArm);
        const rArm = new THREE.Group();
        rArm.position.set(2.0*D, 7.5*D, 0);
        makeVoxel(1.4*D, 1.4*D, 1.4*D, sUniform, 0, 0, 0, rArm);
        makeVoxel(1.0*D, 2.5*D, 1.0*D, sUniform, 0, -1.5*D, 0, rArm);
        makeVoxel(0.9*D, 1.0*D, 0.9*D, sSkin, 0, -3.0*D, 0, rArm);
        const gun = new THREE.Group();
        gun.position.set(0, -3.0*D, 0);
        makeVoxel(0.5*D, 0.8*D, 4.5*D, sGun, 0, 0, 1.5*D, gun); 
        makeVoxel(0.5*D, 0.6*D, 1.8*D, sWood, 0, 0.2*D, -1.5*D, gun); 
        makeVoxel(0.6*D, 1.5*D, 0.8*D, 0x111111, 0, -0.8*D, 0.5*D, gun); 
        makeVoxel(0.3*D, 0.5*D, 0.3*D, sGun, 0, 0.6*D, 0, gun); 
        gun.rotation.x = -Math.PI / 2;
        rArm.add(gun);
        group.add(rArm);
        scene.add(group);
        return { 
          mesh: group, 
          animParts: { lLeg, rLeg, lArm, rArm, torso, head }
        };
    };

    generateForest();

    let animationFrameId: number;
    const tempMat = new THREE.Matrix4();
    const tempRot = new THREE.Matrix4();
    const activeTanks: THREE.Vector3[] = [];

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isPausedRef.current) {
          return;
      }

      const s = gameState.current;
      if (s.isGameOver) {
          return;
      }
      s.frameCount++;
      let shouldUpdateUI = false;
      const time = performance.now() / 1000;
      const now = performance.now();

      // --- WAVE STATE MACHINE ---
      if (s.waveState === 'countdown') {
          const elapsed = (now - s.stateStartTime) / 1000;
          if (elapsed >= 3) { // 3 Seconds Countdown
              s.waveState = 'spawning';
              s.stateStartTime = now;
              shouldUpdateUI = true;
          } else {
              // Update UI every frame during countdown to animate timer smoothly
              shouldUpdateUI = true; 
          }
      } 
      else if (s.waveState === 'spawning') {
          const elapsed = (now - s.stateStartTime) / 1000;
          const remaining = s.waveDuration - elapsed;
          
          if (remaining <= 0) {
              s.waveState = 'clearing';
              shouldUpdateUI = true;
          } else {
             // Update UI timer
             if (s.frameCount % 10 === 0) shouldUpdateUI = true;

             // --- SPAWNING LOGIC ---
             // Difficulty Multiplier: Waves get harder.
             // Base spawn interval starts at ~140 frames, decreases by 15 per wave, caps at 30 frames.
             const spawnInterval = Math.max(30, 140 - ((s.currentWave - 1) * 15));
             
             if (s.frameCount % spawnInterval === 0) {
                const spawnZ = -280; 
                const spawnX = (Math.random()-0.5) * 250;
                // Tank spawn chance increases with wave number (capped at 30%)
                const tankChance = Math.min(0.30, 0.05 + (s.currentWave * 0.02));
                
                // COMPOUND SPEED MULTIPLIER: 5% faster each wave
                const speedMultiplier = Math.pow(1.05, s.currentWave - 1);

                if(Math.random() < tankChance) {
                    const obj = spawnEnemyTank(spawnX, spawnZ);
                    // Base speed 0.06 * multiplier
                    const speed = 0.06 * speedMultiplier;
                    s.enemies.push({ ...obj, type: 'tank', hp: 1 + Math.floor(s.currentWave/3), speed: speed, state: 'adv', stopZ: -90-Math.random()*60, fireT: 0, hitR: 15 });
                } else {
                    const obj = spawnSoldier(spawnX, spawnZ);
                    // Base speed 0.15 * multiplier
                    const speed = 0.15 * speedMultiplier;
                    s.enemies.push({ ...obj, type: 'soldier', hp: 1, speed: speed, state: 'adv', coverT: 0, hitR: 6, off: Math.random()*100 });
                }
             }
          }
      }
      else if (s.waveState === 'clearing') {
           if (s.enemies.length === 0) {
               s.currentWave++;
               s.waveState = 'countdown';
               s.stateStartTime = now;
               s.playerHP = Math.min(s.maxHp, s.playerHP + 5); // Heal 5 HP after wave
               s.breachCount = Math.max(0, s.breachCount - 2); // Repair breaches
               shouldUpdateUI = true;
           }
           if (s.frameCount % 30 === 0) shouldUpdateUI = true;
      }

      if (foliageMaterialRef.current?.userData?.shader) {
          foliageMaterialRef.current.userData.shader.uniforms.time.value = time;
      }

      if(turretPivotRef.current && cameraRef.current) {
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        const intersect = new THREE.Vector3();
        raycaster.current.ray.intersectPlane(aimPlane.current, intersect);
        if(intersect) {
            const turret = turretPivotRef.current;
            const turretWorldPos = new THREE.Vector3();
            turret.getWorldPosition(turretWorldPos);
            const dx = intersect.x - turretWorldPos.x;
            const dz = intersect.z - turretWorldPos.z;
            const targetAngle = Math.atan2(dx, dz);
            turret.rotation.y = targetAngle + Math.PI;
        }
      }

      activeTanks.length = 0;
      for(let i=0; i<s.enemies.length; i++) {
          if (s.enemies[i].type === 'tank') {
              activeTanks.push(s.enemies[i].mesh.position);
          }
      }

      const dirtyMeshes = new Set<THREE.InstancedMesh>();
      for (let i = 0; i < s.trees.length; i++) {
        const tree = s.trees[i];
        let targetShake = 0;

        for (let j = 0; j < activeTanks.length; j++) {
           const tPos = activeTanks[j];
           const distSq = (tPos.x - tree.pos.x)**2 + (tPos.z - tree.pos.y)**2; 
           if (distSq < 400) { 
               targetShake = 1.0;
               break;
           }
        }

        if (targetShake > 0) {
            tree.shake = Math.min(1, tree.shake + 0.1);
        } else {
            tree.shake *= 0.9;
        }

        if (tree.shake > 0.01) {
            tree.isShaking = true;
            const rotX = Math.sin(time * 15 + tree.index) * 0.15 * tree.shake;
            const rotZ = Math.cos(time * 12 + tree.index) * 0.15 * tree.shake;
            tempRot.makeRotationFromEuler(new THREE.Euler(rotX, 0, rotZ));
            tempMat.multiplyMatrices(tree.baseMatrix, tempRot);
            tree.mesh.setMatrixAt(tree.index, tempMat);
            dirtyMeshes.add(tree.mesh);
        } else if (tree.isShaking) {
            tree.isShaking = false;
            tree.shake = 0;
            tree.mesh.setMatrixAt(tree.index, tree.baseMatrix);
            dirtyMeshes.add(tree.mesh);
        }
      }
      dirtyMeshes.forEach(mesh => mesh.instanceMatrix.needsUpdate = true);

      for(let i=0; i<s.enemies.length; i++) {
          for(let j=i+1; j<s.enemies.length; j++) {
              const e1 = s.enemies[i];
              const e2 = s.enemies[j];
              const dx = e1.mesh.position.x - e2.mesh.position.x;
              const dz = e1.mesh.position.z - e2.mesh.position.z;
              const distSq = dx*dx + dz*dz;
              const r = (e1.type === 'tank' ? 12 : 3) + (e2.type === 'tank' ? 12 : 3);
              
              if(distSq < r*r && distSq > 0.01) {
                  const dist = Math.sqrt(distSq);
                  let forceFactor = 0.05;
                  if (e1.type === 'tank' && e2.type === 'tank') {
                      forceFactor = 0.25; 
                  }
                  const push = (r - dist) * forceFactor;
                  const nx = dx/dist;
                  const nz = dz/dist;
                  e1.mesh.position.x += nx * push;
                  e1.mesh.position.z += nz * push;
                  e2.mesh.position.x -= nx * push;
                  e2.mesh.position.z -= nz * push;
              }
          }
      }

      const detonateShell = (pos: THREE.Vector3) => {
          createExplosion(pos, 0xffaa00, 5);
          s.shakeIntensity = 10;
          s.enemies.forEach(e => {
              if(e.type === 'soldier' && e.hp > 0) {
                  if(e.mesh.position.distanceTo(pos) < 30) {
                      e.hp = 0; 
                      createExplosion(e.mesh.position, 0x8b0000, 1.5);
                      s.score += 10;
                      shouldUpdateUI = true;
                  }
              }
          });
      };

      for(let i = s.enemies.length-1; i >= 0; i--) {
          const e = s.enemies[i];
          if (e.type === 'soldier' && e.hp <= 0) {
               scene.remove(e.mesh);
               s.enemies.splice(i, 1);
               continue;
          }
          if (e.state === 'dying') {
             if (e.deathTimer !== undefined) e.deathTimer--;
             if (s.frameCount % 4 === 0) {
                 const pPos = e.mesh.position.clone();
                 pPos.x += (Math.random() - 0.5) * 3;
                 pPos.z += (Math.random() - 0.5) * 3;
                 pPos.y += 2; 
                 const smokeGeo = unitBoxGeo; 
                 const mat = getMaterial(0x222222);
                 const mesh = new THREE.Mesh(smokeGeo, mat);
                 mesh.position.copy(pPos);
                 mesh.scale.setScalar(1.5 + Math.random());
                 scene.add(mesh);
                 s.particles.push({
                     mesh,
                     vel: new THREE.Vector3(0, 0.1 + Math.random()*0.1, 0),
                     life: 40,
                     gravity: -0.02,
                     drag: 0.95
                 });
                 if(Math.random() > 0.7) {
                    const fMesh = new THREE.Mesh(smokeGeo, getGlowingMaterial(0xffaa00));
                    fMesh.position.copy(pPos);
                    fMesh.scale.setScalar(0.8);
                    scene.add(fMesh);
                    s.particles.push({ mesh: fMesh, vel: new THREE.Vector3(0,0.2,0), life: 10, gravity: -0.02 });
                 }
             }
             if ((e.deathTimer || 0) <= 0) {
                 createExplosion(e.mesh.position, PALETTE.tankBody, 8);
                 scene.remove(e.mesh); 
                 s.enemies.splice(i, 1);
                 s.score += 100; 
                 shouldUpdateUI = true; 
                 s.shakeIntensity = 8;
             }
             continue;
          }

          if(e.type === 'soldier') {
              const animGroups = (e as any).animParts; 
              if(e.state === 'adv') {
                  e.mesh.position.z += e.speed;
                  const walkCycle = s.frameCount * 0.15 + (e.off || 0);
                  const legAmp = 0.8;
                  if (animGroups) {
                    animGroups.lLeg.rotation.x = Math.sin(walkCycle) * legAmp;
                    animGroups.rLeg.rotation.x = Math.sin(walkCycle + Math.PI) * legAmp;
                    animGroups.torso.rotation.y = 0.4; 
                    animGroups.rArm.rotation.x = -1.5; 
                    animGroups.rArm.rotation.y = -0.2;
                    animGroups.rArm.rotation.z = 0;
                    animGroups.lArm.rotation.x = -1.5; 
                    animGroups.lArm.rotation.y = 0.8; 
                    animGroups.lArm.rotation.z = 0.1;
                    const bob = Math.abs(Math.sin(walkCycle)); 
                    animGroups.torso.position.y = 5.5 * DETAIL + bob * 0.2 * DETAIL;
                    animGroups.head.position.y = 8.5 * DETAIL + bob * 0.2 * DETAIL;
                  }
                  if(Math.random() < 0.005) { 
                    let bestPos: THREE.Vector3 | null = null; let dist = 100;
                    const coverHolder = forestRef.current.find(m => m.userData.coverPositions);
                    if (coverHolder && coverHolder.userData.coverPositions) {
                         (coverHolder.userData.coverPositions as THREE.Vector3[]).forEach(pos => {
                            if(pos.z > e.mesh.position.z && pos.z < e.mesh.position.z+80) {
                                const d = pos.distanceTo(e.mesh.position);
                                if(d < dist) { dist = d; bestPos = pos; }
                            }
                        });
                    }
                    if(bestPos) { e.state='seek'; e.target=(bestPos as THREE.Vector3).clone().add(new THREE.Vector3((Math.random()-0.5)*6, 0, -5)); }
                  }
              } else if(e.state === 'seek' && e.target) {
                  const dir = new THREE.Vector3().subVectors(e.target, e.mesh.position);
                  if(dir.length() < 1) { e.state = 'hide'; e.coverT = 180; }
                  else { dir.normalize(); e.mesh.position.add(dir.multiplyScalar(e.speed * 1.5)); }
                  const runCycle = s.frameCount * 0.25;
                  if (animGroups) {
                    animGroups.torso.rotation.y = 0; 
                    animGroups.lLeg.rotation.x = Math.sin(runCycle); 
                    animGroups.rLeg.rotation.x = -Math.sin(runCycle);
                    animGroups.rArm.rotation.x = -1.0; 
                    animGroups.rArm.rotation.y = -0.5; 
                    animGroups.lArm.rotation.x = -1.0; 
                    animGroups.lArm.rotation.y = 0.8; 
                    animGroups.lArm.rotation.z = 0;
                    const bob = Math.abs(Math.sin(runCycle));
                    animGroups.torso.position.y = 5.5 * DETAIL + bob*0.4*DETAIL;
                  }
              } else if(e.state === 'hide') {
                  if (e.coverT) e.coverT--; 
                  e.mesh.position.y = -1.5;
                  if((e.coverT || 0) <= 0) { e.state = 'adv'; e.mesh.position.y = 0; }
              }
              if(e.mesh.position.z > 90) {
                  s.breachCount++; shouldUpdateUI = true;
                  scene.remove(e.mesh); s.enemies.splice(i, 1);
                  if(s.breachCount >= 10) { s.isGameOver = true; onStatsUpdate({ isGameOver: true, failReason: "PERIMETER BREACHED" }); }
                  continue;
              }
          } 
          else {
              if(e.mesh.position.z < (e.stopZ || 0)) {
                  if (playerTankRef.current) {
                      const target = playerTankRef.current.position.clone();
                      target.y = e.mesh.position.y;
                      e.mesh.lookAt(target);
                      e.mesh.translateZ(e.speed * 5);
                  } else {
                      e.mesh.position.z += e.speed * 5;
                  }
                  e.mesh.position.y = Math.sin(s.frameCount*0.5 + e.mesh.position.x)*0.2;
              } else {
                  if (e.turret && playerTankRef.current) {
                    e.turret.lookAt(playerTankRef.current.position);
                  }
                  if (e.fireT !== undefined) e.fireT++;
                  if((e.fireT || 0) > 220 && playerTankRef.current) {
                      e.fireT = 0;
                      const shell = makeVoxel(1.2, 1.2, 2.5, 0xff5500, 0, 0, 0, scene); 
                      const pos = new THREE.Vector3(0, 2 * DETAIL, 21 * DETAIL).applyMatrix4(e.turret!.matrixWorld);
                      shell.position.copy(pos);
                      shell.lookAt(playerTankRef.current.position);
                      s.enemyBullets.push({ 
                        mesh: shell as any, 
                        vel: new THREE.Vector3().subVectors(playerTankRef.current.position, shell.position).normalize().multiplyScalar(1.5), 
                        life: 300,
                        type: 'shell'
                      });
                      createExplosion(pos, 0xffaa00, 0.5);
                  }
              }
          }
          for(let j=s.bullets.length-1; j>=0; j--) {
              const b = s.bullets[j];
              const dx = e.mesh.position.x - b.mesh.position.x;
              const dz = e.mesh.position.z - b.mesh.position.z;
              const distSq = dx*dx + dz*dz;
              if(distSq < e.hitR * e.hitR) {
                  if(b.type === 'mg' && e.type === 'soldier') {
                      createExplosion(e.mesh.position, 0x8b0000, 1);
                      scene.remove(e.mesh); s.enemies.splice(i, 1); 
                      scene.remove(b.mesh); s.bullets.splice(j, 1);
                      s.score += 10; shouldUpdateUI = true; break;
                  } else if(b.type === 'shell' && e.type === 'tank') {
                      if ((e as Enemy).state !== 'dying') {
                          e.hp--; 
                          detonateShell(e.mesh.position); 
                          if(e.hp <= 0) {
                              e.state = 'dying';
                              e.deathTimer = 60; 
                          }
                      }
                      scene.remove(b.mesh); s.bullets.splice(j, 1); break;
                  } else if(b.type === 'mg' && e.type === 'tank') {
                      scene.remove(b.mesh); s.bullets.splice(j, 1);
                  }
              }
          }
      }

      for(let i = s.bullets.length-1; i >= 0; i--) {
          const b = s.bullets[i];
          b.mesh.position.add(b.vel); 
          b.life--;
          if (b.mesh.position.y <= 0) {
              if (b.type === 'shell') {
                  detonateShell(b.mesh.position);
              } else {
                  createExplosion(b.mesh.position, PALETTE.ground, 0.5);
              }
              scene.remove(b.mesh); 
              s.bullets.splice(i, 1);
              continue;
          }
          
          if (b.type === 'shell' && s.frameCount % 2 === 0) {
             const trailSize = 0.8;
             const trailGeo = new THREE.BoxGeometry(trailSize, trailSize, trailSize);
             const isSmoke = Math.random() > 0.3;
             const mat = isSmoke ? getMaterial(0x555555) : getGlowingMaterial(0xffaa00);
             const mesh = new THREE.Mesh(trailGeo, mat);
             mesh.position.copy(b.mesh.position);
             mesh.position.add(new THREE.Vector3((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5));
             mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
             scene.add(mesh);
             s.particles.push({
                 mesh,
                 vel: new THREE.Vector3(0, 0.1, 0), 
                 life: 20 
             });
          }

          if(b.life <= 0) { scene.remove(b.mesh); s.bullets.splice(i, 1); }
      }

      s.enemyBullets.forEach((b, i) => {
          b.mesh.position.add(b.vel); b.life--;
          if(playerTankRef.current && b.mesh.position.distanceTo(playerTankRef.current.position) < 6) { 
              createExplosion(playerTankRef.current.position, 0xffaa00, 4);
              s.playerHP--; shouldUpdateUI = true; s.shakeIntensity = 10;
              scene.remove(b.mesh); s.enemyBullets.splice(i, 1);
              if(s.playerHP <= 0) { s.isGameOver = true; onStatsUpdate({ isGameOver: true, failReason: "ARMOR DESTROYED" }); }
              return;
          }
          if(b.life <= 0) { scene.remove(b.mesh); s.enemyBullets.splice(i, 1); }
      });

      s.particles.forEach((p, i) => {
          const grav = p.gravity !== undefined ? p.gravity : 0.05;
          const drag = p.drag !== undefined ? p.drag : 1.0;

          p.mesh.position.add(p.vel); 
          p.vel.y -= grav;
          p.vel.multiplyScalar(drag);

          p.mesh.rotation.x += 0.1; p.mesh.rotation.z += 0.1;
          
          if(grav > 0 && p.mesh.position.y < 0) { 
              p.mesh.position.y=0; 
              p.vel.y *= -0.5; 
              p.vel.x *= 0.8; 
              p.vel.z *= 0.8; 
          }
          
          p.life--; 
          p.mesh.scale.multiplyScalar(0.92);
          if(p.life <= 0) { scene.remove(p.mesh); s.particles.splice(i, 1); }
      });

      if(s.shakeIntensity > 0) {
          camera.position.copy(camBasePos).add(new THREE.Vector3((Math.random()-0.5)*s.shakeIntensity, (Math.random()-0.5)*s.shakeIntensity, (Math.random()-0.5)*s.shakeIntensity));
          s.shakeIntensity *= 0.9;
          if(s.shakeIntensity < 0.1) s.shakeIntensity = 0;
      }

      renderer.render(scene, camera);
      if (shouldUpdateUI) syncUI();
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onMouseDown = (e: MouseEvent) => {
        if(isPausedRef.current || gameState.current.isGameOver) return;
        initAudio();

        const now = Date.now();
        const s = gameState.current;
        const tp = turretPivotRef.current;
        if(!tp) return;

        raycaster.current.setFromCamera(mouse.current, cameraRef.current!);
        const intersectVec = new THREE.Vector3();
        raycaster.current.ray.intersectPlane(aimPlane.current, intersectVec);

        const D = DETAIL;

        if(e.button === 0 && now - s.lastShotTime_MG > 90) {
            s.lastShotTime_MG = now;
            playSound('mg');

            const geo = new THREE.BoxGeometry(0.2, 0.2, 4.0); 
            const mat = getGlowingMaterial(PALETTE.tracer);
            const mesh = new THREE.Mesh(geo, mat);
            
            const pos = new THREE.Vector3(6*D, 4*D, -26*D).applyMatrix4(tp.matrixWorld);
            mesh.position.copy(pos);
            
            const target = intersectVec.clone();
            const vel = new THREE.Vector3().subVectors(target, pos).normalize();
            
            const spread = 0.03; 
            vel.add(new THREE.Vector3((Math.random()-0.5)*spread, (Math.random()-0.5)*spread, 0));
            vel.normalize().multiplyScalar(10); 

            mesh.lookAt(mesh.position.clone().add(vel)); 
            
            mesh.castShadow = false; mesh.receiveShadow = false;
            scene.add(mesh);
            s.bullets.push({ mesh: mesh as any, vel, type: 'mg', life: 60 }); 

            const fSize = 0.5 + Math.random() * 0.5;
            const flashGeo = new THREE.BoxGeometry(fSize, fSize, fSize * 3);
            const flash = new THREE.Mesh(flashGeo, getGlowingMaterial(PALETTE.tracer));
            flash.position.copy(pos.clone().add(vel.clone().normalize().multiplyScalar(1.5)));
            flash.lookAt(flash.position.clone().add(vel));
            flash.rotation.z = Math.random() * Math.PI;
            scene.add(flash);
            
            const flashLight = new THREE.PointLight(PALETTE.tracer, 3, 15);
            flashLight.position.copy(flash.position);
            scene.add(flashLight);

            setTimeout(() => { scene.remove(flash); scene.remove(flashLight); }, 40);
        }
        else if(e.button === 2 && now - s.lastShotTime_Shell > 2000) {
             s.lastShotTime_Shell = now;
             onStatsUpdate({ cannonReady: false });
             playSound('cannon');
             
             const pos = new THREE.Vector3(0, 4*D, -70*D).applyMatrix4(tp.matrixWorld);

             const geo = new THREE.SphereGeometry(0.6);
             const mat = getGlowingMaterial(PALETTE.shell);
             const mesh = new THREE.Mesh(geo, mat);
             
             mesh.position.copy(pos);
             
             const target = intersectVec.clone();
             const vel = new THREE.Vector3().subVectors(target, pos).normalize().multiplyScalar(5);
             
             const shellLight = new THREE.PointLight(PALETTE.shell, 10, 25);
             mesh.add(shellLight);

             s.bullets.push({ mesh: mesh as any, vel, type: 'shell', life: 100 });
             scene.add(mesh);

             const flashGeo = new THREE.SphereGeometry(3); 
             const flash = new THREE.Mesh(flashGeo, getGlowingMaterial(PALETTE.fire));
             flash.position.copy(pos);
             flash.position.add(vel.clone().normalize().multiplyScalar(2));
             
             const spikeGeo = new THREE.ConeGeometry(1, 8, 8);
             const spike1 = new THREE.Mesh(spikeGeo, getGlowingMaterial(PALETTE.tracer));
             spike1.rotation.x = -Math.PI/2;
             flash.add(spike1);
             
             scene.add(flash);
             const flashLight = new THREE.PointLight(PALETTE.fire, 30, 60);
             flashLight.position.copy(pos);
             scene.add(flashLight);
             
             s.shakeIntensity = 8;
             
             setTimeout(() => { scene.remove(flash); scene.remove(flashLight); }, 80); 
             
             setTimeout(() => {
                 playSound('reload');
                 onStatsUpdate({ cannonReady: true });
             }, 2000);
        }
    };

    const onResize = () => {
        if(cameraRef.current && rendererRef.current) {
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('contextmenu', e => e.preventDefault());
    animate();

    return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('contextmenu', e => e.preventDefault());
        cancelAnimationFrame(animationFrameId);
        if(containerRef.current && rendererRef.current) {
            containerRef.current.removeChild(rendererRef.current.domElement);
        }
    };
  }, [onStatsUpdate]);

  return <div ref={containerRef} className="w-full h-full" />;
});

GameScene.displayName = 'GameScene';
    