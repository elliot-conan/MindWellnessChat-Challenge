'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Room } from './types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Lock, Users } from 'lucide-react'

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  onRoomJoined: (room: Room) => void
  userRoomIds: string[]
}

export function JoinRoomModal({
  isOpen,
  onClose,
  currentUserId,
  onRoomJoined,
  userRoomIds
}: JoinRoomModalProps) {
  const supabase = createClient()
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null)

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch public rooms or rooms created by the current user
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .or(`is_private.eq.false,created_by.eq.${currentUserId}`)
          
        if (error) throw error

        // Filter out rooms the user is already a member of
        const filteredRooms = data.filter(room => !userRoomIds.includes(room.id))
        setAvailableRooms(filteredRooms)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch available rooms')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchAvailableRooms()
    }
  }, [isOpen, currentUserId, supabase, userRoomIds])

  const handleJoinRoom = async (room: Room) => {
    setJoiningRoom(room.id)
    setError(null)

    try {
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          profile_id: currentUserId,
        })

      if (error) throw error

      onRoomJoined(room)
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to join room')
      setJoiningRoom(null)
    }
  }

  const handleClose = () => {
    setError(null)
    setJoiningRoom(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Chat Room</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="text-center py-8">Loading available rooms...</div>
          ) : availableRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No available rooms to join
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableRooms.map((room) => (
                <div 
                  key={room.id}
                  className="p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">{room.name}</h3>
                        {room.is_private && (
                          <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                        )}
                      </div>
                      {room.description && (
                        <p className="text-sm text-muted-foreground">{room.description}</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinRoom(room)}
                      disabled={joiningRoom === room.id}
                    >
                      {joiningRoom === room.id ? 'Joining...' : 'Join'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500 mt-4">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
