import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { MAX_PHOTO_MB, MAX_PHOTOS } from '../../../lib/constants'
import { useToast } from '../../../components/ui'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

/**
 * photos: [{ key, id?, storage_path?, file?, previewUrl }]
 * The first photo is the cover. Drag & drop or click to add; arrows to reorder.
 */
export function PhotoUploader({ photos, onChange, onRemove, error }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const toast = useToast()

  function addFiles(fileList) {
    const files = Array.from(fileList || [])
    const room = MAX_PHOTOS - photos.length
    const ok = []
    for (const f of files) {
      if (!ACCEPT.includes(f.type)) { toast(`${f.name}: use JPG, PNG or WebP`, 'error'); continue }
      if (f.size > MAX_PHOTO_MB * 1024 * 1024) { toast(`${f.name} is larger than ${MAX_PHOTO_MB} MB`, 'error'); continue }
      ok.push({ key: crypto.randomUUID(), file: f, previewUrl: URL.createObjectURL(f) })
    }
    if (ok.length > room) toast(`You can add up to ${MAX_PHOTOS} photos`, 'error')
    if (ok.length) onChange([...photos, ...ok.slice(0, room)])
  }

  function move(i, dir) {
    const next = [...photos]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  function makeCover(i) {
    const next = [...photos]
    const [p] = next.splice(i, 1)
    onChange([p, ...next])
  }

  return (
    <div className="stack">
      <label
        className={`dropzone ${over ? 'is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files) }}
      >
        <span className="dropzone-icon"><ImagePlus /></span>
        <span><strong>Drop photos here</strong> or click to browse</span>
        <span className="xs">JPG, PNG or WebP · up to {MAX_PHOTO_MB} MB each · max {MAX_PHOTOS}</span>
        <input ref={inputRef} type="file" accept={ACCEPT.join(',')} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      </label>
      {error && <span className="field-error">{error}</span>}

      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <div key={p.key} className="photo-tile fade-in">
              <img src={p.previewUrl} alt={`Photo ${i + 1}`} />
              {i === 0 && <span className="badge badge-brand cover-badge">Cover</span>}
              <div className="photo-tile-actions">
                <div className="row" style={{ gap: 4 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left"><ChevronLeft /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move right"><ChevronRight /></button>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  {i !== 0 && <button type="button" onClick={() => makeCover(i)} aria-label="Make cover photo"><Star /></button>}
                  <button type="button" onClick={() => onRemove(i)} aria-label="Remove photo"><Trash2 /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="xs muted">Tip: show the front, back, screen on, keyboard, ports and any scratches. Clear photos get more requests.</p>
    </div>
  )
}
