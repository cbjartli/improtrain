import { describe, expect, it } from 'vitest'
import { midiToFreq } from '../theory/notes'
import { NoteCapturer, type CapturedNote } from './noteCapturer'

const voiced = (midi: number) => ({ freq: midiToFreq(midi), clarity: 0.95, rms: 0.05 })
const silence = { freq: null, clarity: 0, rms: 0 }

function feed(
  cap: NoteCapturer,
  sample: { freq: number | null; clarity: number; rms: number },
  from: number,
  to: number,
  step = 33,
): CapturedNote[] {
  const out: CapturedNote[] = []
  for (let t = from; t <= to; t += step) {
    const note = cap.push(sample, t)
    if (note) out.push(note)
  }
  return out
}

describe('NoteCapturer', () => {
  it('registers a steadily held note exactly once', () => {
    const cap = new NoteCapturer()
    const notes = feed(cap, voiced(69), 0, 1000)
    expect(notes).toHaveLength(1)
    expect(notes[0].midi).toBe(69)
  })

  it('ignores a brief wobble away from and back to the held note', () => {
    const cap = new NoteCapturer()
    feed(cap, voiced(69), 0, 400)
    feed(cap, voiced(70), 433, 466) // shorter than the hold threshold
    const after = feed(cap, voiced(69), 499, 1200)
    expect(after).toHaveLength(0)
  })

  it('registers a slurred note change without intervening silence', () => {
    const cap = new NoteCapturer()
    const first = feed(cap, voiced(69), 0, 400)
    const second = feed(cap, voiced(72), 433, 900)
    expect(first.map((n) => n.midi)).toEqual([69])
    expect(second.map((n) => n.midi)).toEqual([72])
  })

  it('allows re-attacking the same note after a silence', () => {
    const cap = new NoteCapturer()
    const first = feed(cap, voiced(69), 0, 400)
    feed(cap, silence, 433, 666)
    const again = feed(cap, voiced(69), 699, 1100)
    expect(first).toHaveLength(1)
    expect(again).toHaveLength(1)
  })
})
