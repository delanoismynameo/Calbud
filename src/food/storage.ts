import { supabase } from '../lib/supabase'
import type { FoodResult } from './types'

// The storage bucket name for household photos
export const PHOTO_BUCKET = 'household_photos'

// Generate a file path for a photo: household_id/food_id.jpg (or .png)
export function photoPath(householdId: string, foodId: string, fileExt: string = 'jpg'): string {
  return `${householdId}/${foodId}.${fileExt}`
}

// Generate a signed URL for downloading a photo
// The url is valid for a short time (default 60 seconds)
export async function getPhotoUrl(photoUrl: string | null, expiresIn = 60): Promise<string | null> {
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
): Promise<{ path: string; error: Error | null }> {
  const fileExt = file.name.split('.').pop() ?? 'jpg'
  const path = photoPath(householdId, foodId, fileExt)
  
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
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
  // Upload the new file
  const { path, error: uploadError } = await uploadPhoto(householdId, foodId, newFile)
  if (uploadError) return { photoUrl: '', error: uploadError }
  
  // Delete the old file if it's a household photo
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