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
  /** Concert targets; shown only when `reveal` is on (results). */
  targets?: number[]
  reveal?: boolean
  /** Slot waiting for the player's next note. */
  activeIndex?: number | null
  /** Slot whose note is currently sounding from the synth. */
  playingIndex?: number | null
  instrument: Instrument
  preferFlats: boolean
}

export function NoteSlots({
  count,
  attempts,
  targets,
  reveal = false,
  activeIndex = null,
  playingIndex = null,
  instrument,
  preferFlats,
}: NoteSlotsProps) {
  const written = (concert: number) => noteName(concertToWritten(concert, instrument), preferFlats)

  return (
    <div className={`slots${reveal ? ' reveal' : ''}`}>
      {Array.from({ length: count }, (_, i) => {
        const attempt = attempts[i]
        const classes = ['slot']
        if (playingIndex === i) classes.push('playing')
        else if (activeIndex === i) classes.push('active')
        if (attempt) classes.push(attempt.correct ? 'correct' : 'wrong')

        let main: string
        let sub: string | null = null
        if (reveal && targets) {
          main = written(targets[i])
          if (attempt && !attempt.correct) sub = `you: ${written(attempt.played)}`
          else if (attempt) sub = `${attempt.cents > 0 ? '+' : ''}${attempt.cents}¢`
        } else if (attempt) {
          main = written(attempt.played)
        } else if (activeIndex === i) {
          main = '●'
        } else {
          main = String(i + 1)
        }

        return (
          <div key={i} className={classes.join(' ')}>
            <span className="slot-main">{main}</span>
            {sub && <span className="slot-sub">{sub}</span>}
          </div>
        )
      })}
    </div>
  )
}
