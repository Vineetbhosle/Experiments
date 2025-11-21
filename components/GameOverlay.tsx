import React from 'react';
import { GameStats } from '../types';

interface GameOverlayProps {
  stats: GameStats;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ stats }) => {
  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const breachPercent = Math.max(0, Math.min(100, (stats.breachCount / stats.maxBreach) * 100));

  return (
    <>
      {/* Central Countdown / Wave Info Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {stats.waveState === 'countdown' && stats.waveTimer > 0 && (
          <div className="text-center animate-pulse">
            <div className="text-2xl text-emerald-500 tracking-[0.5em] mb-4 font-bold uppercase">
              Wave {stats.currentWave} Incoming
            </div>
            <div className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]">
              {Math.ceil(stats.waveTimer)}
            </div>
          </div>
        )}
        {stats.waveState === 'clearing' && (
          <div className="text-center transform translate-y-[-100px]">
             <div className="bg-red-900/50 border border-red-500/50 px-6 py-2 text-red-100 font-bold tracking-widest animate-bounce">
                ELIMINATE REMAINING HOSTILES
             </div>
          </div>
        )}
      </div>

      {/* Top Center: Wave HUD */}
      <div className="absolute top-0 w-full flex flex-col items-center pt-6 pointer-events-none no-select z-10">
         <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm px-8 py-3 rounded-b-xl border-b border-l border-r border-white/10">
            <div className="flex flex-col items-center">
               <span className="text-[10px] text-emerald-500 tracking-widest font-bold uppercase">Wave</span>
               <span className="text-3xl font-black text-white leading-none">{stats.currentWave}</span>
            </div>
            <div className="w-px h-8 bg-white/20 mx-2"></div>
            <div className="flex flex-col items-center w-24">
               <span className="text-[10px] text-gray-400 tracking-widest font-bold uppercase">Timer</span>
               <span className={`text-3xl font-black leading-none font-mono ${stats.waveState === 'clearing' ? 'text-red-500' : 'text-white'}`}>
                 {stats.waveState === 'clearing' ? '--' : stats.waveTimer.toFixed(0).padStart(2, '0')}
               </span>
            </div>
         </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-8 pointer-events-none no-select flex items-end justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent h-48">
        
        {/* Left: Status Bars */}
        <div className="flex flex-col gap-4 w-64 pb-2">
          {/* HP */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">
              <span>Armor Integrity</span>
              <span className={hpPercent < 30 ? "text-red-500" : "text-white"}>{Math.ceil(hpPercent)}%</span>
            </div>
            <div className="h-1 bg-gray-800 w-full">
              <div 
                className={`h-full transition-all duration-300 ${hpPercent < 30 ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Breach */}
          <div className="flex flex-col gap-1 opacity-80">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">
              <span>Perimeter</span>
              <span className={stats.breachCount >= 7 ? "text-red-500" : "text-white"}>{stats.breachCount}/{stats.maxBreach}</span>
            </div>
             <div className="h-1 bg-gray-800 w-full">
              <div 
                className={`h-full transition-all duration-300 ${stats.breachCount > 5 ? 'bg-rose-600 shadow-[0_0_10px_#e11d48]' : 'bg-gray-500'}`}
                style={{ width: `${breachPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Weapon Status */}
        <div className="pb-4 flex flex-col items-center gap-2">
           <div className={`text-xs font-black tracking-[0.3em] transition-all duration-200 ${stats.cannonReady ? 'text-emerald-400 scale-110 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'text-red-900 scale-100'}`}>
              {stats.cannonReady ? 'CANNON LOADED' : 'RELOADING...'}
           </div>
           <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
              L-Click: MG <span className="mx-2">|</span> R-Click: 120mm
           </div>
        </div>

        {/* Right: Score */}
        <div className="text-right pb-2">
          <div className="text-[10px] font-bold text-gray-500 tracking-[0.3em] mb-0">CONFIRMED KILLS</div>
          <div className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl font-sans">
            {stats.score.toString().padStart(3, '0')}
          </div>
        </div>

      </div>
    </>
  );
};