import { SCALES, type ExerciseSettings, type ScaleId } from '../theory/exercise'
import {
  INSTRUMENT_LABEL,
  keyPrefersFlats,
  noteName,
  pcName,
  TRANSPOSITION,
  type Instrument,
} from '../theory/notes'

interface SettingsPanelProps {
  open: boolean
  settings: ExerciseSettings
  onChange: (s: ExerciseSettings) => void
  onClose: () => void
}

const INTERVALS: Array<[number, string]> = [
  [3, 'Minor 3rd'],
  [4, 'Major 3rd'],
  [5, 'Perfect 4th'],
  [7, 'Perfect 5th'],
  [9, 'Major 6th'],
  [12, 'Octave'],
]

const RANGE_MIN = 53 // written F3
const RANGE_MAX = 94 // written Bb6
const MIN_SPAN = 5

const TRANSPOSITION_HINT: Record<Instrument, string> = {
  tenor: 'sounds a major 9th below written',
  alto: 'sounds a major 6th below written',
  concert: 'written pitch = sounding pitch',
}

export function SettingsPanel({ open, settings, onChange, onClose }: SettingsPanelProps) {
  if (!open) return null
  const flats = keyPrefersFlats(settings.keyRootPc)
  const noteOptions: number[] = []
  for (let m = RANGE_MIN; m <= RANGE_MAX; m++) noteOptions.push(m)

  const set = <K extends keyof ExerciseSettings>(key: K, value: ExerciseSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="backdrop" onClick={onClose}>
      <aside className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <label className="field">
          <span>Instrument</span>
          <select
            value={settings.instrument}
            onChange={(e) => set('instrument', e.target.value as Instrument)}
          >
            {(Object.keys(TRANSPOSITION) as Instrument[]).map((inst) => (
              <option key={inst} value={inst}>{INSTRUMENT_LABEL[inst]}</option>
            ))}
          </select>
          <small>{TRANSPOSITION_HINT[settings.instrument]} · note names are written pitch</small>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Key</span>
            <select
              value={settings.keyRootPc}
              onChange={(e) => set('keyRootPc', Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, pc) => (
                <option key={pc} value={pc}>{pcName(pc, keyPrefersFlats(pc))}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Scale</span>
            <select
              value={settings.scale}
              onChange={(e) => set('scale', e.target.value as ScaleId)}
            >
              {(Object.keys(SCALES) as ScaleId[]).map((id) => (
                <option key={id} value={id}>{SCALES[id].label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Phrase length — {settings.length} notes</span>
          <input
            type="range"
            min={2}
            max={8}
            value={settings.length}
            onChange={(e) => set('length', Number(e.target.value))}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Lowest note</span>
            <select
              value={settings.lowWritten}
              onChange={(e) =>
                set('lowWritten', Math.min(Number(e.target.value), settings.highWritten - MIN_SPAN))
              }
            >
              {noteOptions.map((m) => (
                <option key={m} value={m}>{noteName(m, flats)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Highest note</span>
            <select
              value={settings.highWritten}
              onChange={(e) =>
                set('highWritten', Math.max(Number(e.target.value), settings.lowWritten + MIN_SPAN))
              }
            >
              {noteOptions.map((m) => (
                <option key={m} value={m}>{noteName(m, flats)}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Largest leap</span>
          <select
            value={settings.maxInterval}
            onChange={(e) => set('maxInterval', Number(e.target.value))}
          >
            {INTERVALS.map(([semis, label]) => (
              <option key={semis} value={semis}>{label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Tempo — {settings.bpm} BPM</span>
          <input
            type="range"
            min={40}
            max={160}
            step={2}
            value={settings.bpm}
            onChange={(e) => set('bpm', Number(e.target.value))}
          />
        </label>

        <p className="hint">Changes apply to the next phrase.</p>
      </aside>
    </div>
  )
}
