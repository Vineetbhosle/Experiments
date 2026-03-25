import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

export const OverviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingSlide = spring({ frame, fps, config: { damping: 14 } });
  const textOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' });
  const text2Opacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' });
  const iconRotate = interpolate(frame, [0, 120], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(160deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
        padding: 80,
        justifyContent: 'center',
      }}
    >
      {/* Rotating background ring */}
      <div
        style={{
          position: 'absolute',
          right: -100,
          top: '50%',
          transform: `translateY(-50%) rotate(${iconRotate}deg)`,
          width: 500,
          height: 500,
          border: '1px solid rgba(79, 195, 247, 0.1)',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -50,
          top: '50%',
          transform: `translateY(-50%) rotate(${-iconRotate * 0.5}deg)`,
          width: 400,
          height: 400,
          border: '1px solid rgba(79, 195, 247, 0.05)',
          borderRadius: '50%',
        }}
      />

      {/* Label */}
      <div
        style={{
          fontSize: 14,
          color: '#4fc3f7',
          letterSpacing: '6px',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          marginBottom: 16,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        The Company
      </div>

      {/* Heading */}
      <h2
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          marginBottom: 40,
          transform: `translateX(${interpolate(headingSlide, [0, 1], [-50, 0])}px)`,
          opacity: headingSlide,
          lineHeight: 1.2,
          maxWidth: 700,
        }}
      >
        Palantir Technologies
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: 26,
          color: '#ccc',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.7,
          maxWidth: 650,
          opacity: textOpacity,
          margin: 0,
          marginBottom: 24,
          fontWeight: 300,
        }}
      >
        Founded in 2003, Palantir builds software that empowers
        organizations to integrate, analyze, and act on their data
        at scale.
      </p>

      <p
        style={{
          fontSize: 22,
          color: '#999',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.7,
          maxWidth: 650,
          opacity: text2Opacity,
          margin: 0,
          fontWeight: 300,
        }}
      >
        From defense and intelligence to commercial enterprises,
        Palantir transforms how the world's most important institutions
        use data to make decisions.
      </p>

      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 4,
          height: interpolate(frame, [0, 40], [0, 200], { extrapolateRight: 'clamp' }),
          backgroundColor: '#4fc3f7',
        }}
      />
    </AbsoluteFill>
  );
};
