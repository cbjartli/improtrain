import type { PitchSample } from '../audio/pitchDetector'
import { concertToWritten, freqToMidiFloat, noteName, type Instrument } from '../theory/notes'

interface PitchMeterProps {
  sample: PitchSample
  instrument: Instrument
  preferFlats: boolean
}

/** Live tuner: written note name + cents needle. */
export function PitchMeter({ sample, instrument, preferFlats }: PitchMeterProps) {
  const voiced = sample.freq !== null && sample.clarity >= 0.85 && sample.rms >= 0.006
  let label = '–'
  let cents = 0
  if (voiced) {
    const midiFloat = freqToMidiFloat(sample.freq as number)
    const midi = Math.round(midiFloat)
    cents = Math.max(-50, Math.min(50, Math.round((midiFloat - midi) * 100)))
    label = noteName(concertToWritten(midi, instrument), preferFlats)
  }
  const inTune = voiced && Math.abs(cents) <= 15

  return (
    <div className={`meter${voiced ? ' voiced' : ''}`}>
      <div className={`meter-note${inTune ? ' in-tune' : ''}`}>{label}</div>
      <div className="meter-bar">
        <div className="meter-tick" />
        <div
          className={`meter-needle${inTune ? ' in-tune' : ''}`}
          style={{ left: `${50 + cents}%`, opacity: voiced ? 1 : 0 }}
        />
      </div>
      <div className="meter-cents">
        {voiced ? `${cents > 0 ? '+' : ''}${cents}¢` : 'listening…'}
      </div>
    </div>
  )
}
