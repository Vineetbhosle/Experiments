import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { TitleScene } from './scenes/TitleScene';
import { OverviewScene } from './scenes/OverviewScene';
import { ProductsScene } from './scenes/ProductsScene';
import { AIPScene } from './scenes/AIPScene';
import { UseCasesScene } from './scenes/UseCasesScene';
import { ClosingScene } from './scenes/ClosingScene';

// Scene durations in frames (at 30fps)
const TITLE_DURATION = 120;       // 4s
const OVERVIEW_DURATION = 150;    // 5s
const PRODUCTS_DURATION = 150;    // 5s
const AIP_DURATION = 180;         // 6s
const USE_CASES_DURATION = 150;   // 5s
const CLOSING_DURATION = 120;     // 4s
const FADE = 15;

export const TOTAL_DURATION =
  TITLE_DURATION +
  OVERVIEW_DURATION +
  PRODUCTS_DURATION +
  AIP_DURATION +
  USE_CASES_DURATION +
  CLOSING_DURATION;

// Crossfade wrapper
const FadeTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - FADE, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const PalantirAI: React.FC = () => {
  let offset = 0;

  const scenes = [
    { Component: TitleScene, duration: TITLE_DURATION },
    { Component: OverviewScene, duration: OVERVIEW_DURATION },
    { Component: ProductsScene, duration: PRODUCTS_DURATION },
    { Component: AIPScene, duration: AIP_DURATION },
    { Component: UseCasesScene, duration: USE_CASES_DURATION },
    { Component: ClosingScene, duration: CLOSING_DURATION },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {scenes.map(({ Component, duration }, i) => {
        const from = offset;
        offset += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <FadeTransition durationInFrames={duration}>
              <Component />
            </FadeTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
