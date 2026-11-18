import { useEffect, useRef, useState } from 'react'
import type { AudioEngine } from '../App'
import { detectPitch, type PitchSample } from '../audio/pitchDetector'
import { NoteCapturer, type CapturedNote } from '../capture/noteCapturer'
import { generateExercise, SCALES, type Exercise, type ExerciseSettings } from '../theory/exercise'
import { concertToWritten, keyPrefersFlats, noteName, pcName } from '../theory/notes'
import { NoteSlots, type Attempt } from './NoteSlots'
import { PitchMeter } from './PitchMeter'
import { Results } from './Results'

export type Phase = 'idle' | 'demo' | 'listen' | 'results'

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Ready',
  demo: 'Listen',
  listen: 'Your turn',
  results: 'Results',
}

const REF_SECONDS = 1.7
const SILENT: PitchSample = { freq: null, clarity: 0, rms: 0 }

interface LessonProps {
  settings: ExerciseSettings
  engine: AudioEngine | null
  ensureAudio: () => Promise<AudioEngine>
  onNoteScored: (correct: boolean) => void
  onExerciseDone: () => void
}

export function Lesson({ settings, engine, ensureAudio, onNoteScored, onExerciseDone }: LessonProps) {
  const [phase, setPhaseState] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const [live, setLive] = useState<PitchSample>(SILENT)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [demoNote, setDemoNote] = useState<'ref' | number | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [replays, setReplays] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const exerciseRef = useRef<Exercise | null>(null)
  const attemptsRef = useRef<Attempt[]>([])
  const capturerRef = useRef(new NoteCapturer())
  const timersRef = useRef<number[]>([])
  const callbacksRef = useRef({ onNoteScored, onExerciseDone })

  const preferFlats = keyPrefersFlats(settings.keyRootPc)

  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, Math.max(0, ms)))
  }
  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }
  useEffect(() => clearTimers, [])

  const registerAttempt = (note: CapturedNote) => {
    const ex = exerciseRef.current
    if (!ex || phaseRef.current !== 'listen') return
    const idx = attemptsRef.current.length
    if (idx >= ex.targetsConcert.length) return
    const target = ex.targetsConcert[idx]
    const attempt: Attempt = {
      target,
      played: note.midi,
      cents: note.cents,
      correct: note.midi === target,
    }
    attemptsRef.current = [...attemptsRef.current, attempt]
    setAttempts(attemptsRef.current)
    callbacksRef.current.onNoteScored(attempt.correct)
    if (attemptsRef.current.length === ex.targetsConcert.length) {
      callbacksRef.current.onExerciseDone()
      schedule(() => setPhase('results'), 900)
    }
  }
  const registerAttemptRef = useRef(registerAttempt)
  useEffect(() => {
    callbacksRef.current = { onNoteScored, onExerciseDone }
    registerAttemptRef.current = registerAttempt
  })

  // Continuous pitch loop: feeds the tuner always, the capturer while listening.
  useEffect(() => {
    if (!engine) return
    const buf = new Float32Array(engine.analyser.fftSize)
    let wasVoiced = false
    const id = window.setInterval(() => {
      engine.analyser.getFloatTimeDomainData(buf)
      const sample = detectPitch(buf, engine.ctx.sampleRate)
      const voiced = sample.freq !== null
      if (voiced || wasVoiced) setLive(voiced ? sample : SILENT)
      wasVoiced = voiced
      if (phaseRef.current === 'listen') {
        const captured = capturerRef.current.push(sample, performance.now())
        if (captured) registerAttemptRef.current(captured)
      }
    }, 33)
    return () => window.clearInterval(id)
  }, [engine])

  const scheduleAt = (eng: AudioEngine, when: number, fn: () => void) =>
    schedule(fn, (when - eng.synth.now) * 1000)

  /** Plays [reference +] phrase, then hands over to the player. */
  const playDemo = (eng: AudioEngine, ex: Exercise, withReference: boolean) => {
    clearTimers()
    eng.synth.panic()
    setPhase('demo')
    setDemoNote(null)
    const beat = 60 / settings.bpm
    let t = eng.synth.now + 0.25
    if (withReference) {
      eng.synth.playNote(ex.referenceConcert, t, REF_SECONDS)
      scheduleAt(eng, t, () => setDemoNote('ref'))
      t += REF_SECONDS + 0.7
    }
    ex.targetsConcert.forEach((midi, i) => {
      const when = t + i * beat
      eng.synth.playNote(midi, when, beat * 0.85)
      scheduleAt(eng, when, () => setDemoNote(i))
    })
    const end = t + ex.targetsConcert.length * beat + 0.35
    scheduleAt(eng, end, () => {
      setDemoNote(null)
      capturerRef.current.reset()
      setPhase('listen')
    })
  }

  const begin = async (existing?: Exercise) => {
    setError(null)
    let eng: AudioEngine
    try {
      eng = await ensureAudio()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audio setup failed.')
      return
    }
    let ex: Exercise
    try {
      ex = existing ?? generateExercise(settings)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build an exercise.')
      return
    }
    exerciseRef.current = ex
    setExercise(ex)
    attemptsRef.current = []
    setAttempts([])
    setReplays(0)
    setReplaying(false)
    playDemo(eng, ex, true)
  }

  const replaySequence = () => {
    if (!engine || !exerciseRef.current) return
    setReplays((r) => r + 1)
    playDemo(engine, exerciseRef.current, false)
  }

  const hearReference = () => {
    if (!engine || !exerciseRef.current) return
    clearTimers()
    engine.synth.panic()
    setPhase('demo')
    setDemoNote('ref')
    engine.synth.playNote(exerciseRef.current.referenceConcert, engine.synth.now + 0.1, 1.3)
    schedule(() => {
      setDemoNote(null)
      capturerRef.current.reset()
      setPhase('listen')
    }, 1650)
  }

  const stop = () => {
    clearTimers()
    engine?.synth.panic()
    setPhase('idle')
    setDemoNote(null)
    attemptsRef.current = []
    setAttempts([])
    exerciseRef.current = null
    setExercise(null)
    setReplaying(false)
  }

  /** Replay inside results without leaving the results screen. */
  const replayNotes = (midis: number[]) => {
    if (!engine || replaying) return
    setReplaying(true)
    const beat = 60 / settings.bpm
    const t0 = engine.synth.now + 0.15
    midis.forEach((m, i) => {
      const when = t0 + i * beat
      engine.synth.playNote(m, when, beat * 0.85)
      scheduleAt(engine, when, () => setDemoNote(i))
    })
    scheduleAt(engine, t0 + midis.length * beat + 0.2, () => {
      setDemoNote(null)
      setReplaying(false)
    })
  }

  const keyLabel = `${pcName(settings.keyRootPc, preferFlats)} ${SCALES[settings.scale].label}`
  const refWrittenName = exercise
    ? noteName(concertToWritten(exercise.referenceConcert, settings.instrument), preferFlats)
    : ''
  const slotPlaying = typeof demoNote === 'number' ? demoNote : null

  return (
    <div className="card lesson">
      <div className="card-top">
        <span className={`phase-chip phase-${phase}`}>{PHASE_LABEL[phase]}</span>
        <span className="key-chip">{keyLabel}</span>
      </div>

      {phase === 'idle' && (
        <div className="stage">
          <h2>Echo the phrase</h2>
          <ol className="how">
            <li>Hear the reference note — the tonic.</li>
            <li>Listen to a short phrase.</li>
            <li>Play it back on your horn. Every note is scored.</li>
          </ol>
          {error && <p className="error">{error}</p>}
          <button className="btn primary big" onClick={() => void begin()}>
            ▶ Start exercise
          </button>
          <p className="hint">Uses your microphone · headphones recommended</p>
        </div>
      )}

      {phase === 'demo' && exercise && (
        <div className="stage">
          {demoNote === 'ref' ? (
            <>
              <div className="big-note accent">{refWrittenName}</div>
              <p className="hint">Reference — tonic of {keyLabel}</p>
            </>
          ) : (
            <>
              <div className="big-note dim">♪</div>
              <p className="hint">Listen to the phrase…</p>
            </>
          )}
          <NoteSlots
            count={exercise.targetsConcert.length}
            attempts={attempts}
            playingIndex={slotPlaying}
            instrument={settings.instrument}
            preferFlats={preferFlats}
          />
        </div>
      )}

      {phase === 'listen' && exercise && (
        <div className="stage">
          <p className="your-turn">
            Play note {Math.min(attempts.length + 1, exercise.targetsConcert.length)} of{' '}
            {exercise.targetsConcert.length}
          </p>
          <NoteSlots
            count={exercise.targetsConcert.length}
            attempts={attempts}
            activeIndex={attempts.length}
            instrument={settings.instrument}
            preferFlats={preferFlats}
          />
          <PitchMeter sample={live} instrument={settings.instrument} preferFlats={preferFlats} />
          <div className="btn-row">
            <button className="btn ghost" onClick={hearReference}>Reference</button>
            <button className="btn ghost" onClick={replaySequence}>Replay phrase</button>
            <button className="btn ghost danger" onClick={stop}>Stop</button>
          </div>
        </div>
      )}

      {phase === 'results' && exercise && (
        <Results
          exercise={exercise}
          attempts={attempts}
          instrument={settings.instrument}
          preferFlats={preferFlats}
          replays={replays}
          replaying={replaying}
          playingIndex={slotPlaying}
          onReplayTarget={() => replayNotes(exercise.targetsConcert)}
          onReplayYours={() => replayNotes(attempts.map((a) => a.played))}
          onRetry={() => void begin(exercise)}
          onNext={() => void begin()}
          onDone={stop}
        />
      )}
    </div>
  )
}
