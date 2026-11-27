import { supabase } from './supabase'

export function publicUrl(bucket, path) {
  if (!path) return null
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function safeName(file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${crypto.randomUUID()}.${ext}`
}

/** Upload a file under `folder/` and return its storage path. */
export async function uploadFile(bucket, folder, file) {
  const path = `${folder}/${safeName(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  return path
}

export async function removeFiles(bucket, paths) {
  const list = paths.filter(Boolean)
  if (!list.length) return
  await supabase.storage.from(bucket).remove(list)
}

/** Signed URL for private buckets (verification docs, wipe certificates). */
export async function signedUrl(bucket, path, seconds = 300) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
  if (error) throw error
  return data.signedUrl
}

/** Read width/height of an image file (best effort). */
export function imageSize(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src) }
    img.onerror = () => resolve({ width: null, height: null })
    img.src = URL.createObjectURL(file)
  })
}
