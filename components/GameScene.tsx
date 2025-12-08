import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import {
  GameState,
  Station,
  MetroLine,
  Train,
  Passenger,
  StationShape,
  Position,
  GAME_CONFIG,
  LINE_COLORS,
} from '../types';

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const distance = (a: Position, b: Position) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const SHAPES: StationShape[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'star'];

// Color palette for minimalist 3D look
const COLORS = {
  background: 0x1a1a2e,
  ground: 0x16213e,
  groundGrid: 0x0f3460,
  station: 0xffffff,
  stationHover: 0x4fc3f7,
  passenger: 0xffffff,
  passengerUrgent: 0xff5252,
};

const getRandomShape = (): StationShape => {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
};

const getRandomPosition = (stations: Station[], padding = 12): Position => {
  const margin = 8;
  const mapSize = 80;
  let attempts = 0;
  while (attempts < 100) {
    const pos = {
      x: -mapSize/2 + margin + Math.random() * (mapSize - 2 * margin),
      y: -mapSize/2 + margin + Math.random() * (mapSize - 2 * margin),
    };
    const tooClose = stations.some((s) => distance(s.position, pos) < padding);
    if (!tooClose) return pos;
    attempts++;
  }
  return {
    x: -mapSize/2 + margin + Math.random() * (mapSize - 2 * margin),
    y: -mapSize/2 + margin + Math.random() * (mapSize - 2 * margin),
  };
};

const createStation = (stations: Station[]): Station => {
  const existingShapes = new Set(stations.map((s) => s.shape));
  let shape: StationShape;

  if (stations.length < SHAPES.length) {
    const unusedShapes = SHAPES.filter((s) => !existingShapes.has(s));
    shape = unusedShapes.length > 0 ? unusedShapes[0] : getRandomShape();
  } else {
    shape = getRandomShape();
  }

  return {
    id: generateId(),
    shape,
    position: getRandomPosition(stations),
    passengers: [],
    maxPassengers: GAME_CONFIG.STATION_MAX_CAPACITY,
    connectedLines: [],
  };
};

const createPassenger = (station: Station, allStations: Station[]): Passenger | null => {
  const otherShapes = allStations
    .filter((s) => s.shape !== station.shape)
    .map((s) => s.shape);

  if (otherShapes.length === 0) return null;

  const destination = otherShapes[Math.floor(Math.random() * otherShapes.length)];

  return {
    id: generateId(),
    destination,
    waitTime: 0,
    maxWaitTime: GAME_CONFIG.PASSENGER_MAX_WAIT,
  };
};

// Create 3D shape geometry based on station shape
const createShapeGeometry = (shape: StationShape, size: number = 1): THREE.BufferGeometry => {
  switch (shape) {
    case 'circle':
      return new THREE.CylinderGeometry(size, size, 0.3, 32);
    case 'square':
      return new THREE.BoxGeometry(size * 1.8, 0.3, size * 1.8);
    case 'triangle':
      return new THREE.ConeGeometry(size, 0.5, 3);
    case 'diamond':
      return new THREE.OctahedronGeometry(size * 0.8);
    case 'pentagon':
      return new THREE.CylinderGeometry(size, size, 0.3, 5);
    case 'star':
      // Create a star shape
      const starShape = new THREE.Shape();
      const outerRadius = size;
      const innerRadius = size * 0.5;
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
      }
      starShape.closePath();
      return new THREE.ExtrudeGeometry(starShape, { depth: 0.3, bevelEnabled: false });
    default:
      return new THREE.CylinderGeometry(size, size, 0.3, 32);
  }
};

// 3D Game Component
interface MetroGameProps {
  onGameOver: (score: number) => void;
  isPaused: boolean;
}

export const MetroGame: React.FC<MetroGameProps> = ({ onGameOver, isPaused }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stationMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const lineMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const trainMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const passengerMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const drawingLineRef = useRef<THREE.Line | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const initialStations: Station[] = [];
    for (let i = 0; i < GAME_CONFIG.INITIAL_STATIONS; i++) {
      initialStations.push(createStation(initialStations));
    }

    return {
      stations: initialStations,
      lines: [],
      availableTrains: GAME_CONFIG.INITIAL_TRAINS,
      score: 0,
      passengersDelivered: 0,
      gameTime: 0,
      isGameOver: false,
      isPaused: false,
      selectedLine: null,
      isDrawingLine: false,
      drawingFromStation: null,
      mousePosition: null,
    };
  });

  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  const lastUpdateRef = useRef<number>(Date.now());
  const stationSpawnTimerRef = useRef<number>(0);
  const passengerSpawnTimerRef = useRef<number>(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    scene.fog = new THREE.Fog(COLORS.background, 80, 150);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 70, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 50, COLORS.groundGrid, COLORS.groundGrid);
    gridHelper.position.y = -0.4;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(30, 50, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 150;
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    scene.add(directionalLight);

    // Accent light
    const accentLight = new THREE.PointLight(0x4fc3f7, 0.5, 100);
    accentLight.position.set(-30, 20, -30);
    scene.add(accentLight);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Update 3D stations
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old stations that no longer exist
    stationMeshesRef.current.forEach((mesh, id) => {
      if (!gameState.stations.find(s => s.id === id)) {
        scene.remove(mesh);
        stationMeshesRef.current.delete(id);
      }
    });

    // Add/update stations
    gameState.stations.forEach((station) => {
      let stationGroup = stationMeshesRef.current.get(station.id);

      if (!stationGroup) {
        // Create new station
        stationGroup = new THREE.Group();
        stationGroup.userData.stationId = station.id;

        // Base platform
        const baseGeometry = new THREE.CylinderGeometry(2.5, 3, 0.5, 32);
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: 0x2d2d44,
          roughness: 0.7,
          metalness: 0.3,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        base.castShadow = true;
        base.receiveShadow = true;
        stationGroup.add(base);

        // Shape indicator on top
        const shapeGeometry = createShapeGeometry(station.shape, 1.2);
        const shapeMaterial = new THREE.MeshStandardMaterial({
          color: COLORS.station,
          roughness: 0.3,
          metalness: 0.5,
          emissive: 0xffffff,
          emissiveIntensity: 0.1,
        });
        const shapeMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
        shapeMesh.position.y = 0.7;
        if (station.shape === 'star') {
          shapeMesh.rotation.x = -Math.PI / 2;
          shapeMesh.position.y = 0.85;
        }
        if (station.shape === 'diamond') {
          shapeMesh.scale.set(1, 0.5, 1);
          shapeMesh.position.y = 1;
        }
        shapeMesh.castShadow = true;
        shapeMesh.name = 'shapeIndicator';
        stationGroup.add(shapeMesh);

        // Glow ring
        const ringGeometry = new THREE.RingGeometry(2.8, 3.2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        ring.name = 'glowRing';
        stationGroup.add(ring);

        stationGroup.position.set(station.position.x, 0, station.position.y);
        scene.add(stationGroup);
        stationMeshesRef.current.set(station.id, stationGroup);
      }

      // Update hover state
      const isHovered = hoveredStation === station.id;
      const isDrawingFrom = gameState.drawingFromStation === station.id;
      const ring = stationGroup.getObjectByName('glowRing') as THREE.Mesh;
      if (ring && ring.material instanceof THREE.MeshBasicMaterial) {
        ring.material.opacity = (isHovered || isDrawingFrom) ? 0.8 : 0.3;
        ring.material.color.setHex((isHovered || isDrawingFrom) ? 0x4fc3f7 : 0x4fc3f7);
      }

      // Update passengers display
      // Remove old passenger meshes for this station
      station.passengers.forEach((passenger, index) => {
        const meshId = `${station.id}-${passenger.id}`;
        let passengerMesh = passengerMeshesRef.current.get(meshId);

        if (!passengerMesh) {
          const pGeometry = createShapeGeometry(passenger.destination, 0.4);
          const urgency = passenger.waitTime / passenger.maxWaitTime;
          const pMaterial = new THREE.MeshStandardMaterial({
            color: urgency > 0.6 ? COLORS.passengerUrgent : COLORS.passenger,
            emissive: urgency > 0.6 ? 0xff0000 : 0xffffff,
            emissiveIntensity: urgency > 0.6 ? 0.5 : 0.2,
          });
          passengerMesh = new THREE.Mesh(pGeometry, pMaterial);
          passengerMesh.castShadow = true;
          scene.add(passengerMesh);
          passengerMeshesRef.current.set(meshId, passengerMesh);
        }

        // Position passengers in a circle around the station
        const angle = (index / Math.max(station.passengers.length, 6)) * Math.PI * 2;
        const radius = 4;
        passengerMesh.position.set(
          station.position.x + Math.cos(angle) * radius,
          1 + Math.sin(Date.now() * 0.003 + index) * 0.2,
          station.position.y + Math.sin(angle) * radius
        );

        // Update color based on urgency
        const urgency = passenger.waitTime / passenger.maxWaitTime;
        if (passengerMesh.material instanceof THREE.MeshStandardMaterial) {
          if (urgency > 0.6) {
            passengerMesh.material.color.setHex(COLORS.passengerUrgent);
            passengerMesh.material.emissive.setHex(0xff0000);
            passengerMesh.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
          }
        }
      });
    });

    // Clean up passenger meshes that are no longer needed
    passengerMeshesRef.current.forEach((mesh, id) => {
      const [stationId, passengerId] = id.split('-');
      const station = gameState.stations.find(s => s.id === stationId);
      if (!station || !station.passengers.find(p => p.id === passengerId)) {
        scene.remove(mesh);
        passengerMeshesRef.current.delete(id);
      }
    });

  }, [gameState.stations, hoveredStation, gameState.drawingFromStation]);

  // Update 3D metro lines
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old lines
    lineMeshesRef.current.forEach((group, id) => {
      if (!gameState.lines.find(l => l.id === id)) {
        scene.remove(group);
        lineMeshesRef.current.delete(id);
      }
    });

    // Add/update lines
    gameState.lines.forEach((line) => {
      if (line.stations.length < 2) return;

      let lineGroup = lineMeshesRef.current.get(line.id);

      // Always recreate line to reflect station changes
      if (lineGroup) {
        scene.remove(lineGroup);
      }

      lineGroup = new THREE.Group();

      // Create tube path
      const points: THREE.Vector3[] = [];
      line.stations.forEach((stationId) => {
        const station = gameState.stations.find(s => s.id === stationId);
        if (station) {
          points.push(new THREE.Vector3(station.position.x, 1.5, station.position.y));
        }
      });

      if (points.length >= 2) {
        // Create curved path
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);
        const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 10, 0.4, 8, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
          color: line.color,
          roughness: 0.3,
          metalness: 0.7,
          emissive: line.color,
          emissiveIntensity: 0.2,
        });
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.castShadow = true;
        lineGroup.add(tube);

        // Inner white core
        const innerGeometry = new THREE.TubeGeometry(curve, points.length * 10, 0.15, 8, false);
        const innerMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        });
        const innerTube = new THREE.Mesh(innerGeometry, innerMaterial);
        lineGroup.add(innerTube);
      }

      scene.add(lineGroup);
      lineMeshesRef.current.set(line.id, lineGroup);
    });

  }, [gameState.lines, gameState.stations]);

  // Update 3D trains
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Collect all current train IDs
    const currentTrainIds = new Set<string>();
    gameState.lines.forEach(line => {
      line.trains.forEach(train => currentTrainIds.add(train.id));
    });

    // Remove old trains
    trainMeshesRef.current.forEach((mesh, id) => {
      if (!currentTrainIds.has(id)) {
        scene.remove(mesh);
        trainMeshesRef.current.delete(id);
      }
    });

    // Add/update trains
    gameState.lines.forEach((line) => {
      const lineColor = line.color;

      line.trains.forEach((train) => {
        let trainMesh = trainMeshesRef.current.get(train.id);

        if (!trainMesh) {
          // Create train mesh
          const trainGeometry = new THREE.BoxGeometry(2, 1, 1.2);
          const trainMaterial = new THREE.MeshStandardMaterial({
            color: lineColor,
            roughness: 0.2,
            metalness: 0.8,
            emissive: lineColor,
            emissiveIntensity: 0.3,
          });
          trainMesh = new THREE.Mesh(trainGeometry, trainMaterial);
          trainMesh.castShadow = true;

          // Add windows
          const windowGeometry = new THREE.BoxGeometry(0.3, 0.4, 1.25);
          const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
          const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
          window1.position.set(-0.5, 0.1, 0);
          trainMesh.add(window1);
          const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
          window2.position.set(0.5, 0.1, 0);
          trainMesh.add(window2);

          scene.add(trainMesh);
          trainMeshesRef.current.set(train.id, trainMesh);
        }

        // Update train position
        trainMesh.position.set(train.position.x, 2, train.position.y);

        // Calculate rotation based on movement direction
        if (line.stations.length >= 2) {
          const currentIdx = train.currentStationIndex;
          const nextIdx = currentIdx + train.direction;
          if (nextIdx >= 0 && nextIdx < line.stations.length) {
            const currentStation = gameState.stations.find(s => s.id === line.stations[currentIdx]);
            const nextStation = gameState.stations.find(s => s.id === line.stations[nextIdx]);
            if (currentStation && nextStation) {
              const angle = Math.atan2(
                nextStation.position.y - currentStation.position.y,
                nextStation.position.x - currentStation.position.x
              );
              trainMesh.rotation.y = -angle + Math.PI / 2;
            }
          }
        }
      });
    });

  }, [gameState.lines]);

  // Mouse interaction
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Check for station hover
    const stationMeshes: THREE.Object3D[] = [];
    stationMeshesRef.current.forEach((mesh) => stationMeshes.push(mesh));
    const intersects = raycasterRef.current.intersectObjects(stationMeshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.stationId) {
        obj = obj.parent;
      }
      if (obj.userData.stationId) {
        setHoveredStation(obj.userData.stationId);
      }
    } else {
      setHoveredStation(null);
    }

    // Update drawing line
    if (gameState.isDrawingLine && gameState.drawingFromStation) {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
      const intersectPoint = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(groundPlane, intersectPoint);

      if (intersectPoint) {
        setGameState(prev => ({
          ...prev,
          mousePosition: { x: intersectPoint.x, y: intersectPoint.z }
        }));
      }
    }
  }, [gameState.isDrawingLine, gameState.drawingFromStation]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (hoveredStation) {
      setGameState(prev => ({
        ...prev,
        isDrawingLine: true,
        drawingFromStation: hoveredStation,
      }));
    }
  }, [hoveredStation]);

  const handleMouseUp = useCallback(() => {
    if (!gameState.isDrawingLine || !gameState.drawingFromStation) {
      setGameState(prev => ({
        ...prev,
        isDrawingLine: false,
        drawingFromStation: null,
        mousePosition: null,
      }));
      return;
    }

    if (hoveredStation && hoveredStation !== gameState.drawingFromStation) {
      const fromStation = gameState.stations.find(s => s.id === gameState.drawingFromStation);
      const targetStation = gameState.stations.find(s => s.id === hoveredStation);

      if (fromStation && targetStation) {
        // Check if already connected
        const existingLine = gameState.lines.find(
          line => line.stations.includes(fromStation.id) && line.stations.includes(targetStation.id)
        );

        if (!existingLine) {
          // Check if we can extend an existing line
          let lineToExtend: MetroLine | null = null;
          for (const line of gameState.lines) {
            if (line.stations[0] === fromStation.id || line.stations[line.stations.length - 1] === fromStation.id) {
              if (!line.stations.includes(targetStation.id)) {
                lineToExtend = line;
                break;
              }
            }
          }

          setGameState(prev => {
            let newLines = [...prev.lines];
            let newStations = [...prev.stations];

            if (lineToExtend) {
              const updatedLine = { ...lineToExtend };
              if (updatedLine.stations[0] === fromStation.id) {
                updatedLine.stations = [targetStation.id, ...updatedLine.stations];
              } else {
                updatedLine.stations = [...updatedLine.stations, targetStation.id];
              }
              newLines = newLines.map(l => l.id === lineToExtend!.id ? updatedLine : l);
              newStations = newStations.map(s => {
                if (s.id === targetStation.id) {
                  return { ...s, connectedLines: [...s.connectedLines, lineToExtend!.id] };
                }
                return s;
              });
            } else {
              const newLineId = generateId();
              const colorIndex = newLines.length % LINE_COLORS.length;
              const newLine: MetroLine = {
                id: newLineId,
                color: LINE_COLORS[colorIndex],
                stations: [fromStation.id, targetStation.id],
                trains: [],
              };
              newLines.push(newLine);
              newStations = newStations.map(s => {
                if (s.id === fromStation.id || s.id === targetStation.id) {
                  return { ...s, connectedLines: [...s.connectedLines, newLineId] };
                }
                return s;
              });
            }

            return {
              ...prev,
              lines: newLines,
              stations: newStations,
              isDrawingLine: false,
              drawingFromStation: null,
              mousePosition: null,
            };
          });
          return;
        }
      }
    }

    setGameState(prev => ({
      ...prev,
      isDrawingLine: false,
      drawingFromStation: null,
      mousePosition: null,
    }));
  }, [gameState.isDrawingLine, gameState.drawingFromStation, hoveredStation, gameState.stations, gameState.lines]);

  // Draw line preview
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old drawing line
    if (drawingLineRef.current) {
      scene.remove(drawingLineRef.current);
      drawingLineRef.current = null;
    }

    if (gameState.isDrawingLine && gameState.drawingFromStation && gameState.mousePosition) {
      const fromStation = gameState.stations.find(s => s.id === gameState.drawingFromStation);
      if (fromStation) {
        const points = [
          new THREE.Vector3(fromStation.position.x, 1.5, fromStation.position.y),
          new THREE.Vector3(gameState.mousePosition.x, 1.5, gameState.mousePosition.y),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
          color: 0xffffff,
          dashSize: 1,
          gapSize: 0.5,
          linewidth: 2,
        });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        scene.add(line);
        drawingLineRef.current = line;
      }
    }
  }, [gameState.isDrawingLine, gameState.drawingFromStation, gameState.mousePosition, gameState.stations]);

  // Add train to line
  const addTrainToLine = useCallback((lineId: string) => {
    if (gameState.availableTrains <= 0) return;

    const line = gameState.lines.find(l => l.id === lineId);
    if (!line || line.stations.length < 2) return;

    const firstStation = gameState.stations.find(s => s.id === line.stations[0]);
    if (!firstStation) return;

    const newTrain: Train = {
      id: generateId(),
      lineId,
      position: { ...firstStation.position },
      currentStationIndex: 0,
      direction: 1,
      passengers: [],
      capacity: GAME_CONFIG.TRAIN_CAPACITY,
      speed: GAME_CONFIG.TRAIN_SPEED * 1.5,
      progress: 0,
    };

    setGameState(prev => ({
      ...prev,
      availableTrains: prev.availableTrains - 1,
      lines: prev.lines.map(l =>
        l.id === lineId ? { ...l, trains: [...l.trains, newTrain] } : l
      ),
    }));
  }, [gameState.availableTrains, gameState.lines, gameState.stations]);

  // Game loop
  useEffect(() => {
    if (isPaused || gameState.isGameOver) return;

    const gameLoop = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setGameState(prev => {
        if (prev.isGameOver) return prev;

        let newState = { ...prev };
        newState.gameTime += deltaTime;

        // Spawn new stations
        stationSpawnTimerRef.current += deltaTime;
        if (stationSpawnTimerRef.current >= GAME_CONFIG.STATION_SPAWN_INTERVAL) {
          stationSpawnTimerRef.current = 0;
          if (newState.stations.length < 12) {
            newState.stations = [...newState.stations, createStation(newState.stations)];
          }
        }

        // Spawn passengers
        passengerSpawnTimerRef.current += deltaTime;
        if (passengerSpawnTimerRef.current >= GAME_CONFIG.PASSENGER_SPAWN_INTERVAL) {
          passengerSpawnTimerRef.current = 0;

          const eligibleStations = newState.stations.filter(
            s => s.passengers.length < s.maxPassengers
          );
          if (eligibleStations.length > 0) {
            const randomStation = eligibleStations[Math.floor(Math.random() * eligibleStations.length)];
            const newPassenger = createPassenger(randomStation, newState.stations);
            if (newPassenger) {
              newState.stations = newState.stations.map(s =>
                s.id === randomStation.id
                  ? { ...s, passengers: [...s.passengers, newPassenger] }
                  : s
              );
            }
          }
        }

        // Update passenger wait times
        let gameOver = false;
        newState.stations = newState.stations.map(station => ({
          ...station,
          passengers: station.passengers.map(p => {
            const newWaitTime = p.waitTime + deltaTime;
            if (newWaitTime >= p.maxWaitTime) {
              gameOver = true;
            }
            return { ...p, waitTime: newWaitTime };
          }),
        }));

        newState.stations.forEach(station => {
          if (station.passengers.length > station.maxPassengers) {
            gameOver = true;
          }
        });

        if (gameOver) {
          newState.isGameOver = true;
          onGameOver(newState.score);
          return newState;
        }

        // Update trains
        newState.lines = newState.lines.map(line => {
          if (line.stations.length < 2) return line;

          const updatedTrains = line.trains.map(train => {
            let newTrain = { ...train };
            const currentStationId = line.stations[train.currentStationIndex];
            const nextIndex = train.currentStationIndex + train.direction;

            if (nextIndex < 0 || nextIndex >= line.stations.length) {
              newTrain.direction = (train.direction * -1) as 1 | -1;
              return newTrain;
            }

            const currentStation = newState.stations.find(s => s.id === currentStationId);
            const nextStation = newState.stations.find(s => s.id === line.stations[nextIndex]);

            if (!currentStation || !nextStation) return newTrain;

            const segmentDistance = distance(currentStation.position, nextStation.position);
            const progressIncrement = (train.speed * deltaTime) / segmentDistance;
            newTrain.progress += progressIncrement;

            if (newTrain.progress >= 1) {
              newTrain.progress = 0;
              newTrain.currentStationIndex = nextIndex;
              newTrain.position = { ...nextStation.position };

              // Drop off passengers
              const droppedOff = newTrain.passengers.filter(p => p.destination === nextStation.shape);
              newState.score += droppedOff.length * 10;
              newState.passengersDelivered += droppedOff.length;

              newTrain.passengers = newTrain.passengers.filter(p => p.destination !== nextStation.shape);

              // Pick up passengers
              const stationIndex = newState.stations.findIndex(s => s.id === nextStation.id);
              if (stationIndex !== -1) {
                const station = newState.stations[stationIndex];
                const availableSpace = train.capacity - newTrain.passengers.length;
                const toPickUp = station.passengers.slice(0, availableSpace);
                const remaining = station.passengers.slice(availableSpace);

                newTrain.passengers = [...newTrain.passengers, ...toPickUp];
                newState.stations = newState.stations.map((s, i) =>
                  i === stationIndex ? { ...s, passengers: remaining } : s
                );
              }

              if (newTrain.currentStationIndex === 0 || newTrain.currentStationIndex === line.stations.length - 1) {
                newTrain.direction = (newTrain.direction * -1) as 1 | -1;
              }
            } else {
              const t = newTrain.progress;
              newTrain.position = {
                x: currentStation.position.x + (nextStation.position.x - currentStation.position.x) * t,
                y: currentStation.position.y + (nextStation.position.y - currentStation.position.y) * t,
              };
            }

            return newTrain;
          });

          return { ...line, trains: updatedTrains };
        });

        return newState;
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [isPaused, gameState.isGameOver, onGameOver]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="w-[900px] h-[600px] rounded-xl overflow-hidden border-4 border-gray-700 shadow-2xl"
        style={{ cursor: hoveredStation ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredStation(null);
          setGameState(prev => ({
            ...prev,
            isDrawingLine: false,
            drawingFromStation: null,
            mousePosition: null,
          }));
        }}
      />

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-yellow-400 font-bold">Score: {gameState.score}</span>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-green-400 font-bold">Delivered: {gameState.passengersDelivered}</span>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-blue-400 font-bold">Trains: {gameState.availableTrains}</span>
        </div>
      </div>

      {/* Line management */}
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {gameState.lines.map((line, index) => (
          <button
            key={line.id}
            onClick={() => addTrainToLine(line.id)}
            disabled={gameState.availableTrains <= 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: line.color,
              backgroundColor: `${line.color}22`,
            }}
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: line.color }} />
            <span className="text-white text-sm">Line {index + 1} ({line.trains.length} trains)</span>
            <span className="text-xs text-gray-400">+🚂</span>
          </button>
        ))}
        {gameState.lines.length === 0 && (
          <p className="text-gray-400 text-sm">Click and drag between stations to create metro lines</p>
        )}
      </div>
    </div>
  );
};

export default MetroGame;
