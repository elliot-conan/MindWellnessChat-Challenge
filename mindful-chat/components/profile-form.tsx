'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  profile: {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState(profile.username || '')
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    } else if (username) {
      return username.substring(0, 2).toUpperCase()
    } else {
      return 'U'
    }
  }

  // Make sure this event handler directly triggers the file input
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent other handlers from firing
    e.stopPropagation() // Prevent event bubbling
    
    // Explicitly trigger the file input click
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setAvatarFile(files[0])
      // Preview the image locally
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(files[0])
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return null
    
    setUploadingAvatar(true)
    try {
      // Generate a unique file name for the avatar
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`
      
      // Determine content type based on extension
      let contentType = 'image/jpeg' // Default
      if (fileExt) {
        switch (fileExt.toLowerCase()) {
          case 'png':
            contentType = 'image/png'
            break
          case 'gif':
            contentType = 'image/gif'
            break
          case 'webp':
            contentType = 'image/webp'
            break
          case 'svg':
            contentType = 'image/svg+xml'
            break
        }
      }
      
      // Upload to supabase storage with appropriate options
      const { data, error: uploadError } = await supabase.storage
        .from('profile-images') // Match the exact bucket name in Supabase
        .upload(filePath, avatarFile, {
          upsert: true, // Allow overwriting existing files
          contentType: contentType // Specify content type
        })
      
      if (uploadError) {
        throw uploadError
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)
      
      toast.success('Avatar uploaded successfully')
      return urlData.publicUrl
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      
      // More specific error messages
      if (error?.statusCode === 403) {
        toast.error('Permission denied: You don\'t have access to upload images')
      } else if (error?.statusCode === 400) {
        toast.error('Upload failed: The file may be too large or in an unsupported format')
      } else {
        toast.error(`Failed to upload avatar: ${error?.message || 'Unknown error'}`)
      }
      
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Upload avatar if a new file was selected
      let finalAvatarUrl = profile.avatar_url
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl
        }
      }
      
      // Update profile in the database
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          first_name: firstName,
          last_name: lastName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      
      if (error) throw error
      
      toast.success('Profile updated successfully')
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center justify-center mb-6">
        {/* Wrap everything in a label to make the entire area clickable */}
        <label htmlFor="avatar-upload" className="cursor-pointer">
          <div className="relative group">
            <Avatar className="h-24 w-24 hover:opacity-80 transition-opacity">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                Change
              </span>
            </div>
          </div>
        </label>
        {/* Hidden file input with an ID that matches the label's htmlFor */}
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-sm text-muted-foreground mt-2">
          Click to upload a profile picture
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={isLoading || uploadingAvatar}
      >
        {(isLoading || uploadingAvatar) && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
