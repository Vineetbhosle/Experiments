import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

const useCases = [
  { sector: 'Defense', example: 'Mission planning & threat detection', icon: '🎯' },
  { sector: 'Healthcare', example: 'Drug discovery & patient outcomes', icon: '🏥' },
  { sector: 'Finance', example: 'Fraud detection & risk modeling', icon: '💹' },
  { sector: 'Supply Chain', example: 'Logistics optimization & forecasting', icon: '🚛' },
  { sector: 'Energy', example: 'Grid management & sustainability', icon: '⚡' },
  { sector: 'Government', example: 'Disaster response & resource allocation', icon: '🏛️' },
];

export const UseCasesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0d1117 0%, #1a1a2e 100%)',
        padding: 80,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: '#4fc3f7',
          letterSpacing: '6px',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          marginBottom: 12,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Impact
      </div>

      <h2
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          marginBottom: 50,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Where Palantir AI is Used
      </h2>

      {/* Use case grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 24,
        }}
      >
        {useCases.map((uc, i) => {
          const delay = 10 + i * 8;
          const cardScale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, mass: 0.6 },
          });
          const cardOpacity = interpolate(frame - delay, [0, 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={uc.sector}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                padding: 28,
                border: '1px solid rgba(255,255,255,0.06)',
                transform: `scale(${cardScale})`,
                opacity: cardOpacity,
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>{uc.icon}</div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'white',
                  fontFamily: 'system-ui, sans-serif',
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {uc.sector}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: '#777',
                  fontFamily: 'system-ui, sans-serif',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {uc.example}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
