'use client'

import { useEffect, useState } from 'react'
import { Bell, Settings } from 'lucide-react'
import { useNotifications, type Notification } from '@/hooks/use-notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

export function NotificationsBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, notificationsPermission, requestPermission } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  

  
  // Check if the browser supports notifications but permission is not granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 
        Notification.permission !== 'granted' && 
        Notification.permission !== 'denied') {
      setShowPermissionPrompt(true);
    }
  }, [notificationsPermission]);

  // Handle clicking on a notification
  const handleNotificationClick = async (notification: Notification) => {
    // Mark the notification as read
    await markAsRead(notification.id)
    
    // Handle different notification types
    if (notification.type === 'message_request' && notification.metadata?.room_id) {
      // Navigate to the room
      router.push(`/chat?room=${notification.metadata.room_id}`)
    }
    
    // Close the popover
    setIsOpen(false)
  }

  // Handle accepting a message request
  const handleAcceptRequest = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the parent notification click handler
    
    if (notification.metadata?.room_id) {
      try {
        // Update the room status to active
        const { error } = await supabase
          .from('rooms')
          .update({ status: 'active' })
          .eq('id', notification.metadata.room_id)
        
        if (error) throw error
        
        // Mark the notification as read
        await markAsRead(notification.id)
        
        // Close the popover
        setIsOpen(false)
        
        // Navigate to the room
        router.push(`/chat?room=${notification.metadata.room_id}`)
      } catch (error) {
        console.error('Error accepting request:', error)
      }
    }
  }

  // Format notification date
  const formatNotificationDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      return ''
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="default" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead} 
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                // Open account page for notification settings
                window.open('/account?settings=notifications', '_blank');
                setIsOpen(false);
              }}
              title="Notification Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Notification permission prompt */}
        {showPermissionPrompt && (
          <div className="bg-muted p-2 mb-3 rounded-md">
            <p className="text-xs mb-2">Enable notifications to stay updated on new message requests</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs"
              onClick={async () => {
                const granted = await requestPermission();
                if (granted) {
                  setShowPermissionPrompt(false);
                }
              }}
            >
              Enable Notifications
            </Button>
          </div>
        )}
        
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 mb-1 rounded-md cursor-pointer ${
                  notification.is_read ? 'bg-background' : 'bg-muted/50'
                } hover:bg-muted`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm">{notification.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatNotificationDate(notification.created_at)}
                    </p>
                  </div>
                  
                  {/* For message requests, show accept button */}
                  {notification.type === 'message_request' && !notification.is_read && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={(e) => handleAcceptRequest(notification, e)}
                      className="ml-2 text-xs"
                    >
                      Accept
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
