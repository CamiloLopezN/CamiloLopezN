import { renderScore } from '../../engine/lib/score-kit.mjs';

const DUR = 15;

renderScore({
  bpm: 120,
  dur: DUR,
  key: 'C',
  seed: 404,
  gain: 0.82,
  sections: [
    { t0: 0, t1: 3.5, kind: 'hook' },
    { t0: 3.5, kind: 'hit' },
    { t0: 3.7, t1: 8.5, kind: 'groove' },
    { t0: 8.5, kind: 'hit' },
    { t0: 8.7, t1: 12.0, kind: 'groove' },
    { t0: 12.0, kind: 'hit' },
    { t0: 12.2, t1: DUR, kind: 'outro' },
  ],
}, 'out/score.wav');

console.log('out/score.wav generated for demo-04-con-referencia');
