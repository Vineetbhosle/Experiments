import React from 'react';

interface HomePageProps {
  onStart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="relative w-full h-screen bg-[#050a05] overflow-hidden flex flex-col items-center justify-center font-mono text-white select-none">
      
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
            backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
        }} 
      />

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center max-w-5xl w-full px-6 text-center">
        
        <div className="mb-2 text-emerald-500/60 tracking-[0.5em] text-sm uppercase font-bold">
          Simulated Combat Environment
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] flex flex-col gap-2 leading-none">
          <span>LAST STAND</span>
          <span className="text-[#556B2F] text-5xl md:text-7xl">ARMORED DIVISION</span>
        </h1>
        
        <div className="h-px w-32 bg-emerald-500/50 mb-10"></div>

        {/* Operational Briefing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mb-12 text-left bg-black/40 p-8 border border-emerald-900/30 rounded-lg backdrop-blur-sm">
           <div>
              <h3 className="text-emerald-500 font-bold tracking-widest mb-4 border-b border-emerald-900/50 pb-2">MISSION</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                 Defend the forest perimeter against armored battalions and infantry waves. Do not allow enemy forces to breach the line.
              </p>
           </div>
           <div>
              <h3 className="text-emerald-500 font-bold tracking-widest mb-4 border-b border-emerald-900/50 pb-2">CONTROLS</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                 <li className="flex justify-between">
                    <span>AIM</span> <span className="text-white font-bold">MOUSE</span>
                 </li>
                 <li className="flex justify-between">
                    <span>MACHINE GUN</span> <span className="text-white font-bold">L-CLICK</span>
                 </li>
                 <li className="flex justify-between">
                    <span>120MM SHELL</span> <span className="text-white font-bold">R-CLICK</span>
                 </li>
              </ul>
           </div>
        </div>

        <button 
          onClick={onStart}
          className="group relative px-12 py-5 bg-[#556B2F] hover:bg-[#6B8E23] text-white font-black text-2xl tracking-widest uppercase transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(85,107,47,0.6)] clip-path-polygon"
          style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
        >
          <span className="relative z-10">Initiate Defense</span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        </button>
        
        <div className="mt-8 text-xs text-gray-600 tracking-widest">
           SYSTEM STATUS: ONLINE // READY FOR DEPLOYMENT
        </div>

      </div>
    </div>
  );
};