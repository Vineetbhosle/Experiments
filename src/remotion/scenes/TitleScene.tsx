import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const lineWidth = interpolate(frame, [10, 50], [0, 400], {
    extrapolateRight: 'clamp',
  });

  // Animated background particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const x = (i * 137.5) % 100;
    const delay = i * 3;
    const y = interpolate(frame - delay, [0, 120], [110, -10], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const opacity = interpolate(frame - delay, [0, 20, 100, 120], [0, 0.3, 0.3, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { x, y, opacity, size: 2 + (i % 3) * 2 };
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: '#4fc3f7',
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Hexagon grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: interpolate(frame, [0, 30], [0, 0.08], { extrapolateRight: 'clamp' }),
          backgroundImage: `radial-gradient(circle, #4fc3f7 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Logo / Icon */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          marginBottom: 20,
        }}
      >
        <svg width="100" height="100" viewBox="0 0 100 100">
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill="none"
            stroke="#4fc3f7"
            strokeWidth="2"
            opacity={interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })}
          />
          <polygon
            points="50,20 80,35 80,65 50,80 20,65 20,35"
            fill="none"
            stroke="#4fc3f7"
            strokeWidth="1.5"
            opacity={interpolate(frame, [10, 40], [0, 0.7], { extrapolateRight: 'clamp' })}
          />
          <circle cx="50" cy="50" r="8" fill="#4fc3f7" opacity={interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' })} />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-2px',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          What is{' '}
          <span style={{ color: '#4fc3f7' }}>Palantir AI</span>
          <span style={{ color: '#4fc3f7' }}>?</span>
        </h1>
      </div>

      {/* Divider line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #4fc3f7, transparent)',
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {/* Subtitle */}
      <p
        style={{
          fontSize: 24,
          color: '#aaa',
          opacity: subtitleOpacity,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 300,
          letterSpacing: '4px',
          textTransform: 'uppercase',
        }}
      >
        Data Intelligence Platform
      </p>
    </AbsoluteFill>
  );
};
