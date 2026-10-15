import { renderScore } from '../../engine/lib/score-kit.mjs';

const DUR = 20;

renderScore({
  bpm: 120,
  dur: DUR,
  key: 'Em',
  seed: 505,
  gain: 0.85,
  sections: [
    { t0: 0, t1: 1.9, kind: 'hook' },
    { t0: 1.9, kind: 'hit' },
    { t0: 2.1, t1: 4.0, kind: 'tension' },
    { t0: 4.0, kind: 'hit' },
    { t0: 4.2, t1: 8.0, kind: 'groove' },
    { t0: 8.0, kind: 'hit' },
    { t0: 8.2, t1: 14.0, kind: 'groove' },
    { t0: 14.0, kind: 'hit' },
    { t0: 14.2, t1: 17.0, kind: 'groove' },
    { t0: 17.0, kind: 'hit' },
    { t0: 17.2, t1: DUR, kind: 'outro' },
  ],
}, 'out/score.wav');

console.log('out/score.wav generated for demo-05-marca-real');
