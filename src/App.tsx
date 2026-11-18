import { useCallback, useEffect, useRef, useState } from 'react'
import { openMic } from './audio/mic'
import { Synth } from './audio/synth'
import { Lesson } from './components/Lesson'
import { SettingsPanel } from './components/SettingsPanel'
import { DEFAULT_SETTINGS, type ExerciseSettings } from './theory/exercise'
import { INSTRUMENT_LABEL } from './theory/notes'

export interface AudioEngine {
  ctx: AudioContext
  synth: Synth
  analyser: AnalyserNode
}

const SETTINGS_KEY = 'improtrain-settings-v1'

function loadSettings(): ExerciseSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ExerciseSettings>) }
  } catch {
    // corrupted storage — fall back to defaults
  }
  return DEFAULT_SETTINGS
}

export default function App() {
  const [settings, setSettings] = useState<ExerciseSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [stats, setStats] = useState({ correct: 0, total: 0, exercises: 0 })
  const [engine, setEngine] = useState<AudioEngine | null>(null)
  const engineRef = useRef<AudioEngine | null>(null)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  /** Lazily creates the AudioContext + mic on a user gesture. */
  const ensureAudio = useCallback(async (): Promise<AudioEngine> => {
    if (engineRef.current) {
      await engineRef.current.ctx.resume()
      return engineRef.current
    }
    const ctx = new AudioContext()
    await ctx.resume()
    try {
      const mic = await openMic(ctx)
      const eng: AudioEngine = { ctx, synth: new Synth(ctx), analyser: mic.analyser }
      engineRef.current = eng
      setEngine(eng)
      return eng
    } catch {
      void ctx.close()
      throw new Error(
        'Microphone access is required — allow it in your browser and try again.',
      )
    }
  }, [])

  const onNoteScored = useCallback((correct: boolean) => {
    setStats((s) => ({ ...s, total: s.total + 1, correct: s.correct + (correct ? 1 : 0) }))
  }, [])

  const onExerciseDone = useCallback(() => {
    setStats((s) => ({ ...s, exercises: s.exercises + 1 }))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">🎷</span>
          <div>
            <h1>ImproTrain</h1>
            <span className="brand-sub">{INSTRUMENT_LABEL[settings.instrument]}</span>
          </div>
        </div>
        <div className="header-right">
          {stats.total > 0 && (
            <span className="stats-pill" title="Session accuracy">
              ♪ {stats.correct}/{stats.total} · {stats.exercises} phrase{stats.exercises === 1 ? '' : 's'}
            </span>
          )}
          <button
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <main>
        <Lesson
          settings={settings}
          engine={engine}
          ensureAudio={ensureAudio}
          onNoteScored={onNoteScored}
          onExerciseDone={onExerciseDone}
        />
      </main>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
