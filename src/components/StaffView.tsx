import { useEffect, useRef } from 'react'
import { Accidental, Annotation, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import { concertToWritten, midiToVexKey, type Instrument } from '../theory/notes'
import type { Attempt } from './NoteSlots'

const STAFF = '#8b91a7'
const CORRECT = '#3ecf8e'
const WRONG = '#ff6b6b'
const TARGET = '#f0b54a'

interface StaffViewProps {
  count: number
  attempts: Attempt[]
  /** Concert targets; a gold target notehead is added to missed notes when set. */
  targets?: number[] | null
  reveal?: boolean
  instrument: Instrument
  preferFlats: boolean
}

/**
 * Renders played notes (written pitch) on a treble staff. Correct notes are
 * green, misses red; in reveal mode a miss also shows the intended note in
 * gold at the same beat.
 */
export function StaffView({
  count,
  attempts,
  targets = null,
  reveal = false,
  instrument,
  preferFlats,
}: StaffViewProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''

    const written = (concert: number) => concertToWritten(concert, instrument)
    const positions = reveal ? count : attempts.length
    // Reserve the full phrase width up front so the staff doesn't grow note by note.
    const width = Math.max(190, 96 + count * 64)
    const height = 210

    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const ctx = renderer.getContext()
    ctx.setFillStyle(STAFF)
    ctx.setStrokeStyle(STAFF)

    const stave = new Stave(6, 50, width - 12)
    stave.addClef('treble')
    stave.setStyle({ fillStyle: STAFF, strokeStyle: STAFF })
    stave.setContext(ctx).draw()

    const notes: StaveNote[] = []
    const addCents = (note: StaveNote, attempt: Attempt) => {
      if (!reveal) return
      const text = `${attempt.cents > 0 ? '+' : ''}${attempt.cents}¢`
      const annotation = new Annotation(text)
      annotation.setFont('system-ui', 10)
      annotation.setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
      annotation.setStyle(
        attempt.correct
          ? { fillStyle: STAFF, strokeStyle: STAFF }
          : { fillStyle: WRONG, strokeStyle: WRONG },
      )
      note.addModifier(annotation, 0)
    }

    for (let i = 0; i < positions; i++) {
      const attempt = attempts[i]
      if (!attempt) continue
      const playedWritten = written(attempt.played)

      if (reveal && targets && !attempt.correct) {
        // Miss: chord of played (red) + target (gold), keys bottom-to-top.
        const targetWritten = written(targets[i])
        const lo = Math.min(playedWritten, targetWritten)
        const hi = Math.max(playedWritten, targetWritten)
        const loKey = midiToVexKey(lo, preferFlats)
        const hiKey = midiToVexKey(hi, preferFlats)
        const note = new StaveNote({
          keys: [loKey.key, hiKey.key],
          duration: 'q',
          clef: 'treble',
          autoStem: true,
        })
        note.setStyle({ fillStyle: STAFF, strokeStyle: STAFF })
        const playedIdx = playedWritten === lo ? 0 : 1
        note.setKeyStyle(playedIdx, { fillStyle: WRONG, strokeStyle: WRONG })
        note.setKeyStyle(1 - playedIdx, { fillStyle: TARGET, strokeStyle: TARGET })
        if (loKey.accidental) note.addModifier(new Accidental(loKey.accidental), 0)
        if (hiKey.accidental) note.addModifier(new Accidental(hiKey.accidental), 1)
        note.setLedgerLineStyle({ strokeStyle: STAFF })
        addCents(note, attempt)
        notes.push(note)
      } else {
        const vk = midiToVexKey(playedWritten, preferFlats)
        const color = attempt.correct ? CORRECT : WRONG
        const note = new StaveNote({
          keys: [vk.key],
          duration: 'q',
          clef: 'treble',
          autoStem: true,
        })
        note.setStyle({ fillStyle: color, strokeStyle: color })
        if (vk.accidental) note.addModifier(new Accidental(vk.accidental), 0)
        note.setLedgerLineStyle({ strokeStyle: STAFF })
        addCents(note, attempt)
        notes.push(note)
      }
    }

    if (notes.length > 0) {
      const voice = new Voice({ numBeats: notes.length, beatValue: 4 })
      voice.setMode(Voice.Mode.SOFT)
      voice.addTickables(notes)
      // Lay notes out compactly from the left; unused width = notes still to play.
      new Formatter().joinVoices([voice]).format([voice], Math.min(positions * 64, width - 96))
      voice.draw(ctx, stave)
    }

    // Re-tint any glyphs VexFlow drew with its default black (clef, etc.).
    for (const el of host.querySelectorAll('[fill="black"]')) el.setAttribute('fill', STAFF)
    for (const el of host.querySelectorAll('[stroke="black"]')) el.setAttribute('stroke', STAFF)
  }, [count, attempts, targets, reveal, instrument, preferFlats])

  return <div className="staff" ref={hostRef} aria-hidden="true" />
}
