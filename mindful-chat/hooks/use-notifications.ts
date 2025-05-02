'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export interface Notification {
  id: string
  type: 'message_request' | 'message' | 'system'
  content: string
  is_read: boolean
  created_at: string
  metadata: {
    room_id?: string
    patient_id?: string
    room_name?: string
    [key: string]: any
  }
}

// Request notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Show web notification - only when tab is not focused
const showWebNotification = async (title: string, options: NotificationOptions = {}) => {
  // Check if the tab is focused
  const isTabFocused = typeof document !== 'undefined' && document.hasFocus();
  
  // Only show desktop notification if tab is not focused
  if (!isTabFocused) {
    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission) {
      try {
        const notification = new Notification(title, {
          icon: '/logo.png',
          badge: '/logo.png',
          ...options
        });
        
        // Handle notification click - focus the window
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        // Auto close after 8 seconds
        setTimeout(() => notification.close(), 8000);
        
        return notification;
      } catch (error) {
        logger.error('Error showing notification:', error);
      }
    }
  }
  
  return null;
};

export function useNotifications() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [notificationsPermission, setNotificationsPermission] = useState<boolean>(false)

  // Check notification permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const hasPermission = await requestNotificationPermission();
      setNotificationsPermission(hasPermission);
    };
    
    if (typeof window !== 'undefined') {
      checkPermission();
    }
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (error) throw error
        
        setNotifications(data || [])
        
        // Count unread notifications
        const unread = (data || []).filter(n => !n.is_read).length
        setUnreadCount(unread)
      } catch (error) {
        logger.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // If it's an insert event, show a web notification
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            
            // Only show notifications for unread notifications
            if (!newNotification.is_read) {
              // Show web notification
              showWebNotification(
                newNotification.type === 'message_request' ? 'New Message Request' : 'New Notification', 
                { body: newNotification.content }
              );
            }
          }
          
          // Refetch all notifications when there are changes
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
      
      if (error) throw error
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      logger.error('Error marking notification as read:', error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)
      
      if (error) throw error
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      
      // Reset unread count
      setUnreadCount(0)
    } catch (error) {
      logger.error('Error marking all notifications as read:', error)
    }
  }

  const requestPermission = useCallback(async () => {
    const hasPermission = await requestNotificationPermission();
    setNotificationsPermission(hasPermission);
    return hasPermission;
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    notificationsPermission,
    requestPermission
  }
}
