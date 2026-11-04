import { supabase } from '../lib/supabase'

// The household's own photos live in a private Storage bucket, one folder per household:
// <household id>/<random id>.jpg. foods.photo_url and meal_prep.photo_url hold that path (never a URL);
// the app shows a photo through a signed link that lasts an hour (see usePhotoUrl).
export const PHOTO_BUCKET = 'household_photos'
export const SIGNED_URL_SECONDS = 60 * 60

const MAX_SIDE = 1200
const JPEG_QUALITY = 0.85

// A new, unique path in the household's folder. Unique per upload, so a changed photo never shows a cached old one.
export function newPhotoPath(householdId: string, id: string = crypto.randomUUID()): string {
  return `${householdId}/${id}.jpg`
}

// True for a path in the photo bucket ("<household>/<id>.jpg"), false for a web address
// (an Open Food Facts photo) or anything else.
export function isPhotoPath(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.jpg$/i.test(value)
}

// The size to draw a photo at: the long side at most MAX_SIDE, keeping its shape. Never scales up.
export function shrunkSize(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const long = Math.max(width, height)
  if (long <= maxSide) return { width, height }
  const scale = maxSide / long
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// Shrink a photo from the camera or library to a JPEG of about 1200 px on the long side.
// Browsers apply the photo's rotation (EXIF) when drawing it, so portrait phone photos stay upright.
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("That photo couldn't be opened. Try a JPEG or PNG."))
      el.src = url
    })
    const { width, height } = shrunkSize(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("That photo couldn't be prepared.")
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("That photo couldn't be prepared.")), 'image/jpeg', JPEG_QUALITY)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Shrink and upload a photo to the household's folder. Returns its path.
export async function uploadPhoto(householdId: string, file: Blob): Promise<string> {
  const jpeg = await shrinkPhoto(file)
  const path = newPhotoPath(householdId)
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`The photo didn't upload: ${error.message}`)
  return path
}

export async function signedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'No photo link')
  return data.signedUrl
}

// Delete a replaced or removed photo, unless a food or prep session still uses it
// (Repeat last week copies a session's recipe photo). Failures are ignored: the photo is already unlinked.
export async function deletePhotoIfUnused(path: string | null | undefined): Promise<void> {
  if (!isPhotoPath(path)) return
  try {
    const [foods, preps] = await Promise.all([
      supabase.from('foods').select('id', { count: 'exact', head: true }).eq('photo_url', path),
      supabase.from('meal_prep').select('id', { count: 'exact', head: true }).eq('photo_url', path),
    ])
    if (foods.error || preps.error) return
    if ((foods.count ?? 0) + (preps.count ?? 0) > 0) return
    await supabase.storage.from(PHOTO_BUCKET).remove([path])
  } catch {
    // Leave the file; it is unlinked either way.
  }
}

// Set or clear the photo of a saved food (from Today's edit sheet), then delete the old file.
export async function setFoodPhoto(foodId: string, path: string | null, oldPath: string | null | undefined): Promise<void> {
  const { data, error } = await supabase.from('foods').update({ photo_url: path }).eq('id', foodId).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error("That food's photo couldn't be changed.")
  if (oldPath && oldPath !== path) await deletePhotoIfUnused(oldPath)
}
