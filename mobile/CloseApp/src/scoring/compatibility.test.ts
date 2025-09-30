import { compatibilityScore, DEFAULT_WEIGHTS } from './compatibility';

describe('compatibilityScore', () => {
  it('higher when preferences match and rssi strong', () => {
    const my = { age: 28, sex: 'female' as const, preferences: { gender: ['male'], age_min: 25, age_max: 35 }, interests: ['music','books'] };
    const peer = { age: 30, sex: 'male' as const, preferences: { gender: ['female'], age_min: 20, age_max: 40 }, interests: ['music','sports'] };
    const s1 = compatibilityScore(my, peer, { rssi: -55 }, DEFAULT_WEIGHTS);
    const s2 = compatibilityScore(my, peer, { rssi: -85 }, DEFAULT_WEIGHTS);
    expect(s1).toBeGreaterThan(s2);
    expect(s1).toBeGreaterThan(0.5);
  });
});

