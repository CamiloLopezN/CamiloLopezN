import { renderScore } from '../../engine/lib/score-kit.mjs';

const DUR = 16.0;

renderScore({
  bpm: 120,
  dur: DUR,
  key: 'C',
  seed: 106,
  gain: 0.68,
  sections: [
    { t0: 0.0, t1: 2.0, kind: 'hook' },
    { t0: 2.0, kind: 'hit' },
    { t0: 2.2, t1: 8.5, kind: 'groove' },
    { t0: 8.5, kind: 'hit' },
    { t0: 8.7, t1: 12.0, kind: 'groove' },
    { t0: 12.0, t1: 13.4, kind: 'tension' },
    { t0: 13.4, kind: 'hit' },
    { t0: 13.5, t1: DUR, kind: 'outro' },
  ],
}, 'out/score.wav');

console.log('out/score.wav generated for', DUR, 's at 120 BPM');
