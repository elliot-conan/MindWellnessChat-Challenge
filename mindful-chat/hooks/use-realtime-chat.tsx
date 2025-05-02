'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface UseRealtimeChatProps {
  roomName: string
  username: string
  firstName?: string
  lastName?: string
}

export interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
  createdAt: string
  delivered_at?: string
  read_at?: string
  profile_id?: string
  recipient_id?: string
  avatar_url?: string // Added at top level for easier access in UI components
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({ roomName, username, firstName, lastName }: UseRealtimeChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // Function to update message status (delivered or read)
  const updateMessageStatus = useCallback(
    async (messageId: string, statusType: 'delivered' | 'read') => {
      if (!channel || !isConnected) return
      
      const timestamp = new Date().toISOString()
      
      // First, update our local state
      setMessages((current) => 
        current.map(msg => 
          msg.id === messageId 
            ? { ...msg, [statusType === 'delivered' ? 'delivered_at' : 'read_at']: timestamp } 
            : msg
        )
      )
      
      // Then broadcast the status change to other clients
      await channel.send({
        type: 'broadcast',
        event: `${statusType}_status`,
        payload: {
          messageId,
          timestamp
        }
      })
      
      // Also update the status in the database
      try {
        // Call the appropriate database function
        const { error } = await supabase.rpc(
          statusType === 'delivered' ? 'mark_message_as_delivered' : 'mark_message_as_read',
          { message_id: messageId }
        )
        
        if (error) {
          logger.error(`Error updating message ${statusType} in database:`, error)
        } else {
          logger.debug(`Successfully updated message ${statusType} in database:`, messageId)
        }
      } catch (error) {
        logger.error(`Error in database update for ${statusType}:`, error)
      }
      
      return timestamp
    },
    [channel, isConnected, supabase]
  )

  // Mark message as delivered
  const markAsDelivered = useCallback(
    async (messageId: string) => {
      return updateMessageStatus(messageId, 'delivered')
    },
    [updateMessageStatus]
  )

  // Mark message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      return updateMessageStatus(messageId, 'read')
    },
    [updateMessageStatus]
  )
  
  // Store functions in refs so they can be accessed from useEffect
  const markAsDeliveredRef = useRef(markAsDelivered)
  markAsDeliveredRef.current = markAsDelivered

  useEffect(() => {
    const newChannel = supabase.channel(roomName)

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        setMessages((current) => [...current, payload.payload as ChatMessage])
        
        // If this message is from someone else, mark it as delivered immediately
        const message = payload.payload as ChatMessage
        if (message.user.name !== username) {
          setTimeout(() => {
            markAsDeliveredRef.current(message.id)
          }, 500) // Small delay to ensure message is properly received
        }
      })
      .on('broadcast', { event: 'delivered_status' }, (payload) => {
        const { messageId, timestamp } = payload.payload
        logger.debug('Received delivered status update for message:', messageId, timestamp)
        
        // Force a state update with immutable pattern to trigger re-renders
        setMessages((current) => {
          const newMessages = [...current]
          const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
          
          if (messageIndex >= 0) {
            // Create a new message object with updated status
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              delivered_at: timestamp
            }
            logger.debug(`Updated delivered status for message ${messageId} in state`)
          } else {
            logger.debug(`Message ${messageId} not found in state for delivered update`)
          }
          
          return newMessages
        })
      })
      .on('broadcast', { event: 'read_status' }, (payload) => {
        const { messageId, timestamp } = payload.payload
        logger.debug('Received read status update for message:', messageId, timestamp)
        
        // Force a state update with immutable pattern to trigger re-renders
        setMessages((current) => {
          const newMessages = [...current]
          const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
          
          if (messageIndex >= 0) {
            // Create a new message object with updated status
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              read_at: timestamp
            }
            logger.debug(`Updated read status for message ${messageId} in state`)
          } else {
            logger.debug(`Message ${messageId} not found in state for read update`)
          }
          
          return newMessages
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [roomName, username, supabase])

  const sendMessage = useCallback(
    async (content: string, recipientId?: string, profileId?: string, roomId?: string) => {
      if (!channel || !isConnected) return

      const messageId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const message: ChatMessage = {
        id: messageId,
        content,
        user: {
          name: username,
          first_name: firstName,
          last_name: lastName
        },
        createdAt: timestamp,
        profile_id: profileId,
        recipient_id: recipientId
      }

      // Update local state immediately for the sender
      setMessages((current) => [...current, message])

      // Send message over realtime channel
      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })
      
      // Also save message to database to trigger notifications
      if (roomId && profileId) {
        try {
          const { error } = await supabase
            .from('messages')
            .insert({
              id: messageId,
              room_id: roomId,
              profile_id: profileId,
              content: content,
              created_at: timestamp
            });
            
          if (error) {
            logger.error('Error saving message to database:', error);
          } else {
            logger.debug('Message saved to database, will trigger notification');
          }
        } catch (err) {
          logger.error('Error in database operation:', err);
        }
      }
    },
    [channel, isConnected, username, firstName, lastName, supabase]
  )

  return { messages, sendMessage, isConnected, markAsDelivered, markAsRead }
}
