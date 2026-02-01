import React, { useState, useCallback } from 'react';
import { BuildingScene } from './components/BuildingScene';
import { ControlPanel } from './components/ControlPanel';
import { BuildingParams, DEFAULT_PARAMS } from './types';

export default function App() {
  const [params, setParams] = useState<BuildingParams>(DEFAULT_PARAMS);

  const handleParamsChange = useCallback((newParams: BuildingParams) => {
    setParams(newParams);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden font-mono text-white bg-black">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <BuildingScene params={params} />
      </div>

      {/* Control Panel */}
      <ControlPanel params={params} onChange={handleParamsChange} />
    </div>
  );
}
