'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Room, Profile } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, UserPlus, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface InviteToRoomModalProps {
  isOpen: boolean
  onClose: () => void
  room: Room
  currentUserId: string
}

export function InviteToRoomModal({
  isOpen,
  onClose,
  room,
  currentUserId,
}: InviteToRoomModalProps) {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [currentParticipants, setCurrentParticipants] = useState<string[]>([])
  const [invitedUsers, setInvitedUsers] = useState<string[]>([])

  // Fetch current participants
  useEffect(() => {
    if (!isOpen || !room) return

    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('room_participants')
          .select('profile_id')
          .eq('room_id', room.id)
        
        if (error) throw error
        
        setCurrentParticipants(data.map(p => p.profile_id))
      } catch (err) {
        console.error('Error fetching room participants:', err)
      }
    }

    fetchParticipants()
  }, [room, supabase, isOpen])

  // Search for users when query changes
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setUsers([])
      return
    }

    const searchUsers = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(10)
        
        if (error) throw error
        
        // Filter out current participants
        const filteredUsers = data.filter(user => 
          !currentParticipants.includes(user.id) && 
          user.id !== currentUserId
        )
        
        setUsers(filteredUsers)
      } catch (err) {
        console.error('Error searching users:', err)
      } finally {
        setLoading(false)
      }
    }

    searchUsers()
  }, [searchQuery, currentParticipants, currentUserId, supabase])

  const handleInvite = async (userId: string) => {
    try {
      // Get user data for notification
      const { data: userData } = await supabase
        .from('profiles')
        .select('username, first_name, last_name')
        .eq('id', userId)
        .single()
      
      // Create notification for the invited user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          profile_id: userId,
          type: 'room_invitation',
          content: `You've been invited to join "${room.name}"`,
          metadata: {
            room_id: room.id,
            room_name: room.name,
            invited_by: currentUserId
          },
          is_read: false
        })
      
      if (notifError) throw notifError
      
      // Add user to invited list to update UI
      setInvitedUsers(prev => [...prev, userId])
      
      toast.success(`Invitation sent to ${userData?.first_name || userData?.username || 'user'}`)
    } catch (err: any) {
      toast.error(`Failed to send invitation: ${err.message}`)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setUsers([])
    setError(null)
    setInvitedUsers([])
    onClose()
  }
  
  // Helper function to get user initials
  const getUserInitials = (profile: Profile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    } else if (profile.username) {
      return profile.username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {room.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or username"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {searchQuery && (
            <div className="border rounded-md overflow-hidden">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : users.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                  {users.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 hover:bg-muted border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username || 'Unknown user'}
                          </div>
                          {user.role && (
                            <Badge variant="outline" className="text-xs">
                              {user.role === 'professional' ? 'Health Professional' : 'Patient'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {invitedUsers.includes(user.id) ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Check className="h-4 w-4 mr-1" />
                          Invited
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleInvite(user.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
