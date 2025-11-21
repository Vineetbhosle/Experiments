import React from 'react';

interface GameOverModalProps {
  score: number;
  reason: string;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ score, reason, onRetry, onHome }) => {
  return (
    <div className="bg-[#0a140a]/95 border-4 border-red-700 rounded-2xl p-10 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-lg w-full mx-4 transform scale-100 animate-[fadeIn_0.3s_ease-out]">
      <h1 className="text-5xl font-bold text-red-500 mb-4 tracking-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.8)]">
        POSITION OVERRUN
      </h1>
      <p className="text-xl text-gray-400 mb-8 uppercase tracking-widest border-b border-red-900/50 pb-4">
        {reason}
      </p>
      <div className="mb-10">
        <p className="text-gray-500 text-sm mb-1">FINAL SCORE</p>
        <p className="text-6xl font-bold text-white">{score}</p>
      </div>
      <div className="flex flex-col gap-4">
        <button
          onClick={onRetry}
          className="pointer-events-auto w-full px-10 py-4 text-2xl font-bold bg-[#556B2F] hover:bg-[#6B8E23] text-white border-2 border-[#8FBC8F] rounded transition-all transform hover:scale-105 active:scale-95 uppercase shadow-lg"
        >
          REINFORCE
        </button>
        <button
          onClick={onHome}
          className="pointer-events-auto w-full px-10 py-3 text-lg font-bold bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white border-2 border-gray-700 rounded transition-all uppercase"
        >
          RETURN TO BASE
        </button>
      </div>
    </div>
  );
};