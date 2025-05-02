'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback } from 'react'
import { logger } from '@/lib/logger'

export function useMessageStatus() {
  const supabase = createClient()

  /**
   * Mark a message as delivered using the database function
   * This function checks if the user is in the same room as the message
   */
  const markAsDelivered = useCallback(
    async (messageId: string) => {
      try {
        logger.debug('Marking message as delivered:', messageId)
        
        // Call the database function to mark as delivered
        const { data, error } = await supabase
          .rpc('mark_message_as_delivered', { message_id: messageId })
        
        if (error) {
          logger.error('Error marking message as delivered:', error)
          return null
        }
        
        logger.debug('Message marked as delivered:', messageId)
        return data // Returns the timestamp
      } catch (error) {
        logger.error('Error in markAsDelivered:', error)
        return null
      }
    },
    [supabase]
  )

  /**
   * Mark a message as read using the database function
   * This function checks if the user is in the same room as the message
   */
  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        logger.debug('Marking message as read:', messageId)
        
        // Call the database function to mark as read
        const { data, error } = await supabase
          .rpc('mark_message_as_read', { message_id: messageId })
        
        if (error) {
          logger.error('Error marking message as read:', error)
          return null
        }
        
        logger.debug('Message marked as read:', messageId)
        return data // Returns the timestamp
      } catch (error) {
        logger.error('Error in markAsRead:', error)
        return null
      }
    },
    [supabase]
  )

  /**
   * Mark all unread messages in a room as read
   * Uses a database function that handles permissions
   */
  const markAllAsRead = useCallback(
    async (roomId: string, userId: string) => {
      try {
        logger.debug('Marking all messages as read in room:', roomId)
        
        // Call the database function to mark all messages as read
        const { data, error } = await supabase
          .rpc('mark_all_messages_as_read', { p_room_id: roomId })
        
        if (error) {
          logger.error('Error marking all messages as read:', error)
          return null
        }
        
        logger.debug('All messages marked as read in room:', roomId)
        return data // Returns the timestamp
      } catch (error) {
        logger.error('Error in markAllAsRead:', error)
        return null
      }
    },
    [supabase]
  )

  return {
    markAsDelivered,
    markAsRead,
    markAllAsRead
  }
}
