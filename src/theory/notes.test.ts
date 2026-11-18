import { describe, expect, it } from 'vitest'
import {
  centsOff,
  concertToWritten,
  freqToMidiFloat,
  keyPrefersFlats,
  midiToFreq,
  noteName,
  writtenToConcert,
} from './notes'

describe('transposition', () => {
  it('tenor written C5 sounds Bb3', () => {
    expect(writtenToConcert(72, 'tenor')).toBe(58)
    expect(concertToWritten(58, 'tenor')).toBe(72)
  })

  it('alto written A4 sounds C4', () => {
    expect(writtenToConcert(69, 'alto')).toBe(60)
    expect(concertToWritten(60, 'alto')).toBe(69)
  })

  it('concert pitch is identity', () => {
    expect(writtenToConcert(60, 'concert')).toBe(60)
  })
})

describe('note naming', () => {
  it('uses flats by default, sharps on request', () => {
    expect(noteName(70)).toBe('Bb4')
    expect(noteName(70, false)).toBe('A#4')
    expect(noteName(60)).toBe('C4')
  })

  it('sharp keys prefer sharps', () => {
    expect(keyPrefersFlats(7)).toBe(false) // G
    expect(keyPrefersFlats(10)).toBe(true) // Bb
  })
})

describe('pitch math', () => {
  it('converts between frequency and midi', () => {
    expect(freqToMidiFloat(440)).toBeCloseTo(69)
    expect(midiToFreq(57)).toBeCloseTo(220)
  })

  it('computes cents offset from a note center', () => {
    const sharp20 = 440 * Math.pow(2, 20 / 1200)
    expect(centsOff(sharp20, 69)).toBe(20)
    expect(centsOff(440, 69)).toBe(0)
  })
})
