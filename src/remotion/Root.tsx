import React from 'react';
import { Composition } from 'remotion';
import { PalantirAI, TOTAL_DURATION } from './PalantirAI';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PalantirAI"
      component={PalantirAI}
      durationInFrames={TOTAL_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
