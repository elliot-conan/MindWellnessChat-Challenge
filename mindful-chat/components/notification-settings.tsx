'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, BellOff, Volume2, Volume1, VolumeX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Request notification permission helper
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return { granted: false, reason: 'not-supported' };
  }
  
  if (Notification.permission === 'granted') {
    return { granted: true };
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted', reason: permission === 'denied' ? 'denied' : 'default' };
  }
  
  return { granted: false, reason: 'denied' };
};

interface NotificationSettingsProps {
  userId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationSettings({ userId, trigger, open, onOpenChange }: NotificationSettingsProps) {
  const supabase = createClient();
  // Use controlled state if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Determine if component is using controlled or uncontrolled mode
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isDialogOpen = isControlled ? open : internalOpen;
  
  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('checking');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Check browser permission
        const { granted, reason } = await requestNotificationPermission();
        setPermissionStatus(granted ? 'granted' : reason || 'denied');
        
        // Get user settings from database
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        // Set state based on saved settings or defaults
        if (data?.notification_settings) {
          const settings = data.notification_settings;
          setBrowserNotifications(settings.browser_enabled ?? granted);
          setNotificationSound(settings.sound_enabled ?? true);
        } else {
          // Default settings
          setBrowserNotifications(granted);
          setNotificationSound(true);
        }
      } catch (err) {
        console.error('Error loading notification settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (open) {
      loadSettings();
    }
  }, [open, supabase, userId]);

  // Save settings to database
  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: {
            browser_enabled: browserNotifications,
            sound_enabled: notificationSound,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      handleOpenChange(false);
    } catch (err) {
      console.error('Error saving notification settings:', err);
    }
  };

  // Request browser notification permission
  const requestPermission = async () => {
    const { granted, reason } = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : reason || 'denied');
    
    if (granted) {
      setBrowserNotifications(true);
      
      // Show a test notification
      new Notification('Notifications enabled', {
        body: 'You will now receive notifications for new messages and requests',
        icon: '/logo.png'
      });
    }
  };
  
  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      {browserNotifications ? <Bell className="h-4 w-4 mr-1" /> : <BellOff className="h-4 w-4 mr-1" />}
      Notifications
    </Button>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="browser-notifications" className="font-medium">Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notifications when you receive new messages or requests
                </p>
              </div>
              {permissionStatus === 'granted' ? (
                <Switch
                  id="browser-notifications"
                  checked={browserNotifications}
                  onCheckedChange={setBrowserNotifications}
                  disabled={loading || permissionStatus !== 'granted'}
                />
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={requestPermission}
                  disabled={loading || permissionStatus === 'not-supported'}
                >
                  {permissionStatus === 'not-supported' ? 'Not Supported' : 'Enable'}
                </Button>
              )}
            </div>
            {permissionStatus === 'denied' && (
              <div className="text-xs text-amber-500 mt-1">
                Notifications are blocked in your browser settings. Please update your browser settings to enable notifications.
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notification-sound" className="font-medium">Notification Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Play a sound when you receive notifications
                </p>
              </div>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mr-2" 
                  onClick={() => setNotificationSound(!notificationSound)}
                  disabled={loading}
                >
                  {notificationSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Switch
                  id="notification-sound"
                  checked={notificationSound}
                  onCheckedChange={setNotificationSound}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={saveSettings} disabled={loading}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
