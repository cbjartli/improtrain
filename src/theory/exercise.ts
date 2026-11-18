import { type Instrument, writtenToConcert } from './notes'

export type ScaleId =
  | 'major'
  | 'majorPent'
  | 'minorPent'
  | 'blues'
  | 'dorian'
  | 'mixolydian'
  | 'chromatic'

export const SCALES: Record<ScaleId, { label: string; steps: number[] }> = {
  major: { label: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  majorPent: { label: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
  minorPent: { label: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
  blues: { label: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
  dorian: { label: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { label: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10] },
  chromatic: { label: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
}

export interface ExerciseSettings {
  instrument: Instrument
  /** Written pitch class of the key root (0 = C). */
  keyRootPc: number
  scale: ScaleId
  /** Number of notes in the phrase. */
  length: number
  /** Written MIDI range for generated notes. */
  lowWritten: number
  highWritten: number
  /** Largest melodic leap, in semitones. */
  maxInterval: number
  bpm: number
}

export const DEFAULT_SETTINGS: ExerciseSettings = {
  instrument: 'tenor',
  keyRootPc: 0,
  scale: 'major',
  length: 3,
  lowWritten: 60, // written C4
  highWritten: 81, // written A5
  maxInterval: 7,
  bpm: 72,
}

export interface Exercise {
  /** Sounding (concert) pitches. */
  referenceConcert: number
  targetsConcert: number[]
}

/** All written MIDI notes of the configured scale inside the configured range. */
export function scaleNotesInRange(settings: ExerciseSettings): number[] {
  const pcs = new Set(SCALES[settings.scale].steps.map((s) => (s + settings.keyRootPc) % 12))
  const notes: number[] = []
  for (let m = settings.lowWritten; m <= settings.highWritten; m++) {
    if (pcs.has(((m % 12) + 12) % 12)) notes.push(m)
  }
  return notes
}

/**
 * Random-walk phrase through the scale: starts near the reference (tonic),
 * never repeats a note back-to-back, and keeps leaps within `maxInterval`.
 */
export function generateExercise(
  settings: ExerciseSettings,
  rng: () => number = Math.random,
): Exercise {
  const pool = scaleNotesInRange(settings)
  if (pool.length < 2) {
    throw new Error('The note range is too small for this scale — widen it in settings.')
  }

  const mid = (settings.lowWritten + settings.highWritten) / 2
  const rootPc = ((settings.keyRootPc % 12) + 12) % 12
  const roots = pool.filter((m) => ((m % 12) + 12) % 12 === rootPc)
  const refPool = roots.length > 0 ? roots : pool
  const refWritten = refPool.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))

  const targets: number[] = []
  let prev = refWritten
  for (let i = 0; i < settings.length; i++) {
    let candidates = pool.filter((m) => m !== prev && Math.abs(m - prev) <= settings.maxInterval)
    if (candidates.length === 0) candidates = pool.filter((m) => m !== prev)
    const next = candidates[Math.floor(rng() * candidates.length)]
    targets.push(next)
    prev = next
  }

  return {
    referenceConcert: writtenToConcert(refWritten, settings.instrument),
    targetsConcert: targets.map((m) => writtenToConcert(m, settings.instrument)),
  }
}
