import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

const products = [
  {
    name: 'Gotham',
    desc: 'Defense & Intelligence',
    detail: 'Counter-terrorism, military operations, and intelligence analysis',
    icon: '🛡️',
    color: '#ef5350',
  },
  {
    name: 'Foundry',
    desc: 'Commercial Enterprise',
    detail: 'Data integration and operational analytics for businesses',
    icon: '🏭',
    color: '#66bb6a',
  },
  {
    name: 'AIP',
    desc: 'AI Platform',
    detail: 'Large language models integrated directly into operations',
    icon: '🧠',
    color: '#4fc3f7',
  },
];

export const ProductsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111827 100%)',
        padding: 80,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Section label */}
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
        Core Platforms
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
        Three Pillars of Palantir
      </h2>

      {/* Product cards */}
      <div style={{ display: 'flex', gap: 30 }}>
        {products.map((product, i) => {
          const delay = i * 12;
          const cardSpring = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, mass: 0.8 },
          });
          const cardOpacity = interpolate(frame - delay, [0, 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={product.name}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 36,
                border: `1px solid rgba(255,255,255,0.08)`,
                transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
                opacity: cardOpacity,
              }}
            >
              {/* Color accent */}
              <div
                style={{
                  width: 50,
                  height: 4,
                  backgroundColor: product.color,
                  borderRadius: 2,
                  marginBottom: 20,
                }}
              />

              <div style={{ fontSize: 36, marginBottom: 12 }}>{product.icon}</div>

              <h3
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'white',
                  fontFamily: 'system-ui, sans-serif',
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {product.name}
              </h3>

              <p
                style={{
                  fontSize: 16,
                  color: product.color,
                  fontFamily: 'system-ui, sans-serif',
                  margin: 0,
                  marginBottom: 12,
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                {product.desc}
              </p>

              <p
                style={{
                  fontSize: 16,
                  color: '#888',
                  fontFamily: 'system-ui, sans-serif',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {product.detail}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
