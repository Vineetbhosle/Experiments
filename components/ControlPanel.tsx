import React, { useState, useCallback } from 'react';
import { BuildingParams, PARAM_METADATA, ParamMeta } from '../types';

interface Props {
  params: BuildingParams;
  onChange: (params: BuildingParams) => void;
}

const CATEGORIES = ['Structure', 'Form', 'Facade', 'Materials', 'Lighting', 'Environment', 'Details'];

const CATEGORY_ICONS: Record<string, string> = {
  Structure: '\u25A8',
  Form: '\u25C7',
  Facade: '\u25A3',
  Materials: '\u25C9',
  Lighting: '\u2600',
  Environment: '\u2618',
  Details: '\u2699',
};

export function ControlPanel({ params, onChange }: Props) {
  const [openCat, setOpenCat] = useState<string>('Structure');
  const [collapsed, setCollapsed] = useState(false);

  const handleChange = useCallback((key: keyof BuildingParams, value: number | string) => {
    onChange({ ...params, [key]: value });
  }, [params, onChange]);

  const totalHeight = params.floors * params.floorHeight;
  const footprint = params.buildingWidth * params.buildingDepth;
  const gfa = footprint * params.floors;

  if (collapsed) {
    return (
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => setCollapsed(false)}
          className="w-12 h-12 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-cyan-500/30 transition-all flex items-center justify-center text-xl"
        >
          {'\u2630'}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 bottom-0 z-50 w-80 bg-black/85 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold tracking-widest text-white/90 uppercase">Parametric Builder</h1>
          <button
            onClick={() => setCollapsed(true)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all text-sm"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider">
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-cyan-400 font-bold text-sm">{params.floors}</div>
            <div className="text-white/40 mt-0.5">Floors</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-cyan-400 font-bold text-sm">{totalHeight.toFixed(0)}m</div>
            <div className="text-white/40 mt-0.5">Height</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-cyan-400 font-bold text-sm">{(gfa / 1000).toFixed(0)}k</div>
            <div className="text-white/40 mt-0.5">GFA m{'\u00B2'}</div>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 flex-shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setOpenCat(cat)}
            className={`px-2.5 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-medium transition-all ${
              openCat === cat
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60'
            }`}
          >
            <span className="mr-1">{CATEGORY_ICONS[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        {PARAM_METADATA.filter(m => m.category === openCat).map(meta => (
          <ParamControl
            key={meta.key}
            meta={meta}
            value={params[meta.key]}
            onChange={handleChange}
          />
        ))}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="text-[10px] text-white/30 uppercase tracking-wider text-center">
          50 Parameters {'\u00B7'} Drag to rotate {'\u00B7'} Scroll to zoom
        </div>
      </div>
    </div>
  );
}

function ParamControl({ meta, value, onChange }: {
  meta: ParamMeta;
  value: number | string;
  onChange: (key: keyof BuildingParams, val: number | string) => void;
}) {
  if (meta.type === 'color') {
    return (
      <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 transition-all group">
        <label className="text-[11px] text-white/60 group-hover:text-white/80 transition-colors">{meta.label}</label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 font-mono">{value as string}</span>
          <input
            type="color"
            value={value as string}
            onChange={e => onChange(meta.key, e.target.value)}
            className="w-8 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
          />
        </div>
      </div>
    );
  }

  if (meta.type === 'select' && meta.options) {
    return (
      <div className="py-2 px-2 rounded-lg hover:bg-white/5 transition-all group">
        <label className="text-[11px] text-white/60 group-hover:text-white/80 block mb-1.5 transition-colors">{meta.label}</label>
        <div className="flex gap-1">
          {meta.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange(meta.key, opt.value)}
              className={`flex-1 py-1 rounded text-[10px] uppercase tracking-wider font-medium transition-all ${
                value === opt.value
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Range slider
  const pct = meta.max > meta.min ? ((value as number) - meta.min) / (meta.max - meta.min) * 100 : 0;
  return (
    <div className="py-2 px-2 rounded-lg hover:bg-white/5 transition-all group">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] text-white/60 group-hover:text-white/80 transition-colors">{meta.label}</label>
        <span className="text-[11px] font-mono text-cyan-400/80 min-w-[3em] text-right">
          {typeof value === 'number' ? (Number.isInteger(meta.step) ? value : (value as number).toFixed(meta.step < 0.1 ? 2 : 1)) : value}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={meta.min}
          max={meta.max}
          step={meta.step}
          value={value as number}
          onChange={e => onChange(meta.key, parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
