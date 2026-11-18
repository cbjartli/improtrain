import { midiToFreq } from '../theory/notes'

/** Simple reed-ish voice: detuned saws → lowpass → envelope, light vibrato. */
export class Synth {
  private ctx: AudioContext
  private master: GainNode

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.master = this.createMaster()
  }

  private createMaster(): GainNode {
    const g = this.ctx.createGain()
    g.gain.value = 0.26
    g.connect(this.ctx.destination)
    return g
  }

  get now(): number {
    return this.ctx.currentTime
  }

  /** Silences everything scheduled (orphaned notes keep running into a dead bus). */
  panic(): void {
    this.master.disconnect()
    this.master = this.createMaster()
  }

  playNote(concertMidi: number, when: number, duration: number): void {
    const ctx = this.ctx
    const freq = midiToFreq(concertMidi)

    const osc1 = ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc1.frequency.value = freq
    const osc2 = ctx.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.value = freq
    osc2.detune.value = 7

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = Math.min(freq * 5, 4200)
    filter.Q.value = 0.8

    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 5.2
    const vibratoGain = ctx.createGain()
    vibratoGain.gain.setValueAtTime(0, when)
    vibratoGain.gain.setTargetAtTime(freq * 0.004, when + 0.3, 0.25)
    vibrato.connect(vibratoGain)
    vibratoGain.connect(osc1.frequency)
    vibratoGain.connect(osc2.frequency)

    const gain = ctx.createGain()
    const g = gain.gain
    const peak = 0.5
    g.setValueAtTime(0, when)
    g.linearRampToValueAtTime(peak, when + 0.045)
    g.setTargetAtTime(peak * 0.78, when + 0.09, 0.12)
    g.setTargetAtTime(0, when + duration, 0.05)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)

    const stopAt = when + duration + 0.4
    for (const node of [osc1, osc2, vibrato]) {
      node.start(when)
      node.stop(stopAt)
    }
    osc1.onended = () => {
      gain.disconnect()
      filter.disconnect()
      vibratoGain.disconnect()
    }
  }
}
