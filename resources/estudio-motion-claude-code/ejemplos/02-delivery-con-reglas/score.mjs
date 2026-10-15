import { renderScore } from '../../engine/lib/score-kit.mjs';

const DUR = 10;

renderScore({
  bpm: 120,
  dur: DUR,
  key: 'Am',
  seed: 202,
  gain: 0.78,
  sections: [
    { t0: 0, t1: 2.4, kind: 'hook' },
    { t0: 2.4, kind: 'hit' },
    { t0: 2.4, t1: 3.8, kind: 'groove' },
    { t0: 3.8, kind: 'hit' },
    { t0: 3.8, t1: 7.8, kind: 'groove' },
    { t0: 7.8, kind: 'hit' },
    { t0: 7.8, t1: DUR, kind: 'outro' },
  ],
}, 'out/score.wav');

console.log('out/score.wav generated for demo-02-delivery-con-reglas');
