'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatInterface from './chat-interface'
import { Room, Profile } from './types'

interface ChatInterfaceWrapperProps {
  userId: string
}

export default function ChatInterfaceWrapper({ userId }: ChatInterfaceWrapperProps) {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Fetch the current user's profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          return
        }

        setCurrentUser(profile)

        // Fetch all rooms the user is a part of
        const { data: roomParticipants, error: roomError } = await supabase
          .from('room_participants')
          .select('room_id')
          .eq('profile_id', userId)

        if (roomError) {
          console.error('Error fetching room participants:', roomError)
          return
        }

        if (roomParticipants.length === 0) {
          setLoading(false)
          return
        }

        const roomIds = roomParticipants.map(rp => rp.room_id)

        // Fetch room details
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .order('updated_at', { ascending: false })

        if (roomsError) {
          console.error('Error fetching rooms:', roomsError)
          return
        }

        setRooms(roomsData || [])
      } catch (error) {
        console.error('Error in data fetching:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId, supabase])

  // If still loading, show a simple loading state
  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-16 w-16 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return <ChatInterface currentUser={currentUser} initialRooms={rooms} />
}