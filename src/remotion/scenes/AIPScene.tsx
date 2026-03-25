import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

const features = [
  { label: 'Ontology-based AI', desc: 'LLMs grounded in your real data model' },
  { label: 'Secure by Design', desc: 'Enterprise-grade access controls and governance' },
  { label: 'Human-in-the-Loop', desc: 'AI assists decisions, humans approve actions' },
  { label: 'Real-time Operations', desc: 'Deploy AI directly into live workflows' },
];

export const AIPScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingSpring = spring({ frame, fps, config: { damping: 12 } });

  // Animated connection lines
  const lineProgress = interpolate(frame, [30, 80], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1117 50%, #071018 100%)',
        padding: 80,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Left side - Text content */}
      <div style={{ flex: 1, paddingRight: 60 }}>
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
          Deep Dive
        </div>

        <h2
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
            marginBottom: 16,
            transform: `translateX(${interpolate(headingSpring, [0, 1], [-30, 0])}px)`,
            opacity: headingSpring,
            lineHeight: 1.1,
          }}
        >
          Artificial Intelligence
          <br />
          <span style={{ color: '#4fc3f7' }}>Platform (AIP)</span>
        </h2>

        <p
          style={{
            fontSize: 20,
            color: '#999',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.6,
            margin: 0,
            marginBottom: 40,
            maxWidth: 500,
            opacity: interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          AIP brings the power of large language models into
          enterprise operations — safely, securely, and at scale.
        </p>

        {/* Feature list */}
        {features.map((feat, i) => {
          const delay = 20 + i * 10;
          const itemOpacity = interpolate(frame - delay, [0, 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const itemSlide = interpolate(frame - delay, [0, 15], [20, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={feat.label}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 20,
                opacity: itemOpacity,
                transform: `translateX(${itemSlide}px)`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#4fc3f7',
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 18,
                    color: 'white',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  {feat.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#666',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {feat.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right side - Visual */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Central node */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 0 60px rgba(79,195,247,0.3)',
            transform: `scale(${spring({ frame: frame - 10, fps, config: { damping: 10 } })})`,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: 'white',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            AIP
          </span>
        </div>

        {/* Orbiting nodes */}
        {['Data', 'LLM', 'Logic', 'Users'].map((label, i) => {
          const angle = (i * Math.PI * 2) / 4 + frame * 0.008;
          const radius = 160;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const nodeOpacity = interpolate(frame, [20 + i * 5, 35 + i * 5], [0, 1], {
            extrapolateRight: 'clamp',
          });

          return (
            <React.Fragment key={label}>
              {/* Connection line */}
              <svg
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                }}
              >
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${50 + (x / 400) * 100}%`}
                  y2={`${50 + (y / 400) * 100}%`}
                  stroke="#4fc3f7"
                  strokeWidth="1"
                  opacity={lineProgress * 0.3}
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Node */}
              <div
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${x}px - 35px)`,
                  top: `calc(50% + ${y}px - 35px)`,
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: 'rgba(79,195,247,0.1)',
                  border: '1px solid rgba(79,195,247,0.3)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: nodeOpacity,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: '#4fc3f7',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
