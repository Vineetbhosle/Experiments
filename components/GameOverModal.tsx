import React from 'react';

interface GameOverModalProps {
  score: number;
  passengersDelivered: number;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ score, passengersDelivered, onRetry, onHome }) => {
  return (
    <div className="bg-gray-900/95 border-4 border-red-500 rounded-2xl p-10 text-center shadow-[0_0_60px_rgba(239,68,68,0.3)] max-w-lg w-full mx-4 transform animate-[fadeIn_0.3s_ease-out]">
      <div className="text-6xl mb-4">🚇</div>
      <h1 className="text-4xl font-black text-red-500 mb-2 tracking-tight">
        NETWORK OVERLOADED
      </h1>
      <p className="text-lg text-gray-400 mb-8 uppercase tracking-widest border-b border-red-900/50 pb-4">
        Passengers waited too long!
      </p>

      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-black/30 rounded-lg p-4">
          <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Final Score</p>
          <p className="text-4xl font-black text-yellow-400">{score}</p>
        </div>
        <div className="bg-black/30 rounded-lg p-4">
          <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Delivered</p>
          <p className="text-4xl font-black text-green-400">{passengersDelivered}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={onRetry}
          className="pointer-events-auto w-full px-10 py-4 text-xl font-bold bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400 rounded-xl transition-all transform hover:scale-105 active:scale-95 uppercase shadow-lg flex items-center justify-center gap-2"
        >
          <span>🔄</span> TRY AGAIN
        </button>
        <button
          onClick={onHome}
          className="pointer-events-auto w-full px-10 py-3 text-lg font-bold bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white border-2 border-gray-700 rounded-xl transition-all uppercase"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
};
