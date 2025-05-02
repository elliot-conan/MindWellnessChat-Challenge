'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Room, Profile } from './types'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'
import { useMessageStatus } from '@/hooks/use-message-status'
import { RealtimeChat } from '@/components/realtime-chat'
import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'
import { Users } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ChatRoomProps {
  room: Room
  currentUser: Profile
}

interface Message {
  id: string
  content: string
  profile_id: string
  created_at: string
  delivered_at: string | null
  read_at: string | null
  recipient_id: string | null
  profiles: {
    username: string | null
    avatar_url: string | null
  }
}

export function ChatRoom({ room, currentUser }: ChatRoomProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [databaseMessages, setDatabaseMessages] = useState<any[]>([])
  const roomVisibleRef = useRef(false)
  
  // Use the message status hook to update message statuses
  const { markAsDelivered, markAsRead, markAllAsRead } = useMessageStatus()

  // Set up a Supabase realtime channel for broadcasting messages
  const [broadcastChannel, setBroadcastChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  
  // Initialize the broadcast channel
  useEffect(() => {
    const channel = supabase.channel(`room-messages:${room.id}`)
    
    channel
      .on('broadcast', { event: 'new_message' }, (payload) => {
        // Add the message to our local state if it's not from the current user
        const message = payload.payload as any
        if (message.profile_id !== currentUser.id) {
          setDatabaseMessages(prev => {
            // Don't add duplicates
            if (prev.some(m => m.id === message.id)) return prev
            return [...prev, message]
          })
          // log
          logger.debug('Received new message:', message)
          
          // Mark as delivered when received
          markAsDelivered(message.id)
        }
      })
      .subscribe()
    
    setBroadcastChannel(channel)
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id, currentUser.id, supabase, markAsDelivered])
  
  // Use the existing realtime chat hook for status updates and sending messages
  const { 
    markAsDelivered: markRealtimeAsDelivered,
    markAsRead: markRealtimeAsRead,
    sendMessage
  } = useRealtimeChat({
    roomName: `room:${room.id}`,
    username: currentUser.username || currentUser.id,
    firstName: currentUser.first_name || undefined,
    lastName: currentUser.last_name || undefined
  })

  // Fetch historical messages from the database
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          profile_id,
          created_at,
          delivered_at,
          read_at,
          recipient_id,
          profiles (
            username,
            avatar_url,
            first_name,
            last_name
          )
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (!error && data) {
        // Transform data to match ChatMessage format
        const formattedMessages = data.map((message: any) => ({
          id: message.id,
          content: message.content,
          user: {
            name: message.profiles.username || 'Unknown user',
            first_name: message.profiles.first_name,
            last_name: message.profiles.last_name,
            avatar_url: message.profiles.avatar_url
          },
          createdAt: message.created_at,
          delivered_at: message.delivered_at,
          read_at: message.read_at,
          profile_id: message.profile_id,
          recipient_id: message.recipient_id,
          avatar_url: message.profiles.avatar_url // Add it to the top level too for our UI
        }))
        setDatabaseMessages(formattedMessages)
        
        // Mark messages from other users as delivered when loaded
        const messagesToMarkAsDelivered = data.filter(msg => 
          msg.profile_id !== currentUser.id && // Not sent by current user
          !msg.delivered_at // Not already marked as delivered
        )
        
        // Mark all messages from other users as delivered
        for (const msg of messagesToMarkAsDelivered) {
          await markAsDelivered(msg.id)
          await markRealtimeAsDelivered(msg.id)
        }
      }
      setLoading(false)
    }

    if (room) {
      fetchMessages()
    }
  }, [room.id, supabase, currentUser.id, markAsDelivered, markRealtimeAsDelivered])

  // Save messages to the database when a new message is sent
  const handleNewMessage = async (content: string) => {
    try {
      logger.debug('Sending new message in room:', room.id)
      
      // Save to database using useRealtimeChat hook's sendMessage function
      // This ensures consistent message handling and proper notification triggering
      if (sendMessage) {
        await sendMessage(content, undefined, currentUser.id, room.id)
        logger.debug('Message sent via realtime hook with room ID for notifications')
      } else {
        logger.error('sendMessage function not available')
      }
    } catch (error) {
      logger.error('Error in handleNewMessage:', error)
    }
  }

  // Create a reference to force re-fetching messages when status updates occur
  const [statusUpdateTrigger, setStatusUpdateTrigger] = useState(0)
  
  // Set up a timer to periodically refresh message statuses
  useEffect(() => {
    // Check for status updates every 5 seconds
    const intervalId = setInterval(() => {
      // Trigger a refresh by incrementing the counter
      setStatusUpdateTrigger(prev => prev + 1);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Re-fetch message statuses when needed
  useEffect(() => {
    const refreshMessageStatuses = async () => {
      if (!room || databaseMessages.length === 0) return;
      
      try {
        // Get the latest status for all messages in the current room
        const { data, error } = await supabase
          .from('messages')
          .select('id, delivered_at, read_at')
          .eq('room_id', room.id);
          
        if (error) {
          logger.error('Error fetching message statuses:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // Create a lookup map of statuses by message ID
          const statusMap = new Map(data.map(msg => [msg.id, msg]));
          
          // Update the status of all messages in our state
          setDatabaseMessages(prevMessages => 
            prevMessages.map(msg => {
              const updatedStatus = statusMap.get(msg.id);
              if (updatedStatus) {
                return {
                  ...msg,
                  delivered_at: updatedStatus.delivered_at || msg.delivered_at,
                  read_at: updatedStatus.read_at || msg.read_at
                };
              }
              return msg;
            })
          );
        }
      } catch (err) {
        logger.error('Error refreshing message statuses:', err);
      }
    };
    
    refreshMessageStatuses();
  }, [room, statusUpdateTrigger, supabase]);
  
  // Combine messages from database with any broadcasted ones
  const allMessages = databaseMessages
  
  // Mark messages as read when the room becomes visible
  useEffect(() => {
    roomVisibleRef.current = true
    
    // Mark all unread messages as read when room is viewed
    const markUnreadMessagesAsRead = async () => {
      try {
        logger.debug('Checking for unread messages to mark as read')
        
        // Find messages that are not yet read from other users
        const messagesToMarkAsRead = allMessages.filter(msg => 
          msg.profile_id !== currentUser.id && // Not sent by current user
          !msg.read_at // Not already marked as read
        )
        
        if (messagesToMarkAsRead.length > 0) {
          logger.debug(`Found ${messagesToMarkAsRead.length} messages to mark as read`)
          
          // Option 1: Mark them one by one (this ensures real-time status updates in UI)
          for (const msg of messagesToMarkAsRead) {
            await markAsRead(msg.id)
            await markRealtimeAsRead(msg.id)
          }
          
          /* Option 2: Or mark all at once using our new database function
          await markAllAsRead(room.id, currentUser.id)
          */
          
          logger.debug('Successfully marked messages as read')
        }
      } catch (error) {
        logger.error('Error marking messages as read:', error)
      }
    }
    
    // If the component is mounted and messages are loaded, mark them as read
    if (allMessages.length > 0 && !loading) {
      // Use a small delay to ensure messages are actually visible on screen
      const timer = setTimeout(() => {
        markUnreadMessagesAsRead()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
    
    return () => {
      roomVisibleRef.current = false
    }
  }, [allMessages, currentUser.id, loading, markAsRead, markRealtimeAsRead, supabase])
  
  return (
    <>
      {/* Room header - Hidden on mobile as we show it in the main chat interface */}
      <div className="hidden md:flex border-b border-border p-4 items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{room.name}</h2>
          {room.description && (
            <p className="text-sm text-muted-foreground">{room.description}</p>
          )}
        </div>
        <div className="flex items-center">
          <div className="flex items-center mr-2">
            <Users className="h-4 w-4 mr-1 text-muted-foreground" />
            <RealtimeAvatarStack roomName={`presence:${room.id}`} />
          </div>
        </div>
      </div>

      {/* Chat messages - Takes full height on mobile */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <RealtimeChat
            roomName={`room:${room.id}`}
            username={currentUser.username || currentUser.id}
            userId={currentUser.id}
            messages={allMessages}
            onMessage={(messages) => {/* Unused callback */}}
            onSendMessage={handleNewMessage}
            isGroupChat={room.room_type === 'group'}
          />
        )}
      </div>
    </>
  )
}
