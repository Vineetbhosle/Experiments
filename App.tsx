import React, { useState, useCallback } from 'react';
import { MetroGame } from './components/GameScene';
import { GameOverModal } from './components/GameOverModal';
import { HomePage } from './components/HomePage';

interface GameStats {
  score: number;
  passengersDelivered: number;
  isGameOver: boolean;
}

const INITIAL_STATS: GameStats = {
  score: 0,
  passengersDelivered: 0,
  isGameOver: false,
};

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = useCallback(() => {
    setStats(INITIAL_STATS);
    setHasStarted(true);
    setIsPaused(false);
    setGameKey(prev => prev + 1);
  }, []);

  const handleGameOver = useCallback((score: number, passengersDelivered: number) => {
    setStats(prev => ({
      ...prev,
      score,
      passengersDelivered,
      isGameOver: true,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setIsPaused(false);
    setStats(INITIAL_STATS);
    setGameKey(prev => prev + 1);
  }, []);

  const handleExitToMenu = useCallback(() => {
    setIsPaused(false);
    setHasStarted(false);
    setStats(INITIAL_STATS);
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (!stats.isGameOver) {
      setIsPaused(prev => !prev);
    }
  }, [stats.isGameOver]);

  if (!hasStarted) {
    return <HomePage onStart={handleStartGame} />;
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden font-mono text-white bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col items-center justify-center py-8">
      {/* Top Control Bar */}
      {!stats.isGameOver && (
        <div className="absolute top-0 left-0 z-40 p-4 flex gap-3">
          {/* Pause Button */}
          <button
            onClick={handlePauseToggle}
            className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-black/40 rounded-full text-white/70 hover:bg-black/60 hover:text-white border border-white/10 hover:border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            title="Pause (P)"
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
            )}
          </button>

          {/* Restart Button */}
          <button
            onClick={handleReset}
            className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-black/40 rounded-full text-white/70 hover:bg-blue-900/60 hover:text-blue-400 border border-white/10 hover:border-blue-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Restart Game"
            title="Restart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Home Button */}
          <button
            onClick={handleExitToMenu}
            className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-black/40 rounded-full text-white/70 hover:bg-red-900/60 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Exit to Menu"
            title="Exit to Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      )}

      {/* Title */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-black tracking-tight text-white">METRO PLANNER</h1>
        <p className="text-gray-400 text-sm mt-1">Connect stations • Deploy trains • Keep passengers happy</p>
      </div>

      {/* Game Area */}
      <div className="relative">
        <MetroGame
          key={gameKey}
          onGameOver={handleGameOver}
          isPaused={isPaused}
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center text-gray-500 text-xs max-w-xl">
        <p><strong>Tip:</strong> Drag between stations to create lines. Click the line buttons below to add trains. Passengers show their destination shape - get them there before they get angry!</p>
      </div>

      {/* Pause Overlay */}
      {isPaused && !stats.isGameOver && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-6xl mb-4">⏸️</div>
          <h2 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-8">
            Paused
          </h2>
          <div className="flex gap-6">
            <button
              onClick={handlePauseToggle}
              className="pointer-events-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest rounded-xl border-2 border-blue-400 transition-all"
            >
              RESUME
            </button>
            <button
              onClick={handleExitToMenu}
              className="pointer-events-auto px-8 py-3 bg-red-900/40 hover:bg-red-900/60 text-red-400 font-bold tracking-widest rounded-xl border-2 border-red-900/50 transition-all"
            >
              QUIT
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {stats.isGameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <GameOverModal
            score={stats.score}
            passengersDelivered={stats.passengersDelivered}
            onRetry={handleReset}
            onHome={handleExitToMenu}
          />
        </div>
      )}
    </div>
  );
}
