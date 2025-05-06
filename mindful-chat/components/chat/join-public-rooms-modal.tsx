'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Room, Profile } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Users, LogIn } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface JoinPublicRoomsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  userRoomIds: string[]
  onRoomJoined: (room: Room) => void
}

export function JoinPublicRoomsModal({
  isOpen,
  onClose,
  currentUserId,
  userRoomIds,
  onRoomJoined,
}: JoinPublicRoomsModalProps) {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publicRooms, setPublicRooms] = useState<Room[]>([])

  // Fetch public rooms
  useEffect(() => {
    if (!isOpen) return

    const fetchPublicRooms = async () => {
      setLoading(true)
      try {
        // Fetch public group therapy rooms
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('is_private', false)
          .eq('room_type', 'group')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        // Filter out rooms the user is already in
        const filteredRooms = data.filter(room => !userRoomIds.includes(room.id))
        
        setPublicRooms(filteredRooms)
      } catch (err) {
        console.error('Error fetching public rooms:', err)
        setError('Failed to load public rooms')
      } finally {
        setLoading(false)
      }
    }

    fetchPublicRooms()
  }, [isOpen, supabase, userRoomIds])

  // Filter rooms based on search query
  const filteredRooms = searchQuery
    ? publicRooms.filter(room => 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : publicRooms

  const handleJoinRoom = async (room: Room) => {
    setJoining(room.id)
    try {
      // Check if user is already in the room
      const { data: existingParticipation, error: checkError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('profile_id', currentUserId)
        .single()
      
      if (!checkError && existingParticipation) {
        toast.info("You're already a member of this room")
        onRoomJoined(room)
        handleClose()
        return
      }
      
      // Add user as a participant
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          profile_id: currentUserId
        })
      
      if (joinError) throw joinError
      
      toast.success(`Successfully joined ${room.name}`)
      onRoomJoined(room)
      handleClose()
    } catch (err: any) {
      console.error('Error joining room:', err)
      toast.error(`Failed to join: ${err.message}`)
    } finally {
      setJoining(null)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Join Group Therapy</DialogTitle>
          <p className="text-sm text-muted-foreground pt-2">
            Browse public group therapy sessions and support groups you can join
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search group therapy sessions"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-muted rounded mb-2"></div>
                <div className="h-3 w-32 bg-muted rounded"></div>
              </div>
            </div>
          ) : filteredRooms.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredRooms.map((room) => (
                  <Card key={room.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{room.name}</CardTitle>
                        <Badge variant="secondary" className="ml-2">
                          <Users className="h-3 w-3 mr-1" />
                          Group
                        </Badge>
                      </div>
                      {room.description && (
                        <CardDescription className="line-clamp-2">
                          {room.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="pt-2 pb-3">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="ml-auto"
                        disabled={joining === room.id}
                        onClick={() => handleJoinRoom(room)}
                      >
                        {joining === room.id ? (
                          "Joining..."
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-1" />
                            Join Group
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? (
                <p>No matching group therapy sessions found</p>
              ) : (
                <p>No public group therapy sessions available</p>
              )}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
