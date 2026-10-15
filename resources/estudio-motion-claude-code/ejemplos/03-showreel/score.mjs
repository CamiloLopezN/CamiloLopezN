import { renderScore } from '../../engine/lib/score-kit.mjs';

const DUR = 15;

renderScore({
  bpm: 124,
  dur: DUR,
  key: 'Am',
  seed: 303,
  gain: 0.85,
  sections: [
    { t0: 0, t1: 1.25, kind: 'hook' },
    { t0: 1.25, kind: 'hit' },
    { t0: 1.45, t1: 5.0, kind: 'groove' },
    { t0: 5.0, kind: 'hit' },
    { t0: 5.2, t1: 7.5, kind: 'groove' },
    { t0: 7.5, kind: 'hit' },
    { t0: 7.7, t1: 10.5, kind: 'groove' },
    { t0: 10.5, t1: 13.0, kind: 'tension' },
    { t0: 13.0, kind: 'hit' },
    { t0: 13.2, t1: DUR, kind: 'outro' },
  ],
}, 'out/score.wav');

console.log('out/score.wav generated for demo-03-showreel');
