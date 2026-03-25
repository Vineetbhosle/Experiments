import React from 'react';
import { Player } from '@remotion/player';
import { PalantirAI, TOTAL_DURATION } from './src/remotion/PalantirAI';

export default function App() {
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
        padding: '20px 12px',
      }}
    >
      <h1
        style={{
          color: 'white',
          fontSize: 'clamp(18px, 5vw, 28px)',
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: '-0.5px',
          textAlign: 'center',
        }}
      >
        What is Palantir AI
      </h1>
      <p
        style={{
          color: '#666',
          fontSize: 'clamp(10px, 2.5vw, 14px)',
          marginBottom: 'clamp(16px, 4vw, 32px)',
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
          width: '100%',
          maxWidth: 960,
        }}
      >
        <Player
          component={PalantirAI}
          compositionWidth={1920}
          compositionHeight={1080}
          durationInFrames={TOTAL_DURATION}
          fps={30}
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
          }}
          controls
          autoPlay
          loop
        />
      </div>

      <p
        style={{
          color: '#444',
          fontSize: 'clamp(10px, 2vw, 12px)',
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        Built with Remotion — 29 seconds, 30fps, 1920×1080
      </p>
    </div>
  );
}
