import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainSpring = spring({ frame, fps, config: { damping: 10, mass: 0.8 } });
  const taglineOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const footerOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' });

  // Pulse effect
  const pulse = Math.sin(frame * 0.08) * 0.15 + 1;

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, #1a2332 0%, #0a0a0a 70%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,195,247,0.08) 0%, transparent 70%)',
          transform: `scale(${pulse})`,
        }}
      />

      {/* Main text */}
      <div
        style={{
          textAlign: 'center',
          transform: `scale(${mainSpring})`,
        }}
      >
        <h2
          style={{
            fontSize: 60,
            fontWeight: 900,
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          The Future of
          <br />
          <span style={{ color: '#4fc3f7' }}>Decision Intelligence</span>
        </h2>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontSize: 22,
          color: '#888',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          marginTop: 30,
          opacity: taglineOpacity,
          fontWeight: 300,
          maxWidth: 600,
          lineHeight: 1.6,
        }}
      >
        Palantir AI transforms how organizations understand
        their world and take action — powered by data, guided by humans.
      </p>

      {/* Divider */}
      <div
        style={{
          width: interpolate(frame, [40, 70], [0, 200], { extrapolateRight: 'clamp' }),
          height: 1,
          background: 'linear-gradient(90deg, transparent, #4fc3f7, transparent)',
          marginTop: 40,
          marginBottom: 40,
        }}
      />

      {/* Footer */}
      <div
        style={{
          opacity: footerOpacity,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 16,
            color: '#555',
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          palantir.com
        </p>
      </div>
    </AbsoluteFill>
  );
};
