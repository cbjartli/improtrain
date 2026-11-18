import type { PitchSample } from '../audio/pitchDetector'
import { freqToMidiFloat } from '../theory/notes'

export interface CapturedNote {
  /** Concert MIDI note. */
  midi: number
  /** Median cents deviation from the note's center while it was held. */
  cents: number
}

const CLARITY_MIN = 0.85
const RMS_MIN = 0.006
/** A pitch must stay on one note this long to count as an attempt. */
const HOLD_MS = 140
/** Silence this long re-arms capture (allows repeating the same note). */
const SILENCE_REARM_MS = 90

/**
 * Turns a stream of pitch samples into discrete note attempts.
 * Registers a note once it is held steadily; the next attempt needs either a
 * different note (slurred) or a short silence (re-attack). Brief wobbles back
 * to the held note never double-register.
 */
export class NoteCapturer {
  private candidateMidi: number | null = null
  private candidateSince = 0
  private centsSamples: number[] = []
  private silenceSince: number | null = null
  private armed = true
  private lastRegistered: number | null = null

  reset(): void {
    this.candidateMidi = null
    this.candidateSince = 0
    this.centsSamples = []
    this.silenceSince = null
    this.armed = true
    this.lastRegistered = null
  }

  push(sample: PitchSample, timeMs: number): CapturedNote | null {
    const freq = sample.freq
    if (freq === null || sample.clarity < CLARITY_MIN || sample.rms < RMS_MIN) {
      this.candidateMidi = null
      this.centsSamples = []
      this.silenceSince ??= timeMs
      if (timeMs - this.silenceSince >= SILENCE_REARM_MS) this.armed = true
      return null
    }

    this.silenceSince = null
    const midiFloat = freqToMidiFloat(freq)
    const midi = Math.round(midiFloat)
    if (midi !== this.candidateMidi) {
      this.candidateMidi = midi
      this.candidateSince = timeMs
      this.centsSamples = []
    }
    this.centsSamples.push(Math.round((midiFloat - midi) * 100))

    const held = timeMs - this.candidateSince >= HOLD_MS
    const isNewNote = midi !== this.lastRegistered
    if (held && (this.armed || isNewNote)) {
      this.armed = false
      this.lastRegistered = midi
      const sorted = [...this.centsSamples].sort((a, b) => a - b)
      return { midi, cents: sorted[Math.floor(sorted.length / 2)] }
    }
    return null
  }
}
