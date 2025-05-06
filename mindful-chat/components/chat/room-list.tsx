'use client'

import { cn } from '@/lib/utils'
import { type Room } from './types'
import { Lock, MessageSquare, Clock, Heart, Stethoscope, MoreVertical, UserPlus, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RoomListProps {
  rooms: Room[]
  pendingRooms?: Room[]
  selectedRoom: Room | null
  onSelectRoom: (room: Room) => void
  onApproveRequest?: (roomId: string) => void
  onDeclineRequest?: (roomId: string) => void
  onInviteUsers?: (room: Room) => void
  currentUserId: string
  currentUserRole?: 'professional' | 'patient'
}

export function RoomList({
  rooms,
  pendingRooms = [],
  selectedRoom,
  onSelectRoom,
  onApproveRequest,
  onDeclineRequest,
  onInviteUsers,
  currentUserId,
  currentUserRole = 'patient'
}: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No rooms yet</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Pending room requests section */}
      {pendingRooms && pendingRooms.length > 0 && (
        <div id="pending-requests-section" className="mb-2">
          <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
            Pending Requests
          </div>
          {pendingRooms.map((room) => (
            <div
              key={room.id}
              className="px-4 py-3 border-b border-border bg-muted/20 last:border-b-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{room.name}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Request
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => onApproveRequest && onApproveRequest(room.id)}
                >
                  Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="flex-1" 
                  onClick={() => onDeclineRequest && onDeclineRequest(room.id)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Regular rooms section */}
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
                {room.is_private ? (
                  <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                ) : (
                  <Globe className="h-3 w-3 ml-1 text-muted-foreground" />
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
            
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              {/* Type indicator */}
              <div className="flex items-center">
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
              </div>
              
              {/* Room actions dropdown menu for groups */}
              {room.room_type === 'group' && room.created_by === currentUserId && onInviteUsers && (
                <div onClick={(e) => e.stopPropagation()} className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onInviteUsers(room)}>
                        <UserPlus className="h-3.5 w-3.5 mr-2" />
                        Invite Users
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
