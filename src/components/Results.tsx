import type { Exercise } from '../theory/exercise'
import type { Instrument } from '../theory/notes'
import { NoteSlots, type Attempt } from './NoteSlots'

interface ResultsProps {
  exercise: Exercise
  attempts: Attempt[]
  instrument: Instrument
  preferFlats: boolean
  replays: number
  replaying: boolean
  playingIndex: number | null
  onReplayTarget: () => void
  onReplayYours: () => void
  onRetry: () => void
  onNext: () => void
  onDone: () => void
}

function verdict(correct: number, total: number): string {
  if (correct === total) return 'Smokin’! Perfect phrase. 🔥'
  const ratio = correct / total
  if (ratio >= 0.8) return 'Swinging hard — almost there.'
  if (ratio >= 0.5) return 'Getting there. Keep shedding.'
  return 'Back to the woodshed — you’ve got this.'
}

export function Results({
  exercise,
  attempts,
  instrument,
  preferFlats,
  replays,
  replaying,
  playingIndex,
  onReplayTarget,
  onReplayYours,
  onRetry,
  onNext,
  onDone,
}: ResultsProps) {
  const total = exercise.targetsConcert.length
  const correct = attempts.filter((a) => a.correct).length

  return (
    <div className="stage">
      <div className="results-score">
        <span className="score-num">
          {correct}<span className="score-den">/{total}</span>
        </span>
        <p className="verdict">{verdict(correct, total)}</p>
        {replays > 0 && (
          <p className="hint">phrase replayed {replays}×</p>
        )}
      </div>

      <NoteSlots
        count={total}
        attempts={attempts}
        targets={exercise.targetsConcert}
        reveal
        playingIndex={playingIndex}
        instrument={instrument}
        preferFlats={preferFlats}
      />

      <div className="btn-row">
        <button className="btn ghost" onClick={onReplayTarget} disabled={replaying}>
          ▶ Target
        </button>
        <button className="btn ghost" onClick={onReplayYours} disabled={replaying}>
          ▶ Yours
        </button>
      </div>
      <div className="btn-row">
        <button className="btn ghost" onClick={onRetry}>Retry phrase</button>
        <button className="btn primary" onClick={onNext}>Next phrase →</button>
      </div>
      <button className="btn link" onClick={onDone}>Done for now</button>
    </div>
  )
}
