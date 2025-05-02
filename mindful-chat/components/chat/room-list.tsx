'use client'

import { cn } from '@/lib/utils'
import { type Room } from './types'
import { Lock, MessageSquare, Clock, Heart, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface RoomListProps {
  rooms: Room[]
  selectedRoom: Room | null
  onSelectRoom: (room: Room) => void
  currentUserRole?: 'professional' | 'patient'
}

export function RoomList({ rooms, selectedRoom, onSelectRoom, currentUserRole = 'patient' }: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No rooms yet</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => onSelectRoom(room)}
          className={cn(
            'w-full flex items-center p-4 text-left hover:bg-muted/50 transition-colors',
            selectedRoom?.id === room.id && 'bg-muted'
          )}
        >
          <div className="flex-1 truncate">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="font-medium truncate">{room.name}</span>
                {room.is_private && (
                  <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                )}
              </div>
              
              {/* Message request indicator for professionals */}
              {currentUserRole === 'professional' && room.room_type === '1:1' && room.status === 'pending' && (
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Request
                </Badge>
              )}
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {/* Type indicator */}
              {room.room_type === '1:1' ? (
                <div className="flex items-center mr-2">
                  {currentUserRole === 'professional' ? (
                    <>
                      <Heart className="h-3 w-3 mr-1" />
                      <span>Patient</span>
                    </>
                  ) : (
                    <>
                      <Stethoscope className="h-3 w-3 mr-1" />
                      <span>Mental Health Professional</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center mr-2">
                  <span>Group</span>
                </div>
              )}
              
              {/* Pending status for patients */}
              {currentUserRole === 'patient' && room.status === 'pending' && (
                <div className="flex items-center text-amber-500 ml-auto">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Pending</span>
                </div>
              )}
              
              {/* Description if available */}
              {room.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {room.description}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
