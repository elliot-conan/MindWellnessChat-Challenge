'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Room, Profile } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { UserRound, Users, Search, Stethoscope, Heart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUser?: Profile
  onRoomCreated: (room: Room) => void
  currentUserRole?: 'professional' | 'patient'
}

export function CreateRoomModal({
  isOpen,
  onClose,
  currentUserId,
  currentUser,
  onRoomCreated,
  currentUserRole = 'professional',
}: CreateRoomModalProps) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [roomType, setRoomType] = useState<'group' | '1:1'>('group')
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Profile | null>(null)
  const [patients, setPatients] = useState<Profile[]>([])
  const [professionals, setProfessionals] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)
  const [showProfessionalSearch, setShowProfessionalSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch patients when component mounts or search changes (for professionals)
  useEffect(() => {
    const fetchPatients = async () => {
      if (currentUserRole !== 'professional' || !showPatientSearch) return;
      
      try {
        const query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient');
          
        // Add search filter if there's a query
        if (searchQuery) {
          query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
        }
        
        const { data, error } = await query.limit(10);
        
        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error('Error fetching patients:', err);
      }
    };
    
    fetchPatients();
  }, [supabase, currentUserRole, searchQuery, showPatientSearch]);
  
  // Fetch professionals when component mounts or search changes (for patients)
  useEffect(() => {
    const fetchProfessionals = async () => {
      if (currentUserRole !== 'patient' || !showProfessionalSearch) return;
      
      try {
        const query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'professional');
          
        // Add search filter if there's a query
        if (searchQuery) {
          query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
        }
        
        const { data, error } = await query.limit(10);
        
        if (error) throw error;
        setProfessionals(data || []);
      } catch (err) {
        console.error('Error fetching professionals:', err);
      }
    };
    
    fetchProfessionals();
  }, [supabase, currentUserRole, searchQuery, showProfessionalSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Auto-generate name for 1:1 sessions
    if (roomType === '1:1') {
      if (currentUserRole === 'professional' && selectedPatient) {
        const patientName = selectedPatient.first_name || selectedPatient.username || 'Patient';
        const professionalName = currentUser?.first_name || currentUser?.username || 'Professional';
        setName(`${patientName} <-> ${professionalName}`);
      } else if (currentUserRole === 'patient' && selectedProfessional) {
        const patientName = currentUser?.first_name || currentUser?.username || 'Patient';
        const professionalName = selectedProfessional.first_name || selectedProfessional.username || 'Professional';
        setName(`${patientName} <-> ${professionalName}`);
      }
    }
    
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Room name is required')
      return
    }
    
    // For 1:1 sessions, a patient must be selected
    if (roomType === '1:1' && !selectedPatient && currentUserRole === 'professional') {
      setError('Please select a patient for the 1:1 session')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Different handling based on room type and user role
      if (roomType === '1:1' && currentUserRole === 'patient' && selectedProfessional) {
        // Patient is creating a message request to a professional - use the database function
        const { data, error } = await supabase
          .rpc('create_message_request', {
            p_name: name.trim(),
            p_description: description.trim() || null,
            p_doctor_id: selectedProfessional.id,
            p_patient_id: currentUserId
          })
          
        if (error) throw error;
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to create message request');
        }
        
        // Create a room object to return to the parent component
        const roomData = {
          id: data.room_id,
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          created_by: currentUserId,
          room_type: '1:1',
          doctor_id: selectedProfessional.id,
          patient_id: currentUserId,
          status: 'pending',
          metadata: {
            purpose: 'mental_health',
            created_at: new Date().toISOString(),
            message_request: true,
            requested_at: new Date().toISOString()
          }
        };
        
        // Show a message with the result
        alert(data.message || "Message request sent to Mental Health Professional");
        
        // Notify parent and close modal
        onRoomCreated(roomData as Room);
        handleClose();
        return;
      } else {
        // Regular room creation flow (for professionals or group chats)
        // Set up room data based on the type of room
        const roomInsertData: any = {
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          created_by: currentUserId,
          room_type: roomType,
          metadata: {
            purpose: 'mental_health',
            created_at: new Date().toISOString(),
          },
        };
        
        // For 1:1 rooms created by professionals
        if (roomType === '1:1' && currentUserRole === 'professional' && selectedPatient) {
          roomInsertData.doctor_id = currentUserId;
          roomInsertData.patient_id = selectedPatient.id;
          roomInsertData.status = 'active'; // Professional-initiated sessions are active immediately
        }
        
        // 1. Create the room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .insert(roomInsertData)
          .select()
          .single()
  
        if (roomError) throw roomError
  
        // 2. Add the creator as a participant
        const { error: participantError } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomData.id,
            profile_id: currentUserId,
          })
          
        if (participantError) throw participantError
        
        // 3. For 1:1 rooms, add the patient as a participant
        if (roomType === '1:1' && currentUserRole === 'professional' && selectedPatient) {
          const { error: patientParticipantError } = await supabase
            .from('room_participants')
            .insert({
              room_id: roomData.id,
              profile_id: selectedPatient.id,
            })
            
          if (patientParticipantError) throw patientParticipantError
        }
        
        // Notify parent and close modal
        onRoomCreated(roomData as Room);
        handleClose();
      }

      // Note: We removed the redundant participantError check here as it's already handled in the individual flows above
    } catch (err: any) {
      setError(err.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setIsPrivate(false)
    setRoomType('group')
    setSelectedPatient(null)
    setSelectedProfessional(null)
    setSearchQuery('')
    setShowPatientSearch(false)
    setShowProfessionalSearch(false)
    setError(null)
    onClose()
  }
  
  const handlePatientSelect = (patient: Profile) => {
    setSelectedPatient(patient)
    setShowPatientSearch(false)
  }
  
  const handleProfessionalSelect = (professional: Profile) => {
    setSelectedProfessional(professional)
    setShowProfessionalSearch(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentUserRole === 'professional' 
              ? 'Create a New Therapy Session'
              : roomType === '1:1' 
                ? 'Contact a Mental Health Professional' 
                : 'Create a Group Chat'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Room type selection */}
          <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={roomType === '1:1' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setRoomType('1:1')}
              >
                <UserRound className="h-4 w-4 mr-2" />
                1:1 Session
              </Button>
              <Button
                type="button"
                variant={roomType === 'group' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setRoomType('group')}
              >
                <Users className="h-4 w-4 mr-2" />
                Group Therapy
              </Button>
            </div>
          
          {/* Patient selection - For 1:1 sessions with professional */}
          {roomType === '1:1' && currentUserRole === 'professional' && (
            <div className="space-y-2 pb-2">
              <Label>Select Patient</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    <span>
                      {selectedPatient.first_name} {selectedPatient.last_name || ''}
                      {!selectedPatient.first_name && selectedPatient.username && (
                        <span>{selectedPatient.username}</span>
                      )}
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Popover open={showPatientSearch} onOpenChange={setShowPatientSearch}>
                  <PopoverTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full justify-start text-muted-foreground"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search for a patient
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="Search patients"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {patients.length > 0 ? (
                        patients.map(patient => (
                          <div
                            key={patient.id}
                            className="flex items-center p-2 hover:bg-muted cursor-pointer"
                            onClick={() => handlePatientSelect(patient)}
                          >
                            <Heart className="h-4 w-4 mr-2 text-primary" />
                            <div>
                              {patient.first_name ? (
                                <div className="font-medium">
                                  {patient.first_name} {patient.last_name || ''}
                                </div>
                              ) : (
                                <div className="font-medium">{patient.username || 'Unknown'}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No patients found
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          
          {/* Professional selection - For 1:1 sessions with patient */}
          {roomType === '1:1' && currentUserRole === 'patient' && (
            <div className="space-y-2 pb-2">
              <Label>Select Mental Health Professional</Label>
              {selectedProfessional ? (
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span>
                      {selectedProfessional.first_name} {selectedProfessional.last_name || ''}
                      {!selectedProfessional.first_name && selectedProfessional.username && (
                        <span>{selectedProfessional.username}</span>
                      )}
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedProfessional(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Popover open={showProfessionalSearch} onOpenChange={setShowProfessionalSearch}>
                  <PopoverTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full justify-start text-muted-foreground"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search for a Mental Health Professional
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="Search Mental Health Professionals"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {professionals.length > 0 ? (
                        professionals.map(professional => (
                          <div
                            key={professional.id}
                            className="flex items-center p-2 hover:bg-muted cursor-pointer"
                            onClick={() => handleProfessionalSelect(professional)}
                          >
                            <Stethoscope className="h-4 w-4 mr-2 text-primary" />
                            <div>
                              {professional.first_name ? (
                                <div className="font-medium">
                                  {professional.first_name} {professional.last_name || ''}
                                </div>
                              ) : (
                                <div className="font-medium">{professional.username || 'Unknown'}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No Mental Health Professionals found
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Your message will be sent as a request. The Mental Health Professional will need to accept it before you can start chatting.
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">
              {roomType === '1:1' ? 'Session Name' : 'Group Name'}
            </Label>
            {roomType === '1:1' ? (
              <div className="text-sm text-muted-foreground">
                {currentUserRole === 'professional' && selectedPatient ? (
                  <p>Session will be named: <span className="font-medium">{selectedPatient.first_name || selectedPatient.username || 'Patient'} {'<->'} {currentUser?.first_name || currentUser?.username || 'Professional'}</span></p>
                ) : currentUserRole === 'patient' && selectedProfessional ? (
                  <p>Session will be named: <span className="font-medium">{currentUser?.first_name || currentUser?.username || 'Patient'} {'<->'} {selectedProfessional.first_name || selectedProfessional.username || 'Professional'}</span></p>
                ) : (
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter session name"
                    disabled={loading}
                    required
                  />
                )}
              </div>
            ) : (
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                disabled={loading}
                required
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={roomType === '1:1' ? 'Enter session details' : 'Enter group description'}
              disabled={loading}
            />
          </div>
          
          {roomType !== '1:1' && (
            <div className="flex items-center justify-between">
              <Label htmlFor="private" className="cursor-pointer">
                Private Group
              </Label>
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                disabled={loading}
              />
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 
               (roomType === '1:1' && currentUserRole === 'professional') ? 'Create Session' :
               (roomType === '1:1' && currentUserRole === 'patient') ? 'Send Request' :
               'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
