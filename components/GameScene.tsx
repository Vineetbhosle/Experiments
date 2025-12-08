import React, { useEffect, useRef, useCallback, useState } from 'react';
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

const getRandomShape = (): StationShape => {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
};

const getRandomPosition = (stations: Station[], padding = 80): Position => {
  const margin = 60;
  let attempts = 0;
  while (attempts < 100) {
    const pos = {
      x: margin + Math.random() * (GAME_CONFIG.MAP_WIDTH - 2 * margin),
      y: margin + Math.random() * (GAME_CONFIG.MAP_HEIGHT - 2 * margin),
    };
    // Check distance from other stations
    const tooClose = stations.some((s) => distance(s.position, pos) < padding);
    if (!tooClose) return pos;
    attempts++;
  }
  return {
    x: margin + Math.random() * (GAME_CONFIG.MAP_WIDTH - 2 * margin),
    y: margin + Math.random() * (GAME_CONFIG.MAP_HEIGHT - 2 * margin),
  };
};

const createStation = (stations: Station[]): Station => {
  // Ensure we have variety in shapes
  const existingShapes = new Set(stations.map((s) => s.shape));
  let shape: StationShape;

  if (stations.length < SHAPES.length) {
    // Try to add a new shape type
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
  // Find a different shape to go to
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

// Drawing functions
const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: StationShape,
  x: number,
  y: number,
  size: number,
  fill = false,
  color = '#333'
) => {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  switch (shape) {
    case 'circle':
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'triangle':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size * 0.8);
      ctx.lineTo(x - size, y + size * 0.8);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.5;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
  }

  if (fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
};

interface GameCanvasProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onGameStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  // Get station by ID
  const getStation = useCallback(
    (id: string) => gameState.stations.find((s) => s.id === id),
    [gameState.stations]
  );

  // Find station at position
  const findStationAt = useCallback(
    (pos: Position): Station | null => {
      return (
        gameState.stations.find(
          (s) => distance(s.position, pos) < GAME_CONFIG.STATION_RADIUS + 10
        ) || null
      );
    },
    [gameState.stations]
  );

  // Handle mouse events for line drawing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const station = findStationAt(pos);
      if (station) {
        onGameStateChange({
          ...gameState,
          isDrawingLine: true,
          drawingFromStation: station.id,
          mousePosition: pos,
        });
      }
    },
    [gameState, findStationAt, onGameStateChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const station = findStationAt(pos);
      setHoveredStation(station?.id || null);

      if (gameState.isDrawingLine) {
        onGameStateChange({
          ...gameState,
          mousePosition: pos,
        });
      }
    },
    [gameState, findStationAt, onGameStateChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameState.isDrawingLine || !gameState.drawingFromStation) {
        onGameStateChange({
          ...gameState,
          isDrawingLine: false,
          drawingFromStation: null,
          mousePosition: null,
        });
        return;
      }

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const targetStation = findStationAt(pos);

      if (targetStation && targetStation.id !== gameState.drawingFromStation) {
        // Create or extend a line
        const fromStation = getStation(gameState.drawingFromStation);
        if (!fromStation) return;

        // Check if there's already a line connecting these stations
        const existingLine = gameState.lines.find(
          (line) =>
            line.stations.includes(fromStation.id) &&
            line.stations.includes(targetStation.id)
        );

        if (!existingLine) {
          // Check if fromStation is at the end of any existing line
          let lineToExtend: MetroLine | null = null;
          for (const line of gameState.lines) {
            if (
              line.stations[0] === fromStation.id ||
              line.stations[line.stations.length - 1] === fromStation.id
            ) {
              // Check if target isn't already on this line
              if (!line.stations.includes(targetStation.id)) {
                lineToExtend = line;
                break;
              }
            }
          }

          let newLines = [...gameState.lines];
          let newStations = [...gameState.stations];

          if (lineToExtend) {
            // Extend existing line
            const updatedLine = { ...lineToExtend };
            if (updatedLine.stations[0] === fromStation.id) {
              updatedLine.stations = [targetStation.id, ...updatedLine.stations];
            } else {
              updatedLine.stations = [...updatedLine.stations, targetStation.id];
            }
            newLines = newLines.map((l) =>
              l.id === lineToExtend!.id ? updatedLine : l
            );

            // Update station connections
            newStations = newStations.map((s) => {
              if (s.id === targetStation.id) {
                return {
                  ...s,
                  connectedLines: [...s.connectedLines, lineToExtend!.id],
                };
              }
              return s;
            });
          } else {
            // Create new line
            const newLineId = generateId();
            const colorIndex = newLines.length % LINE_COLORS.length;
            const newLine: MetroLine = {
              id: newLineId,
              color: LINE_COLORS[colorIndex],
              stations: [fromStation.id, targetStation.id],
              trains: [],
            };
            newLines.push(newLine);

            // Update station connections
            newStations = newStations.map((s) => {
              if (s.id === fromStation.id || s.id === targetStation.id) {
                return {
                  ...s,
                  connectedLines: [...s.connectedLines, newLineId],
                };
              }
              return s;
            });
          }

          onGameStateChange({
            ...gameState,
            lines: newLines,
            stations: newStations,
            isDrawingLine: false,
            drawingFromStation: null,
            mousePosition: null,
          });
          return;
        }
      }

      onGameStateChange({
        ...gameState,
        isDrawingLine: false,
        drawingFromStation: null,
        mousePosition: null,
      });
    },
    [gameState, findStationAt, getStation, onGameStateChange]
  );

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(0, 0, GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT);

    // Draw water/river decoration
    ctx.fillStyle = '#B8D4E8';
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.bezierCurveTo(200, 180, 400, 250, GAME_CONFIG.MAP_WIDTH, 220);
    ctx.lineTo(GAME_CONFIG.MAP_WIDTH, 280);
    ctx.bezierCurveTo(400, 310, 200, 240, 0, 260);
    ctx.closePath();
    ctx.fill();

    // Draw metro lines
    gameState.lines.forEach((line) => {
      if (line.stations.length < 2) return;

      ctx.strokeStyle = line.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      line.stations.forEach((stationId, index) => {
        const station = getStation(stationId);
        if (!station) return;

        if (index === 0) {
          ctx.moveTo(station.position.x, station.position.y);
        } else {
          ctx.lineTo(station.position.x, station.position.y);
        }
      });
      ctx.stroke();

      // Draw white inner line
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.beginPath();
      line.stations.forEach((stationId, index) => {
        const station = getStation(stationId);
        if (!station) return;

        if (index === 0) {
          ctx.moveTo(station.position.x, station.position.y);
        } else {
          ctx.lineTo(station.position.x, station.position.y);
        }
      });
      ctx.stroke();
    });

    // Draw line being created
    if (gameState.isDrawingLine && gameState.drawingFromStation && gameState.mousePosition) {
      const fromStation = getStation(gameState.drawingFromStation);
      if (fromStation) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(fromStation.position.x, fromStation.position.y);
        ctx.lineTo(gameState.mousePosition.x, gameState.mousePosition.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw stations
    gameState.stations.forEach((station) => {
      const isHovered = hoveredStation === station.id;
      const isDrawingFrom = gameState.drawingFromStation === station.id;

      // Station background
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(
        station.position.x,
        station.position.y,
        GAME_CONFIG.STATION_RADIUS + 4,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Station border (highlight if hovered)
      ctx.strokeStyle = isHovered || isDrawingFrom ? '#2196F3' : '#333';
      ctx.lineWidth = isHovered || isDrawingFrom ? 4 : 3;
      ctx.beginPath();
      ctx.arc(
        station.position.x,
        station.position.y,
        GAME_CONFIG.STATION_RADIUS + 4,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Station shape
      drawShape(
        ctx,
        station.shape,
        station.position.x,
        station.position.y,
        GAME_CONFIG.STATION_RADIUS - 4,
        false,
        '#333'
      );

      // Draw passengers waiting
      const passengerPositions = [
        { x: -20, y: -30 },
        { x: -10, y: -30 },
        { x: 0, y: -30 },
        { x: 10, y: -30 },
        { x: 20, y: -30 },
        { x: -15, y: -42 },
        { x: -5, y: -42 },
        { x: 5, y: -42 },
        { x: 15, y: -42 },
      ];

      station.passengers.forEach((passenger, index) => {
        if (index >= passengerPositions.length) return;

        const pPos = passengerPositions[index];
        const urgency = passenger.waitTime / passenger.maxWaitTime;

        // Urgency indicator (red background for urgent passengers)
        if (urgency > 0.5) {
          ctx.fillStyle = `rgba(244, 67, 54, ${urgency * 0.5})`;
          ctx.beginPath();
          ctx.arc(
            station.position.x + pPos.x,
            station.position.y + pPos.y,
            GAME_CONFIG.PASSENGER_SIZE + 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        drawShape(
          ctx,
          passenger.destination,
          station.position.x + pPos.x,
          station.position.y + pPos.y,
          GAME_CONFIG.PASSENGER_SIZE,
          true,
          '#333'
        );
      });

      // Overcrowding warning
      if (station.passengers.length >= station.maxPassengers - 1) {
        ctx.fillStyle = '#F44336';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', station.position.x, station.position.y + 40);
      }
    });

    // Draw trains
    gameState.lines.forEach((line) => {
      line.trains.forEach((train) => {
        // Train body
        ctx.fillStyle = line.color;
        ctx.beginPath();
        ctx.arc(train.position.x, train.position.y, GAME_CONFIG.TRAIN_RADIUS + 2, 0, Math.PI * 2);
        ctx.fill();

        // Train inner
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(train.position.x, train.position.y, GAME_CONFIG.TRAIN_RADIUS - 2, 0, Math.PI * 2);
        ctx.fill();

        // Passenger count
        if (train.passengers.length > 0) {
          ctx.fillStyle = '#333';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(train.passengers.length.toString(), train.position.x, train.position.y);
        }
      });
    });
  }, [gameState, hoveredStation, getStation]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.MAP_WIDTH}
      height={GAME_CONFIG.MAP_HEIGHT}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setHoveredStation(null);
        if (gameState.isDrawingLine) {
          onGameStateChange({
            ...gameState,
            isDrawingLine: false,
            drawingFromStation: null,
            mousePosition: null,
          });
        }
      }}
      style={{ cursor: hoveredStation ? 'pointer' : 'default' }}
      className="border-4 border-gray-800 rounded-lg shadow-2xl"
    />
  );
};

// Main Game Component
interface MetroGameProps {
  onGameOver: (score: number) => void;
  isPaused: boolean;
}

export const MetroGame: React.FC<MetroGameProps> = ({ onGameOver, isPaused }) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize with starting stations
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

  const lastUpdateRef = useRef<number>(Date.now());
  const stationSpawnTimerRef = useRef<number>(0);
  const passengerSpawnTimerRef = useRef<number>(0);

  // Add train to line
  const addTrainToLine = useCallback(
    (lineId: string) => {
      if (gameState.availableTrains <= 0) return;

      const line = gameState.lines.find((l) => l.id === lineId);
      if (!line || line.stations.length < 2) return;

      const firstStation = gameState.stations.find((s) => s.id === line.stations[0]);
      if (!firstStation) return;

      const newTrain: Train = {
        id: generateId(),
        lineId,
        position: { ...firstStation.position },
        currentStationIndex: 0,
        direction: 1,
        passengers: [],
        capacity: GAME_CONFIG.TRAIN_CAPACITY,
        speed: GAME_CONFIG.TRAIN_SPEED,
        progress: 0,
      };

      setGameState((prev) => ({
        ...prev,
        availableTrains: prev.availableTrains - 1,
        lines: prev.lines.map((l) =>
          l.id === lineId ? { ...l, trains: [...l.trains, newTrain] } : l
        ),
      }));
    },
    [gameState.availableTrains, gameState.lines, gameState.stations]
  );

  // Game loop
  useEffect(() => {
    if (isPaused || gameState.isGameOver) return;

    const gameLoop = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setGameState((prev) => {
        if (prev.isGameOver) return prev;

        let newState = { ...prev };
        newState.gameTime += deltaTime;

        // Spawn new stations
        stationSpawnTimerRef.current += deltaTime;
        if (stationSpawnTimerRef.current >= GAME_CONFIG.STATION_SPAWN_INTERVAL) {
          stationSpawnTimerRef.current = 0;
          if (newState.stations.length < 15) {
            newState.stations = [...newState.stations, createStation(newState.stations)];
          }
        }

        // Spawn passengers
        passengerSpawnTimerRef.current += deltaTime;
        if (passengerSpawnTimerRef.current >= GAME_CONFIG.PASSENGER_SPAWN_INTERVAL) {
          passengerSpawnTimerRef.current = 0;

          // Add passenger to random station
          const eligibleStations = newState.stations.filter(
            (s) => s.passengers.length < s.maxPassengers
          );
          if (eligibleStations.length > 0) {
            const randomStation =
              eligibleStations[Math.floor(Math.random() * eligibleStations.length)];
            const newPassenger = createPassenger(randomStation, newState.stations);
            if (newPassenger) {
              newState.stations = newState.stations.map((s) =>
                s.id === randomStation.id
                  ? { ...s, passengers: [...s.passengers, newPassenger] }
                  : s
              );
            }
          }
        }

        // Update passenger wait times
        let gameOver = false;
        newState.stations = newState.stations.map((station) => ({
          ...station,
          passengers: station.passengers.map((p) => {
            const newWaitTime = p.waitTime + deltaTime;
            if (newWaitTime >= p.maxWaitTime) {
              gameOver = true;
            }
            return { ...p, waitTime: newWaitTime };
          }),
        }));

        // Check for overcrowded stations
        newState.stations.forEach((station) => {
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
        newState.lines = newState.lines.map((line) => {
          if (line.stations.length < 2) return line;

          const updatedTrains = line.trains.map((train) => {
            let newTrain = { ...train };
            const currentStationId = line.stations[train.currentStationIndex];
            const nextIndex = train.currentStationIndex + train.direction;

            // Check if at end of line
            if (nextIndex < 0 || nextIndex >= line.stations.length) {
              newTrain.direction = (train.direction * -1) as 1 | -1;
              return newTrain;
            }

            const currentStation = newState.stations.find((s) => s.id === currentStationId);
            const nextStation = newState.stations.find(
              (s) => s.id === line.stations[nextIndex]
            );

            if (!currentStation || !nextStation) return newTrain;

            const segmentDistance = distance(currentStation.position, nextStation.position);
            const progressIncrement = (train.speed * deltaTime) / segmentDistance;
            newTrain.progress += progressIncrement;

            if (newTrain.progress >= 1) {
              // Arrived at next station
              newTrain.progress = 0;
              newTrain.currentStationIndex = nextIndex;
              newTrain.position = { ...nextStation.position };

              // Drop off passengers
              const droppedOff = newTrain.passengers.filter(
                (p) => p.destination === nextStation.shape
              );
              newState.score += droppedOff.length * 10;
              newState.passengersDelivered += droppedOff.length;

              newTrain.passengers = newTrain.passengers.filter(
                (p) => p.destination !== nextStation.shape
              );

              // Pick up passengers
              const stationIndex = newState.stations.findIndex(
                (s) => s.id === nextStation.id
              );
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

              // Check if at end of line, reverse direction
              if (
                newTrain.currentStationIndex === 0 ||
                newTrain.currentStationIndex === line.stations.length - 1
              ) {
                newTrain.direction = (newTrain.direction * -1) as 1 | -1;
              }
            } else {
              // Interpolate position
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
      <GameCanvas gameState={gameState} onGameStateChange={setGameState} />

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-yellow-400 font-bold">Score: {gameState.score}</span>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-green-400 font-bold">
            Delivered: {gameState.passengersDelivered}
          </span>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-blue-400 font-bold">
            Trains: {gameState.availableTrains}
          </span>
        </div>
      </div>

      {/* Line management */}
      <div className="flex flex-wrap gap-2 justify-center max-w-xl">
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
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-white text-sm">
              Line {index + 1} ({line.trains.length} trains)
            </span>
            <span className="text-xs text-gray-400">+🚂</span>
          </button>
        ))}
        {gameState.lines.length === 0 && (
          <p className="text-gray-400 text-sm">
            Click and drag between stations to create metro lines
          </p>
        )}
      </div>
    </div>
  );
};

export default MetroGame;
