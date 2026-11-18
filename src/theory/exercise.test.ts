import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, generateExercise, SCALES } from './exercise'
import { concertToWritten } from './notes'

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

describe('generateExercise', () => {
  it('stays in range/scale, respects leaps, never repeats back-to-back', () => {
    const settings = { ...DEFAULT_SETTINGS, length: 6, maxInterval: 7 }
    const rng = lcg(42)
    const scalePcs = new Set(
      SCALES[settings.scale].steps.map((s) => (s + settings.keyRootPc) % 12),
    )
    for (let round = 0; round < 50; round++) {
      const ex = generateExercise(settings, rng)
      const refWritten = concertToWritten(ex.referenceConcert, settings.instrument)
      expect(refWritten % 12).toBe(settings.keyRootPc)

      const written = ex.targetsConcert.map((m) => concertToWritten(m, settings.instrument))
      expect(written).toHaveLength(settings.length)
      let prev = refWritten
      for (const w of written) {
        expect(w).toBeGreaterThanOrEqual(settings.lowWritten)
        expect(w).toBeLessThanOrEqual(settings.highWritten)
        expect(scalePcs.has(((w % 12) + 12) % 12)).toBe(true)
        expect(w).not.toBe(prev)
        expect(Math.abs(w - prev)).toBeLessThanOrEqual(settings.maxInterval)
        prev = w
      }
    }
  })

  it('emits sounding pitches transposed for the instrument', () => {
    const ex = generateExercise({ ...DEFAULT_SETTINGS, instrument: 'tenor' }, lcg(7))
    // tenor sounds a major 9th below written: concert = written - 14
    for (const concert of ex.targetsConcert) {
      const written = concert + 14
      expect(written).toBeGreaterThanOrEqual(DEFAULT_SETTINGS.lowWritten)
      expect(written).toBeLessThanOrEqual(DEFAULT_SETTINGS.highWritten)
    }
  })

  it('throws when the range cannot fit the scale', () => {
    expect(() =>
      generateExercise({ ...DEFAULT_SETTINGS, lowWritten: 60, highWritten: 61 }),
    ).toThrow()
  })
})
