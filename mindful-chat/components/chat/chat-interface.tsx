'use client'

import { useEffect, useState } from 'react'
import { 
  ArrowLeft, 
  Bell,
  Calendar, 
  Menu, 
  Plus, 
  Users, 
  UserCog, 
  UserRound, 
  X, 
  Heart, 
  Stethoscope, 
  ChevronRight, 
  MessageSquare, 
  Clock 
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'
import { ChatRoom } from '@/components/chat/chat-room'
import { CreateRoomModal } from '@/components/chat/create-room-modal'
import { JoinRoomModal } from '@/components/chat/join-room-modal'
import { ActiveUsersList } from '@/components/chat/active-users-list'
import { Room, Profile } from './types'
import { RoomList } from '@/components/chat/room-list'
import { AvatarStack } from '@/components/avatar-stack'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { NotificationsBell } from '@/components/notifications-bell'
import { NotificationSettings } from '@/components/notification-settings'
import { useRouter } from 'next/navigation'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ChatInterfaceProps {
  currentUser: Profile
  initialRooms: Room[]
}

// Function to request notification permission (kept outside component as it doesn't need component state)
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
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

export default function ChatInterface({ currentUser, initialRooms }: ChatInterfaceProps) {
  const supabase = createClient()
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(initialRooms)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(rooms[0] || null)
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false)
  const [roomParticipants, setRoomParticipants] = useState<Profile[]>([])
  const [showMobileRoomList, setShowMobileRoomList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'all' | 'direct' | 'group'>('all')
  const [isPatientProfileVisible, setIsPatientProfileVisible] = useState<boolean>(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Detect mobile viewport on mount and window resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // 768px is a common breakpoint for mobile devices
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])
  
  // Filter rooms based on the active view
  useEffect(() => {
    if (activeView === 'all') {
      setFilteredRooms(rooms)
    } else if (activeView === 'direct') {
      setFilteredRooms(rooms.filter(room => room.room_type === '1:1'))
    } else {
      setFilteredRooms(rooms.filter(room => room.room_type === 'group'))
    }
  }, [activeView, rooms])
  
  const addNewRoom = (room: Room) => {
    setRooms(prev => [...prev, room])
    setSelectedRoom(room)
    // Close the mobile sidebar when selecting a new room on mobile
    if (isMobile) {
      setIsMobileSidebarOpen(false)
    }
  }
  
  // Handler for selecting a room
  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room)
    // Close the mobile sidebar when selecting a room on mobile
    if (isMobile) {
      setIsMobileSidebarOpen(false)
    }
  }

  // Get list of room IDs the user is already a member of
  const userRoomIds = rooms.map(room => room.id)
  
  // Determine if user is a mental health professional
  const isDoctor = currentUser.role === 'professional' // Variable name kept for compatibility
  
  // Apply search filtering and room categorization
  useEffect(() => {
    // First, filter based on search query if any
    let visibleRooms: Room[];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      visibleRooms = rooms.filter(room => 
        room.name.toLowerCase().includes(query) || 
        (room.description && room.description.toLowerCase().includes(query))
      );
    } else {
      visibleRooms = rooms;
    }
    
    // Apply the filtering
    setFilteredRooms(visibleRooms);
  }, [searchQuery, rooms]);
  
  // Compute pending requests and regular rooms - these are derived from filteredRooms
  const pendingRequests = filteredRooms.filter(room => 
    isDoctor && 
    room.status === 'pending' && 
    room.room_type === '1:1' && 
    room.doctor_id === currentUser.id
  );
  console.log('Pending Room Parameters:', {
    isDoctor,
    status: 'pending',
    room_type: '1:1',
    doctor_id: currentUser.id
  });
  console.log('Pending Requests:', pendingRequests);
  
  const regularRooms = filteredRooms.filter(room => 
    !(isDoctor && room.status === 'pending' && room.room_type === '1:1' && room.doctor_id === currentUser.id)
  );
  
  // Fetch participants for selected room
  useEffect(() => {
    const fetchRoomParticipants = async () => {
      if (!selectedRoom) return
      
      try {
        // First get participant IDs from room_participants
        const { data: participantData, error: participantError } = await supabase
          .from('room_participants')
          .select('profile_id')
          .eq('room_id', selectedRoom.id)
        
        if (participantError) throw participantError
        
        if (participantData?.length > 0) {
          // Get profiles for participants
          const participantIds = participantData.map(p => p.profile_id)
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', participantIds)
          
          if (profilesError) throw profilesError
          
          setRoomParticipants(profiles || [])
        } else {
          setRoomParticipants([])
        }
      } catch (error) {
        console.error('Error fetching room participants:', error)
      }
    }
    
    fetchRoomParticipants()
  }, [selectedRoom, supabase])
  
  // Get the other participant in a 1:1 conversation
  const getOtherParticipant = () => {
    if (selectedRoom?.room_type !== '1:1' || roomParticipants.length <= 1) return null
    return roomParticipants.find(p => p.id !== currentUser.id)
  }
  
  const otherParticipant = getOtherParticipant()
  
  // Get avatar data for avatar stack
  const getAvatarStackData = () => {
    return roomParticipants
      .filter(p => p.id !== currentUser.id) // Don't include current user
      .map(profile => ({
        name: profile.first_name 
          ? `${profile.first_name} ${profile.last_name || ''}` 
          : profile.username || 'Unknown',
        image: profile.avatar_url || ''
      }))
  }
  
  // Function to show web notification - only when tab is not focused
  const showNotification = async (title: string, options: NotificationOptions = {}) => {
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
          
          // Handle notification click - focus the window and navigate to correct room if provided
          notification.onclick = () => {
            window.focus();
            
            // If room_id is provided in the options.data, navigate to that room
            if (options.data?.room_id) {
              const roomId = options.data.room_id;
              const roomToSelect = rooms.find(r => r.id === roomId);
              if (roomToSelect) {
                setSelectedRoom(roomToSelect);
              }
            }
            
            notification.close();
          };
          
          // Auto close after 8 seconds
          setTimeout(() => notification.close(), 8000);
          
          return notification;
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      }
    }
    
    return null;
  };
  
  // Handler for approving a message request using the database function
  const handleApproveRequest = async (roomId: string) => {
    try {
      // Call the database function to handle approval
      const { data, error } = await supabase
        .rpc('handle_message_request', {
          p_room_id: roomId,
          p_doctor_id: currentUser.id,
          p_action: 'approve'
        })
      
      if (error) throw error
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to approve message request')
      }
      
      // Find and update the room in state
      const updatedRoom = pendingRequests.find(r => r.id === roomId)
      if (updatedRoom) {
        // Update the room status locally
        setRooms(prev => prev.map(r => r.id === roomId ? {...r, status: 'active'} : r))
        // Select the approved room
        setSelectedRoom({...updatedRoom, status: 'active'})
      }
      
      // Show a notification to confirm approval
      showNotification('Request Approved', {
        body: `You've approved the chat request for ${updatedRoom?.name || 'a patient'}`
      })
      
      console.log('Approved message request:', data)
    } catch (error) {
      console.error('Error approving request:', error)
    }
  }
  
  // Handler for declining a message request using the database function
  const handleDeclineRequest = async (roomId: string) => {
    try {
      // Call the database function to handle decline
      const { data, error } = await supabase
        .rpc('handle_message_request', {
          p_room_id: roomId,
          p_doctor_id: currentUser.id,
          p_action: 'decline'
        })
      
      if (error) throw error
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to decline message request')
      }
      
      // Remove the room from the list
      setRooms(prev => prev.filter(r => r.id !== roomId))
      
      // If this was the selected room, clear selection
      if (selectedRoom && selectedRoom.id === roomId) {
        setSelectedRoom(null)
      }
      
      // Show a notification to confirm decline
      showNotification('Request Declined', {
        body: `You've declined the chat request`
      })
      
      console.log('Declined message request:', data)
    } catch (error) {
      console.error('Error declining request:', error)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Pending Requests Alert Bar - Only for doctors with pending requests */}
      {isDoctor && pendingRequests.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 p-2">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-amber-500" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                You have {pendingRequests.length} pending message {pendingRequests.length === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-800/70 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
              onClick={() => {
                const pendingRoomSection = document.getElementById('pending-requests-section');
                if (pendingRoomSection) {
                  pendingRoomSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              View Requests
            </Button>
          </div>
        </div>
      )}
      
      {/* Header with action buttons and room info */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        {selectedRoom ? (
          <div className="flex items-center flex-1 overflow-hidden gap-2 md:gap-3">
            {/* Back button on mobile */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-1 md:hidden flex-shrink-0" 
              onClick={() => setSelectedRoom(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* Room participants */}
            <div className="flex items-center flex-shrink-0">
              {selectedRoom.room_type === '1:1' && otherParticipant ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Avatar 
                      className="h-8 w-8 cursor-pointer border border-border hover:ring-2 hover:ring-primary/20 transition-all"
                    >
                      <AvatarImage src={otherParticipant.avatar_url || ''} />
                      <AvatarFallback>
                        {(otherParticipant.first_name?.[0] || '') + (otherParticipant.last_name?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={otherParticipant.avatar_url || ''} />
                          <AvatarFallback>
                            {(otherParticipant.first_name?.[0] || '') + (otherParticipant.last_name?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-base font-semibold">
                            {otherParticipant.first_name
                              ? `${otherParticipant.first_name} ${otherParticipant.last_name || ''}`
                              : otherParticipant.username || 'Unknown'}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <Badge variant="outline" className="text-xs mr-1">
                              {otherParticipant.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                            </Badge>
                            {otherParticipant.username && <span>@{otherParticipant.username}</span>}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full flex items-center justify-center"
                          onClick={() => setIsPatientProfileVisible(true)}
                        >
                          <UserRound className="h-4 w-4 mr-1" />
                          View Profile
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full flex items-center justify-center"
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="cursor-pointer">
                      <AvatarStack 
                        avatars={getAvatarStackData()} 
                        maxAvatarsAmount={3} 
                        className="hover:opacity-90 transition-opacity"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Room Participants</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {roomParticipants.map(participant => (
                          <div key={participant.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={participant.avatar_url || ''} />
                              <AvatarFallback>
                                {(participant.first_name?.[0] || '') + (participant.last_name?.[0] || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                              <p className="text-sm font-medium truncate">
                                {participant.first_name
                                  ? `${participant.first_name} ${participant.last_name || ''}`
                                  : participant.username || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {participant.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full" 
                        onClick={() => setIsMobileSidebarOpen(true)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        View All Members
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            
            {/* Room name and details */}
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold truncate text-sm md:text-base">{selectedRoom.name}</h1>
              {selectedRoom.room_type === '1:1' && otherParticipant && (
                <p className="text-xs text-muted-foreground flex items-center">
                  {otherParticipant.role === 'professional' ? (
                    <><Stethoscope className="h-3 w-3 mr-1" /> Mental Health Professional</>
                  ) : (
                    <><Heart className="h-3 w-3 mr-1" /> Patient</>
                  )}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <Heart className="h-6 w-6 text-rose-500 mr-2" />
            <span className="text-xl font-semibold mr-2">MindfulChat</span>
            <Badge variant="outline" className="hidden md:flex">
              <Heart className="h-3 w-3 mr-1 text-rose-500" /> Wellness Challenge
            </Badge>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme toggle button */}
          <div className="mr-1">
            <ThemeToggle />
          </div>

          {/* Notifications bell with built-in notification settings */}
          <NotificationsBell />
          
          {isDoctor && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsCreateRoomOpen(true)}
              className="hidden md:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Session
            </Button>
          )}
          {!isDoctor && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsCreateRoomOpen(true)}
              className="hidden md:flex"
            >
              <Stethoscope className="h-4 w-4 mr-1" />
              Contact Mental Health Professional
            </Button>
          )}
          
          {/* Mobile action button */}
          {isDoctor && isMobile && (
            <Button size="icon" variant="ghost" onClick={() => setIsCreateRoomOpen(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          )}
          {!isDoctor && isMobile && (
            <Button size="icon" variant="ghost" onClick={() => setIsCreateRoomOpen(true)}>
              <Stethoscope className="h-5 w-5" />
            </Button>
          )}
          
          {/* User profile button always visible */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full h-8 w-8 overflow-hidden border border-border hover:ring-2 hover:ring-primary/20 transition-all"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={currentUser.avatar_url || ''} />
                  <AvatarFallback>
                    {currentUser.first_name?.[0] || currentUser.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={currentUser.avatar_url || ''} />
                    <AvatarFallback>
                      {currentUser.first_name?.[0] || currentUser.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-semibold">
                      {currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : currentUser.username || 'User'}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Badge variant="outline" className="text-xs mr-1">
                        {currentUser.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                      </Badge>
                      {currentUser.username && <span>@{currentUser.username}</span>}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex items-center justify-center"
                    onClick={() => window.location.href = '/profile'}
                  >
                    <UserCog className="h-4 w-4 mr-1" />
                    Profile
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full flex items-center justify-center"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Dashboard
                  </Button>
                </div>
                
                <div className="border-t pt-2">
                  {/* Notification settings */}
                  <NotificationSettings userId={currentUser.id} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Menu button - only visible when in a room */}
          {selectedRoom && (
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-[85%] sm:w-[350px]">
                {/* Room participants sidebar - improved */}
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
                    <h1 className="text-xl font-bold">Room Details</h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Room information */}
                  <div className="p-4 border-b border-border space-y-2">
                    <h2 className="text-base font-medium">{selectedRoom.name}</h2>
                    {selectedRoom.description && (
                      <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedRoom.room_type === '1:1' ? 'outline' : 'secondary'}>
                        {selectedRoom.room_type === '1:1' ? (
                          <><UserRound className="h-3 w-3 mr-1" /> 1:1 Session</>
                        ) : (
                          <><Users className="h-3 w-3 mr-1" /> Group Session</>
                        )}
                      </Badge>
                      {selectedRoom.is_private && (
                        <Badge variant="outline">
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* All participants */}
                  <div className="p-4 overflow-y-auto flex-1">
                    <h2 className="text-sm font-medium mb-3">All Members</h2>
                    <div className="space-y-2">
                      {roomParticipants.map(participant => (
                        <div key={participant.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={participant.avatar_url || ''} />
                              <AvatarFallback>
                                {participant.first_name?.[0] || participant.username?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {participant.first_name
                                  ? `${participant.first_name} ${participant.last_name || ''}`
                                  : participant.username || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {participant.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {participant.id === currentUser.id ? 'You' : 
                             participant.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* User profile section */}
                  <div className="p-4 mt-auto border-t border-border">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md">
                          <CurrentUserAvatar />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : currentUser.username || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {currentUser.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="ml-auto">
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="start">
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={currentUser.avatar_url || ''} />
                              <AvatarFallback>
                                {currentUser.first_name?.[0] || currentUser.username?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : currentUser.username || 'User'}
                              </h4>
                              <p className="text-xs text-muted-foreground flex items-center">
                                <Badge variant="outline" className="text-xs mr-1">
                                  {currentUser.role === 'professional' ? 'Mental Health Professional' : 'Patient'}
                                </Badge>
                                {currentUser.username && <span>@{currentUser.username}</span>}
                              </p>
                            </div>
                          </div>
                          
                          <div className="border-t pt-2">
                            {/* Notification settings */}
                            <NotificationSettings userId={currentUser.id} />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
      
      {/* Patient profile sidebar - conditionally rendered for 1:1 chats */}
      {selectedRoom?.room_type === '1:1' && isPatientProfileVisible && otherParticipant && (
        <div className="h-full border-l border-border w-64 p-4 overflow-y-auto">
          <div className="flex flex-col items-center mb-4">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={otherParticipant.avatar_url || ''} />
              <AvatarFallback>
                {(otherParticipant.first_name?.[0] || '') + (otherParticipant.last_name?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">
              {otherParticipant.first_name
                ? `${otherParticipant.first_name} ${otherParticipant.last_name || ''}`
                : otherParticipant.username || 'Unknown'}
            </h2>
            <div className="flex items-center text-sm mt-1 text-muted-foreground">
              {otherParticipant.role === 'professional' ? (
                <>
                  <Stethoscope className="h-3 w-3 mr-1" />
                  <span>Mental Health Professional</span>
                </>
              ) : (
                <>
                  <Heart className="h-3 w-3 mr-1" />
                  <span>Patient</span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {otherParticipant.username && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Username</p>
                <p className="text-sm">{otherParticipant.username}</p>
              </div>
            )}
            
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full flex items-center justify-between" 
                onClick={() => setIsPatientProfileVisible(false)}
              >
                <span>Close profile</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRoom ? (
          /* Show chat room when a room is selected */
          <ChatRoom 
            room={selectedRoom} 
            currentUser={currentUser}
          />
        ) : (
          /* Show room list when no room is selected */
          <div className="flex-1 overflow-y-auto p-2">
            {/* View filter tabs */}
            <div className="flex gap-2 p-3 border-b border-border sticky top-0 bg-background z-10">
              <Button 
                variant={activeView === 'all' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveView('all')}
              >
                All
              </Button>
              <Button 
                variant={activeView === 'direct' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveView('direct')}
              >
                <UserRound className="h-4 w-4 mr-1" />
                1:1 Sessions
              </Button>
              <Button 
                variant={activeView === 'group' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveView('group')}
              >
                <Users className="h-4 w-4 mr-1" />
                Group Chats
              </Button>
            </div>
            
            {/* Search bar */}
            <div className="space-x-2 px-2">
              <Input
                className="max-w-xs"
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                }}
              />
            </div>
            
            {/* Pending message requests section - only for doctors */}
            {isDoctor && pendingRequests.length > 0 && (
              <div id="pending-requests-section" className="mb-4 pt-4 border-t-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10 rounded-md">
                <h3 className="text-sm font-semibold px-2 mb-3 flex items-center text-amber-800 dark:text-amber-300">
                  <MessageSquare className="h-4 w-4 mr-2 text-amber-500" />
                  Pending Message Requests ({pendingRequests.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                  {pendingRequests.map(room => {
                    // Try to get patient info from room metadata if available
                    const patientName = room.metadata?.patient_name || 'Patient';
                    const requestDate = room.metadata?.requested_at 
                      ? new Date(room.metadata.requested_at).toLocaleDateString() 
                      : new Date(room.created_at || Date.now()).toLocaleDateString();
                    
                    return (
                      <div 
                        key={room.id}
                        className="border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-4 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium truncate">{room.name}</h3>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Request
                          </Badge>
                        </div>
                        {room.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {room.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2 mb-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Requested on {requestDate}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRequest(room.id);
                            }}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineRequest(room.id);
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Regular rooms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2 mt-2">
              {regularRooms.map(room => (
                <div 
                  key={room.id}
                  className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectRoom(room)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate">{room.name}</h3>
                    <div className="flex gap-1">
                      {room.room_type === '1:1' ? (
                        <div className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <UserRound className="h-3 w-3 mr-1" />
                          1:1
                        </div>
                      ) : (
                        <div className="bg-green-500/10 text-green-500 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Group
                        </div>
                      )}
                      {room.is_private && (
                        <div className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                          Private
                        </div>
                      )}
                      {/* Show message request indicator for doctors */}
                      {isDoctor && room.room_type === '1:1' && room.status === 'pending' && (
                        <div className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Request
                        </div>
                      )}
                      {/* Show pending status for patients */}
                      {!isDoctor && room.status === 'pending' && (
                        <div className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </div>
                      )}
                    </div>
                  </div>
                  {room.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {room.description}
                    </p>
                  )}
                  {/* Show doctor/patient indicators for 1:1 chats */}
                  {room.room_type === '1:1' && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Stethoscope className="h-3 w-3" />
                        <span>Mental Health Professional</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        <span>Patient</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {filteredRooms.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground mb-4">
                  {activeView === 'direct' ? 'No 1:1 sessions found.' : 
                   activeView === 'group' ? 'No group sessions found.' : 
                   'No sessions found.'}
                </p>
                <div className="flex gap-2">
                  {isDoctor && (
                    <Button onClick={() => setIsCreateRoomOpen(true)} variant="outline">
                      Create New Session
                    </Button>
                  )}
                  {!isDoctor && (
                    <Button onClick={() => setIsJoinRoomOpen(true)} variant="outline">
                      Join Session
                    </Button>
                  )}
                  {isDoctor && (
                    <Button onClick={() => setIsCreateRoomOpen(true)} variant="default">
                      Create Session
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Create room modal */}
      <CreateRoomModal 
        isOpen={isCreateRoomOpen} 
        onClose={() => setIsCreateRoomOpen(false)}
        currentUserId={currentUser.id}
        currentUser={currentUser}
        currentUserRole={currentUser.role}
        onRoomCreated={addNewRoom}
      />

      {/* Join room modal */}
      <JoinRoomModal 
        isOpen={isJoinRoomOpen} 
        onClose={() => setIsJoinRoomOpen(false)}
        currentUserId={currentUser.id}
        onRoomJoined={addNewRoom}
        userRoomIds={userRoomIds}
      />
    </div>
  )
}