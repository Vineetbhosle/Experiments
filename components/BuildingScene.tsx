import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { BuildingParams, DEFAULT_PARAMS } from '../types';

interface Props {
  params: BuildingParams;
}

const SCALE = 0.1; // 1m = 0.1 three.js units for comfortable viewing

export function BuildingScene({ params }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, lastX: 0, lastY: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, distance: 30 });

  const buildBuilding = useCallback((p: BuildingParams) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old building
    if (buildingGroupRef.current) {
      scene.remove(buildingGroupRef.current);
      buildingGroupRef.current.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    }

    const group = new THREE.Group();
    buildingGroupRef.current = group;

    const S = SCALE;
    const totalHeight = p.floors * p.floorHeight;
    const hw = p.buildingWidth / 2;
    const hd = p.buildingDepth / 2;

    // Materials
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(p.glassColor),
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: p.glassOpacity,
      envMapIntensity: 2,
      clearcoat: 1,
      side: THREE.DoubleSide,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.frameColor),
      metalness: 0.8,
      roughness: 0.3,
    });

    const spandrelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.spandrelColor),
      metalness: 0.6,
      roughness: 0.4,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.accentColor),
      emissive: new THREE.Color(p.accentColor),
      emissiveIntensity: p.emissiveStrength,
      metalness: 0.9,
      roughness: 0.1,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.8,
      metalness: 0.1,
    });

    // === PODIUM ===
    if (p.podiumFloors > 0) {
      const podH = p.podiumFloors * p.floorHeight * S;
      const podW = (p.buildingWidth + p.podiumSetback * 2) * S;
      const podD = (p.buildingDepth + p.podiumSetback * 2) * S;
      const podGeo = new THREE.BoxGeometry(podW, podH, podD);
      const podMesh = new THREE.Mesh(podGeo, spandrelMat.clone());
      podMesh.position.y = podH / 2;
      group.add(podMesh);

      // Podium glass curtain wall
      const podGlassGeo = new THREE.BoxGeometry(podW + 0.01, podH, podD + 0.01);
      const podGlassMat = glassMat.clone();
      podGlassMat.opacity = p.glassOpacity * 0.7;
      const podGlass = new THREE.Mesh(podGlassGeo, podGlassMat);
      podGlass.position.y = podH / 2;
      group.add(podGlass);

      // Lobby entrance
      if (p.entranceHeight > 0) {
        const lobbyH = p.entranceHeight * S;
        const lobbyW = Math.min(p.buildingWidth * 0.6, 20) * S;
        const lobbyGeo = new THREE.BoxGeometry(lobbyW, lobbyH, 0.05);
        const lobbyMat = new THREE.MeshPhysicalMaterial({
          color: 0xaaddff,
          transparent: true,
          opacity: 0.2,
          metalness: 1,
          roughness: 0,
          clearcoat: 1,
        });
        const lobby = new THREE.Mesh(lobbyGeo, lobbyMat);
        lobby.position.set(0, lobbyH / 2, podD / 2 + 0.01);
        group.add(lobby);
      }
    }

    // === MAIN TOWER ===
    const baseY = p.podiumFloors * p.floorHeight * S;

    // Build floor by floor for twist + taper + waviness
    const towerFloors = p.floors - p.podiumFloors;
    const floorGeoCache: THREE.BufferGeometry[] = [];

    for (let i = 0; i < towerFloors; i++) {
      const floorIdx = i + p.podiumFloors;
      const t = towerFloors > 1 ? i / (towerFloors - 1) : 0;

      // Taper
      const taper = 1 - t * (1 - p.taperRatio);

      // Setback
      let setback = 0;
      if (p.setbackInterval > 0) {
        setback = Math.floor(floorIdx / p.setbackInterval) * p.setbackAmount;
      }

      const floorW = (hw * taper - setback) * 2;
      const floorD = (hd * taper - setback + hd * p.asymmetry * Math.sin(t * Math.PI)) * 2;
      if (floorW <= 0 || floorD <= 0) continue;

      // Waviness
      const wave = p.facadeWaviness * Math.sin(t * Math.PI * 2 * p.waveFrequency);
      const curW = (floorW + wave * 2) * S;
      const curD = (floorD + wave * 2) * S;

      // Twist
      const twist = (p.twistAngle * Math.PI / 180) * t;

      const fh = p.floorHeight * S;
      const y = baseY + i * fh;

      // Spandrel band
      const spandrelH = p.spandrelHeight * S;
      const spGeo = new THREE.BoxGeometry(curW, spandrelH, curD);
      const sp = new THREE.Mesh(spGeo, spandrelMat);
      sp.position.y = y + fh - spandrelH / 2;
      sp.rotation.y = twist;
      group.add(sp);

      // Glass panel
      const glH = fh * p.glazingRatio;
      const glGeo = new THREE.BoxGeometry(curW + 0.005, glH, curD + 0.005);

      // Determine if this floor is "lit"
      const isLit = Math.random() < p.stripLightFloors;
      let mat = glassMat;
      if (isLit && p.emissiveStrength > 0) {
        mat = glassMat.clone();
        const warmth = new THREE.Color(0xffeedd);
        mat.emissive = warmth;
        mat.emissiveIntensity = p.emissiveStrength * 0.3;
      }

      const gl = new THREE.Mesh(glGeo, mat);
      gl.position.y = y + glH / 2 + p.slabThickness * S;
      gl.rotation.y = twist;
      group.add(gl);

      // Mullions (vertical lines on facade) - simplified
      if (p.mullionWidth > 0.03) {
        const mullionCount = Math.floor(floorW / p.panelWidth);
        for (let side = 0; side < 4; side++) {
          for (let m = 0; m < Math.min(mullionCount, 20); m++) {
            const mGeo = new THREE.BoxGeometry(p.mullionWidth * S, fh, p.mullionWidth * S);
            const mMesh = new THREE.Mesh(mGeo, frameMat);
            const frac = mullionCount > 1 ? m / (mullionCount - 1) - 0.5 : 0;

            if (side === 0) mMesh.position.set(frac * curW, y + fh / 2, curD / 2);
            else if (side === 1) mMesh.position.set(frac * curW, y + fh / 2, -curD / 2);
            else if (side === 2) mMesh.position.set(curW / 2, y + fh / 2, frac * curD);
            else mMesh.position.set(-curW / 2, y + fh / 2, frac * curD);

            mMesh.rotation.y = twist;
            group.add(mMesh);
          }
        }
      }

      // Slab edge (floor plate visible line)
      const slabGeo = new THREE.BoxGeometry(curW + 0.02, p.slabThickness * S, curD + 0.02);
      const slab = new THREE.Mesh(slabGeo, concreteMat);
      slab.position.y = y;
      slab.rotation.y = twist;
      group.add(slab);

      // Balconies
      if (p.balconyFrequency > 0 && Math.random() < p.balconyFrequency) {
        const balcD = p.balconyDepth * S;
        const balcW = curW * 0.3;
        const balcGeo = new THREE.BoxGeometry(balcW, 0.05, balcD);
        const balc = new THREE.Mesh(balcGeo, concreteMat);
        const balcSide = Math.random() > 0.5 ? 1 : -1;
        balc.position.set(0, y + 0.025, balcSide * (curD / 2 + balcD / 2));
        balc.rotation.y = twist;
        group.add(balc);

        // Glass railing
        const railGeo = new THREE.BoxGeometry(balcW, fh * 0.3, 0.02);
        const railMat = new THREE.MeshPhysicalMaterial({
          color: 0xccddee,
          transparent: true,
          opacity: 0.3,
          metalness: 1,
          roughness: 0,
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(0, y + fh * 0.15, balcSide * (curD / 2 + balcD));
        rail.rotation.y = twist;
        group.add(rail);
      }

      // Louvers (sun shading)
      if (p.louverDensity > 0 && Math.random() < p.louverDensity) {
        const louverCount = 3;
        for (let l = 0; l < louverCount; l++) {
          const lGeo = new THREE.BoxGeometry(curW * 0.8, 0.02, 0.3 * S);
          const lMesh = new THREE.Mesh(lGeo, frameMat);
          lMesh.position.set(0, y + fh * (l + 1) / (louverCount + 1), curD / 2 + 0.2 * S);
          lMesh.rotation.x = (p.louverAngle * Math.PI) / 180;
          lMesh.rotation.y = twist;
          group.add(lMesh);
        }
      }

      // Double skin
      if (p.doubleSkinn === 1) {
        const dsGeo = new THREE.BoxGeometry(curW + 0.15, fh, curD + 0.15);
        const dsMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.08,
          metalness: 0.5,
          roughness: 0,
          side: THREE.DoubleSide,
        });
        const ds = new THREE.Mesh(dsGeo, dsMat);
        ds.position.y = y + fh / 2;
        ds.rotation.y = twist;
        group.add(ds);
      }
    }

    // === CORE ===
    const coreW = p.buildingWidth * p.coreSizeRatio * S;
    const coreD = p.buildingDepth * p.coreSizeRatio * S;
    const coreH = totalHeight * S;
    const coreGeo = new THREE.BoxGeometry(coreW, coreH, coreD);
    const core = new THREE.Mesh(coreGeo, concreteMat);
    core.position.y = coreH / 2;
    group.add(core);

    // === ROOF ===
    const roofBase = totalHeight * S;

    if (p.roofStyle === 1) {
      // Sloped
      const rGeo = new THREE.ConeGeometry(hw * S * p.taperRatio, p.roofHeight * S, 4);
      const r = new THREE.Mesh(rGeo, frameMat);
      r.position.y = roofBase + p.roofHeight * S / 2;
      r.rotation.y = Math.PI / 4;
      group.add(r);
    } else if (p.roofStyle === 2) {
      // Crown - stepped rings with accent lighting
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const rt = i / rings;
        const rw = hw * S * p.taperRatio * (1 - rt * 0.6);
        const rh = (p.roofHeight * S) / rings;
        const rGeo = new THREE.BoxGeometry(rw * 2, rh, rw * 2);
        const r = new THREE.Mesh(rGeo, i % 2 === 0 ? frameMat : accentMat);
        r.position.y = roofBase + i * rh + rh / 2;
        group.add(r);
      }
    } else if (p.roofStyle === 3) {
      // Spire
      const spireGeo = new THREE.ConeGeometry(hw * S * 0.15, p.roofHeight * S, 8);
      const spire = new THREE.Mesh(spireGeo, accentMat);
      spire.position.y = roofBase + p.roofHeight * S / 2;
      group.add(spire);

      // Support ring
      const ringGeo = new THREE.TorusGeometry(hw * S * p.taperRatio * 0.5, 0.1, 8, 24);
      const ring = new THREE.Mesh(ringGeo, accentMat);
      ring.position.y = roofBase;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    // === CROWN LIGHTING ===
    if (p.crownLighting === 1) {
      const crownGeo = new THREE.BoxGeometry(
        hw * 2 * S * p.taperRatio + 0.2,
        0.3,
        hd * 2 * S * p.taperRatio + 0.2
      );
      const crownMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.accentColor),
        emissive: new THREE.Color(p.accentColor),
        emissiveIntensity: p.emissiveStrength * 2,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = roofBase + 0.15;
      group.add(crown);

      // Vertical accent strips on corners
      for (let cx = -1; cx <= 1; cx += 2) {
        for (let cz = -1; cz <= 1; cz += 2) {
          const stripGeo = new THREE.BoxGeometry(0.08, coreH * 0.1, 0.08);
          const strip = new THREE.Mesh(stripGeo, crownMat);
          strip.position.set(
            cx * hw * S * p.taperRatio,
            roofBase - coreH * 0.05,
            cz * hd * S * p.taperRatio
          );
          group.add(strip);
        }
      }
    }

    // === ANTENNA ===
    if (p.antennaHeight > 0) {
      const antGeo = new THREE.CylinderGeometry(0.05, 0.08, p.antennaHeight * S, 6);
      const ant = new THREE.Mesh(antGeo, frameMat);
      ant.position.y = roofBase + p.roofHeight * S + p.antennaHeight * S / 2;
      group.add(ant);

      // Blinking light
      const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const lightMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 3,
      });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.y = roofBase + p.roofHeight * S + p.antennaHeight * S;
      group.add(light);
    }

    // === HELIPAD ===
    if (p.helipad === 1) {
      const padR = Math.min(hw, hd) * 0.4 * S;
      const padGeo = new THREE.CylinderGeometry(padR, padR, 0.05, 32);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x334444, roughness: 0.6 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(hw * S * p.taperRatio * 0.3, roofBase + 0.05, 0);
      group.add(pad);

      // H marking
      const hGeo = new THREE.BoxGeometry(padR * 0.6, 0.02, padR * 0.08);
      const hMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
      const h1 = new THREE.Mesh(hGeo, hMat);
      h1.position.set(hw * S * p.taperRatio * 0.3, roofBase + 0.08, 0);
      group.add(h1);
      const h2 = new THREE.Mesh(new THREE.BoxGeometry(padR * 0.08, 0.02, padR * 0.5), hMat);
      h2.position.copy(h1.position);
      group.add(h2);
    }

    // === CANOPY ===
    if (p.canopy === 1) {
      const canW = p.buildingWidth * 0.8 * S;
      const canD = p.canopyExtension * S;
      const canGeo = new THREE.BoxGeometry(canW, 0.08, canD);
      const canMesh = new THREE.Mesh(canGeo, frameMat);
      const podTop = p.podiumFloors > 0 ? p.podiumFloors * p.floorHeight * S : p.floorHeight * S;
      canMesh.position.set(0, podTop * 0.6, (hd + p.podiumSetback) * S + canD / 2);
      group.add(canMesh);

      // Canopy accent light
      const canLightGeo = new THREE.BoxGeometry(canW, 0.02, canD);
      const canLight = new THREE.Mesh(canLightGeo, accentMat);
      canLight.position.copy(canMesh.position);
      canLight.position.y -= 0.05;
      group.add(canLight);
    }

    // === GROUND PLANE ===
    const gpSize = p.groundPlaneSize * S;
    const gpGeo = new THREE.PlaneGeometry(gpSize, gpSize);
    const gpMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const gp = new THREE.Mesh(gpGeo, gpMat);
    gp.rotation.x = -Math.PI / 2;
    gp.position.y = -0.01;
    group.add(gp);

    // Grid lines on ground
    const gridHelper = new THREE.GridHelper(gpSize, 40, 0x333355, 0x222244);
    gridHelper.position.y = 0;
    group.add(gridHelper);

    // === WATER FEATURE ===
    if (p.waterFeature >= 1) {
      const waterSize = Math.min(hw, hd) * 1.5 * S;
      let waterGeo: THREE.BufferGeometry;
      if (p.waterFeature === 2) {
        waterGeo = new THREE.CircleGeometry(waterSize, 32);
      } else {
        waterGeo = new THREE.PlaneGeometry(waterSize * 2, waterSize);
      }
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x004466,
        metalness: 0.9,
        roughness: 0,
        transparent: true,
        opacity: 0.7,
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.01, (hd + p.podiumSetback + 8) * S);
      group.add(water);
    }

    // === SURROUNDING BUILDINGS ===
    if (p.surroundingBuildings > 0) {
      const rng = (seed: number) => {
        let x = Math.sin(seed * 127.1) * 43758.5453;
        return x - Math.floor(x);
      };
      for (let i = 0; i < p.surroundingBuildings; i++) {
        const bh = (10 + rng(i * 3) * 80) * S;
        const bw = (8 + rng(i * 7) * 25) * S;
        const bd = (8 + rng(i * 11) * 25) * S;
        const angle = (i / p.surroundingBuildings) * Math.PI * 2;
        const dist = (40 + rng(i * 13) * 80) * S;

        const bgGeo = new THREE.BoxGeometry(bw, bh, bd);
        const bgMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.6, 0.1, 0.15 + rng(i * 17) * 0.1),
          roughness: 0.7,
          metalness: 0.3,
        });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.set(Math.cos(angle) * dist, bh / 2, Math.sin(angle) * dist);
        group.add(bg);

        // Window lights
        const winMat = new THREE.MeshStandardMaterial({
          color: 0xffeedd,
          emissive: 0xffeedd,
          emissiveIntensity: rng(i * 19) * 0.5,
          transparent: true,
          opacity: 0.3,
        });
        const winGeo = new THREE.BoxGeometry(bw + 0.01, bh, bd + 0.01);
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.copy(bg.position);
        group.add(win);
      }
    }

    // === LANDSCAPING ===
    if (p.landscaping > 0) {
      const treeCount = Math.floor(p.landscaping * 30);
      for (let i = 0; i < treeCount; i++) {
        const rng2 = (s: number) => {
          let x = Math.sin(s * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        const angle = rng2(i * 23) * Math.PI * 2;
        const dist = (20 + rng2(i * 29) * 40) * S;
        const treeH = (3 + rng2(i * 31) * 5) * S;

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.04, 0.06, treeH * 0.4, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(Math.cos(angle) * dist, treeH * 0.2, Math.sin(angle) * dist);
        group.add(trunk);

        // Canopy
        const canopyGeo = new THREE.SphereGeometry(treeH * 0.3, 6, 6);
        const canopyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3, 0.5 + rng2(i * 37) * 0.3, 0.2 + rng2(i * 41) * 0.15),
        });
        const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
        canopyMesh.position.set(Math.cos(angle) * dist, treeH * 0.55, Math.sin(angle) * dist);
        group.add(canopyMesh);
      }
    }

    // Center the building
    scene.add(group);

    // Update camera distance based on building size
    const maxDim = Math.max(totalHeight, p.buildingWidth, p.buildingDepth) * S;
    cameraAngleRef.current.distance = maxDim * 1.8;

  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Sky color based on style
    const skyColors = [0x87ceeb, 0xff6633, 0x0a0a1e];
    scene.background = new THREE.Color(skyColors[DEFAULT_PARAMS.skyStyle]);
    scene.fog = new THREE.FogExp2(skyColors[DEFAULT_PARAMS.skyStyle], 0.008);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0x334466, DEFAULT_PARAMS.ambientIntensity);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 2);
    sun.position.set(20, 30, 15);
    sun.castShadow = true;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4488cc, 0.8);
    rim.position.set(-15, 10, -20);
    scene.add(rim);

    const fill = new THREE.HemisphereLight(0x8899bb, 0x223344, 0.6);
    scene.add(fill);

    // Build initial
    buildBuilding(DEFAULT_PARAMS);

    // Mouse controls
    const onMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDown = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };
    const onMouseUp = () => { mouseRef.current.isDown = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseRef.current.isDown) return;
      const dx = e.clientX - mouseRef.current.lastX;
      const dy = e.clientY - mouseRef.current.lastY;
      cameraAngleRef.current.theta -= dx * 0.005;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi - dy * 0.005));
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      cameraAngleRef.current.distance *= e.deltaY > 0 ? 1.1 : 0.9;
      cameraAngleRef.current.distance = Math.max(2, Math.min(200, cameraAngleRef.current.distance));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const { theta, phi, distance } = cameraAngleRef.current;
      const targetY = (params.floors * params.floorHeight * SCALE) / 2;
      camera.position.set(
        distance * Math.sin(phi) * Math.cos(theta),
        targetY + distance * Math.cos(phi),
        distance * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Rebuild when params change
  useEffect(() => {
    if (!sceneRef.current) return;

    // Update sky
    const skyColors = [0x87ceeb, 0xff6633, 0x0a0a1e];
    sceneRef.current.background = new THREE.Color(skyColors[params.skyStyle] || 0x0a0a1e);
    sceneRef.current.fog = new THREE.FogExp2(skyColors[params.skyStyle] || 0x0a0a1e, 0.008);

    // Update ambient light
    const ambient = sceneRef.current.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight;
    if (ambient) ambient.intensity = params.ambientIntensity;

    // Update sun angle
    const sun = sceneRef.current.children.find(c => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (sun) {
      const rad = (params.sunAngle * Math.PI) / 180;
      sun.position.set(Math.cos(rad) * 30, 30, Math.sin(rad) * 30);
    }

    buildBuilding(params);
  }, [params, buildBuilding]);

  return <div ref={mountRef} className="w-full h-full" />;
}
