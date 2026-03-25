import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { PalantirAI, TOTAL_DURATION } from './src/remotion/PalantirAI';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 40,
      }}
    >
      <h1
        style={{
          color: 'white',
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: '-0.5px',
        }}
      >
        What is Palantir AI
      </h1>
      <p
        style={{
          color: '#666',
          fontSize: 14,
          marginBottom: 32,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      >
        Explainer Video
      </p>

      <div
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Player
          component={PalantirAI}
          compositionWidth={1920}
          compositionHeight={1080}
          durationInFrames={TOTAL_DURATION}
          fps={30}
          style={{
            width: 960,
            height: 540,
          }}
          controls
          autoPlay
          loop
        />
      </div>

      <p
        style={{
          color: '#444',
          fontSize: 12,
          marginTop: 24,
        }}
      >
        Built with Remotion — 29 seconds, 30fps, 1920×1080
      </p>
    </div>
  );
}
