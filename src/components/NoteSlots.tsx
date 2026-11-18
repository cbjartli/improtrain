import { concertToWritten, noteName, type Instrument } from '../theory/notes'

export interface Attempt {
  /** Concert MIDI of the expected note. */
  target: number
  /** Concert MIDI of the note the player produced. */
  played: number
  /** Median cents deviation of the played note. */
  cents: number
  correct: boolean
}

interface NoteSlotsProps {
  count: number
  attempts: Attempt[]
  /** Slot whose note is currently sounding from the synth. */
  playingIndex?: number | null
  instrument: Instrument
  preferFlats: boolean
}

/** Phrase progress dots, used while the synth demos the phrase. */
export function NoteSlots({
  count,
  attempts,
  playingIndex = null,
  instrument,
  preferFlats,
}: NoteSlotsProps) {
  const written = (concert: number) => noteName(concertToWritten(concert, instrument), preferFlats)

  return (
    <div className="slots">
      {Array.from({ length: count }, (_, i) => {
        const attempt = attempts[i]
        const classes = ['slot']
        if (playingIndex === i) classes.push('playing')
        if (attempt) classes.push(attempt.correct ? 'correct' : 'wrong')
        const main = attempt ? written(attempt.played) : String(i + 1)
        return (
          <div key={i} className={classes.join(' ')}>
            <span className="slot-main">{main}</span>
          </div>
        )
      })}
    </div>
  )
}
