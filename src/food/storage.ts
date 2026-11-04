import { supabase } from '../lib/supabase'
import type { FoodResult } from './types'

// The storage bucket name for household photos
export const PHOTO_BUCKET = 'household_photos'

// Maximum dimension for processed photos (1200px on the long edge)
const MAX_DIMENSION = 1200

// Generate a file path for a photo: household_id/food_id.jpg (or .png)
export function photoPath(householdId: string, foodId: string, fileExt: string = 'jpg'): string {
  return `${householdId}/${foodId}.${fileExt}`
}

// Shrink an image to a maximum dimension while maintaining aspect ratio
// Returns a new File with the image resized and converted to JPEG
export async function shrinkImage(file: File): Promise<File> {
  // If we're in a browser environment with canvas support
  if (typeof window === 'undefined' || !window.HTMLCanvasElement) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      // Calculate new dimensions maintaining aspect ratio
      const maxWidth = Math.max(img.width, img.height)
      const scale = maxWidth > MAX_DIMENSION ? MAX_DIMENSION / maxWidth : 1
      const newWidth = Math.round(img.width * scale)
      const newHeight = Math.round(img.height * scale)

      canvas.width = newWidth
      canvas.height = newHeight

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // Convert to JPEG and create a new File
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file)
          return
        }
        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { 
          type: 'image/jpeg',
          lastModified: Date.now()
        })
        resolve(newFile)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// Generate a signed URL for downloading a photo
// The url is valid for a short time (default 5 minutes for display)
export async function getPhotoUrl(photoUrl: string | null, expiresIn = 300): Promise<string | null> {
  if (!photoUrl) return null
  
  // If it's already a signed URL from Supabase (contains a signature), return as-is
  // Otherwise generate a new signed URL
  if (photoUrl.includes('?')) return photoUrl
  
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(photoUrl, expiresIn)
  
  if (error) {
    console.error('Failed to create signed URL:', error)
    return null
  }
  
  return data?.signedUrl ?? null
}

// Upload a photo and return the storage path
export async function uploadPhoto(
  householdId: string,
  foodId: string,
  file: File,
  options?: { shrink?: boolean },
): Promise<{ path: string; error: Error | null }> {
  // Shrink the image if requested
  const processedFile = options?.shrink ? await shrinkImage(file) : file
  
  const fileExt = processedFile.name.split('.').pop() ?? 'jpg'
  const path = photoPath(householdId, foodId, fileExt)
  
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, processedFile, {
      upsert: true,
      contentType: processedFile.type,
    })
  
  if (error) return { path: '', error }
  
  return { path, error: null }
}

// Delete a photo from storage
export async function deletePhoto(photoUrl: string | null): Promise<boolean> {
  if (!photoUrl) return true

  // If it's an external URL (Open Food Facts or similar), don't delete
  if (isHouseholdPhoto(photoUrl)) {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([photoUrl])

    return error === null
  }

  return true
}

// Check if a URL is a household photo path (stored in photo_url)
function isHouseholdPhoto(photoUrl: string): boolean {
  // photo_url is the path within the bucket like "household-uuid/food-uuid.jpg"
  // External images have URLs starting with http/https
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return false
  }
  // It's a household photo if it's a path within the bucket
  return true
}

// Update a food's photo: upload new, delete old, save new URL
export async function updateFoodPhoto(
  foodId: string,
  householdId: string,
  currentPhotoUrl: string | null,
  newFile: File,
): Promise<{ photoUrl: string; error: Error | null }> {
  // Upload the new file (with shrinking)
  const { path, error: uploadError } = await uploadPhoto(householdId, foodId, newFile, { shrink: true })
  if (uploadError) return { photoUrl: '', error: uploadError }
  
  // Delete the old file if it's a household photo and we're replacing it
  if (currentPhotoUrl) {
    // Extract path from URL if it contains the bucket
    const oldPath = extractStoragePath(currentPhotoUrl)
    if (oldPath) {
      await deletePhoto(oldPath)
    }
  }
  
  return { photoUrl: path, error: null }
}

// Extract the storage path from a signed URL for a household photo
// Returns the path within the bucket (like "household-uuid/food-uuid.jpg")
export function extractStoragePath(url: string): string | null {
  // If it's already a relative path within the bucket, return it
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url
  }

  // If it's a full URL with bucket, extract the path part after the bucket
  // Example: https://bucket.supabase.co/storage/v1/object/sign/household_photos/abc/def.jpg?....
  const urlWithoutQuery = url.split('?')[0]
  const match = urlWithoutQuery.match(/\/household_photos\/(.+)/)
  if (match) {
    return match[1]
  }

  return null
}

// Check if a photo URL is from Open Food Facts (external, not stored locally)
export function isOfflinePhoto(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false
  return imageUrl.startsWith('https://images.openfoodfacts.org/')
}

// Get the display URL for a food, prioritizing household photo over OFF/USDA image
export function getDisplayPhotoUrl(food: FoodResult): string | null | undefined {
  // If the food has a household photo URL, it should be used
  // Otherwise fall back to the Open Food Facts image URL
  // Note: The actual signed URL resolution happens via getPhotoUrl()
  return food.photoUrl ?? food.imageUrl
}