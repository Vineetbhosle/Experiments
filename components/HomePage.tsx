import React from 'react';

interface HomePageProps {
  onStart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 overflow-hidden flex flex-col items-center justify-center font-mono text-white select-none">

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
            backgroundImage: 'linear-gradient(#4a90d9 1px, transparent 1px), linear-gradient(90deg, #4a90d9 1px, transparent 1px)',
            backgroundSize: '50px 50px'
        }}
      />

      {/* Animated Metro Lines Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-20">
          <line x1="10%" y1="0" x2="30%" y2="100%" stroke="#E53935" strokeWidth="4" />
          <line x1="50%" y1="0" x2="70%" y2="100%" stroke="#1E88E5" strokeWidth="4" />
          <line x1="90%" y1="0" x2="60%" y2="100%" stroke="#43A047" strokeWidth="4" />
          <line x1="0" y1="30%" x2="100%" y2="50%" stroke="#FB8C00" strokeWidth="4" />
          <line x1="0" y1="70%" x2="100%" y2="60%" stroke="#8E24AA" strokeWidth="4" />
        </svg>
      </div>

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center max-w-4xl w-full px-6 text-center">

        <div className="mb-4 text-blue-400/80 tracking-[0.4em] text-sm uppercase font-bold">
          Transit Simulation
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          METRO
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold text-blue-400 mb-8 tracking-widest">
          PLANNER
        </h2>

        <div className="h-1 w-32 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 mb-10 rounded-full"></div>

        {/* Game Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-12 text-left">
          <div className="bg-black/40 p-6 border border-blue-500/30 rounded-lg backdrop-blur-sm">
            <h3 className="text-blue-400 font-bold tracking-widest mb-3 flex items-center gap-2">
              <span className="text-2xl">🚉</span> OBJECTIVE
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Build an efficient metro network to transport passengers between stations.
              Connect stations with lines and deploy trains to keep people moving.
            </p>
          </div>
          <div className="bg-black/40 p-6 border border-blue-500/30 rounded-lg backdrop-blur-sm">
            <h3 className="text-blue-400 font-bold tracking-widest mb-3 flex items-center gap-2">
              <span className="text-2xl">🎮</span> CONTROLS
            </h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li className="flex justify-between">
                <span>Draw Lines</span>
                <span className="text-white font-bold">CLICK + DRAG</span>
              </li>
              <li className="flex justify-between">
                <span>Add Train</span>
                <span className="text-white font-bold">CLICK LINE BUTTON</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-10 max-w-xl">
          <p className="text-red-300 text-sm">
            <span className="font-bold">⚠️ WARNING:</span> If passengers wait too long or stations overflow, it's game over!
          </p>
        </div>

        <button
          onClick={onStart}
          className="group relative px-16 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl tracking-widest uppercase transition-all transform hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] rounded-xl border-4 border-blue-400"
        >
          <span className="relative z-10 flex items-center gap-3">
            <span>🚇</span> START BUILDING
          </span>
        </button>

        <div className="mt-8 text-xs text-gray-500 tracking-wider">
          PASSENGERS ARE WAITING • BUILD SMART • KEEP THEM MOVING
        </div>

      </div>
    </div>
  );
};
