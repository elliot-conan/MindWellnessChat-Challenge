'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRealtimePresenceRoom } from '@/hooks/use-realtime-presence-room'
import { useMemo } from 'react'

interface ActiveUsersListProps {
  roomName: string
}

export function ActiveUsersList({ roomName }: ActiveUsersListProps) {
  const { users: usersMap } = useRealtimePresenceRoom(roomName)
  
  const users = useMemo(() => {
    return Object.values(usersMap).map((user) => ({
      name: user.name,
      image: user.image,
    }))
  }, [usersMap])

  if (users.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No active users
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {users.map((user, index) => (
        <div key={index} className="flex items-center gap-2 py-1">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image} alt={user.name} />
            <AvatarFallback>
              {user.name?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm font-medium">{user.name}</div>
        </div>
      ))}
    </div>
  )
}
