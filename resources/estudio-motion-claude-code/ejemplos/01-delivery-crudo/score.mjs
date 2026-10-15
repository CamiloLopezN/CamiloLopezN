import { renderScore } from '../../engine/lib/score-kit.mjs';

const DUR = 10;

renderScore({
  bpm: 112,
  dur: DUR,
  key: 'C',
  seed: 101,
  gain: 0.55,
  sections: [
    { t0: 0, t1: 3.2, kind: 'hook' },
    { t0: 3.2, t1: 7.8, kind: 'groove' },
    { t0: 7.8, t1: DUR, kind: 'outro' },
  ],
}, 'out/score.wav');

console.log('out/score.wav generated for demo-01-delivery-crudo');
