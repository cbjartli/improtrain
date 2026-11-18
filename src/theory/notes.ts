export type Instrument = 'tenor' | 'alto' | 'concert'

/** Semitones the written pitch sits above the sounding (concert) pitch. */
export const TRANSPOSITION: Record<Instrument, number> = {
  tenor: 14, // Bb instrument: written a major 9th above concert
  alto: 9, // Eb instrument: written a major 6th above concert
  concert: 0,
}

export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  tenor: 'Tenor sax (Bb)',
  alto: 'Alto sax (Eb)',
  concert: 'Concert pitch',
}

export const writtenToConcert = (written: number, instrument: Instrument): number =>
  written - TRANSPOSITION[instrument]

export const concertToWritten = (concert: number, instrument: Instrument): number =>
  concert + TRANSPOSITION[instrument]

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export function pcName(pc: number, preferFlats = true): string {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES
  return names[((pc % 12) + 12) % 12]
}

export function noteName(midi: number, preferFlats = true): string {
  return `${pcName(midi % 12, preferFlats)}${Math.floor(midi / 12) - 1}`
}

/** Sharp keys (G D A E B F#) spell with sharps; everything else with flats. */
export function keyPrefersFlats(rootPc: number): boolean {
  return ![7, 2, 9, 4, 11, 6].includes(((rootPc % 12) + 12) % 12)
}

export const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12)

export const freqToMidiFloat = (freq: number): number => 69 + 12 * Math.log2(freq / 440)

/** Cents that `freq` sits above (+) or below (−) the center of `midi`. */
export function centsOff(freq: number, midi: number): number {
  return Math.round((freqToMidiFloat(freq) - midi) * 100)
}

export interface VexKey {
  /** VexFlow key string, e.g. `bb/4`. */
  key: string
  accidental: '#' | 'b' | null
}

/** Maps a (written) MIDI note to VexFlow's key/accidental notation. */
export function midiToVexKey(midi: number, preferFlats = true): VexKey {
  const name = pcName(midi % 12, preferFlats)
  const octave = Math.floor(midi / 12) - 1
  const letter = name[0].toLowerCase()
  const accidental = name.length > 1 ? (name[1] as '#' | 'b') : null
  return { key: `${letter}${accidental ?? ''}/${octave}`, accidental }
}
