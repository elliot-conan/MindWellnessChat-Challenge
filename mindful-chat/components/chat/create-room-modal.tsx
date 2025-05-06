'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Room, Profile } from './types' // Assuming ./types.ts or similar defines these
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
  const [isPrivate, setIsPrivate] = useState(false) // Group sessions are public by default
  const [roomType, setRoomType] = useState<'group' | '1:1'>('group')
  // Removed isGroupTherapy state, will derive from roomType
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Profile | null>(null)
  const [patients, setPatients] = useState<Profile[]>([])
  const [professionals, setProfessionals] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)
  const [showProfessionalSearch, setShowProfessionalSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch patients when search is active for professionals selecting a patient
  useEffect(() => {
    const fetchPatients = async () => {
      if (currentUserRole !== 'professional' || !showPatientSearch) {
        if (!searchQuery) setPatients([]); // Clear if search is not active and no query
        return;
      }
      
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient');
          
        if (searchQuery) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
        }
        
        const { data, error: fetchError } = await query.limit(10);
        
        if (fetchError) throw fetchError;
        setPatients(data || []);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setPatients([]); // Clear patients on error
      }
    };
    
    fetchPatients();
  }, [supabase, currentUserRole, searchQuery, showPatientSearch]);
  
  // Fetch professionals when search is active for patients selecting a professional
  useEffect(() => {
    const fetchProfessionals = async () => {
      if (currentUserRole !== 'patient' || !showProfessionalSearch) {
        if (!searchQuery) setProfessionals([]); // Clear if search is not active and no query
        return;
      }
      
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'professional');
          
        if (searchQuery) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
        }
        
        const { data, error: fetchError } = await query.limit(10);
        
        if (fetchError) throw fetchError;
        setProfessionals(data || []);
      } catch (err) {
        console.error('Error fetching professionals:', err);
        setProfessionals([]); // Clear professionals on error
      }
    };
    
    fetchProfessionals();
  }, [supabase, currentUserRole, searchQuery, showProfessionalSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let effectiveRoomName = name.trim();

    if (roomType === '1:1') {
      let generatedName = '';
      const professionalDisplayName = currentUser?.first_name || currentUser?.username || 'Professional';
      const patientDisplayName = currentUser?.first_name || currentUser?.username || 'Patient';

      if (currentUserRole === 'professional' && selectedPatient) {
        const selectedPatientName = selectedPatient.first_name || selectedPatient.username || 'Patient';
        generatedName = `${selectedPatientName} <-> ${professionalDisplayName}`;
      } else if (currentUserRole === 'patient' && selectedProfessional) {
        const selectedProfessionalName = selectedProfessional.first_name || selectedProfessional.username || 'Professional';
        generatedName = `${patientDisplayName} <-> ${selectedProfessionalName}`;
      }

      if (generatedName) {
        setName(generatedName); // Update state for UI consistency
        effectiveRoomName = generatedName; // Use this for the current submission logic
      }
    }

    if (!effectiveRoomName) {
      setError('Room name is required');
      setLoading(false);
      return;
    }

    if (roomType === '1:1') {
      if (currentUserRole === 'professional' && !selectedPatient) {
        setError('Please select a patient for the 1:1 session');
        setLoading(false);
        return;
      }
      if (currentUserRole === 'patient' && !selectedProfessional) {
        setError('Please select a mental health professional for the 1:1 session');
        setLoading(false);
        return;
      }
    }

    try {
      if (roomType === '1:1' && currentUserRole === 'patient' && selectedProfessional) {
        // Patient is creating a message request to a professional
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_message_request', {
          p_name: effectiveRoomName,
          p_description: description.trim() || null,
          p_doctor_id: selectedProfessional.id,
          p_patient_id: currentUserId,
        });

        if (rpcError) throw rpcError;
        if (!rpcData || !rpcData.success) {
          throw new Error(rpcData?.message || 'Failed to create message request');
        }

        const newRoom: Room = {
          id: rpcData.room_id,
          name: effectiveRoomName,
          description: description.trim() || null,
          is_private: true, // 1:1 message requests are implicitly private
          created_by: currentUserId,
          room_type: '1:1',
          doctor_id: selectedProfessional.id,
          patient_id: currentUserId,
          status: 'pending', // Message requests are pending
          metadata: {
            purpose: 'mental_health',
            created_at: new Date().toISOString(),
            message_request: true,
            requested_at: new Date().toISOString(),
          },
        };
        alert(rpcData.message || 'Message request sent to Mental Health Professional');
        onRoomCreated(newRoom);
        handleClose();
        // setLoading(false) is handled in finally block
        return; 
      } else {
        // Professional creating 1:1 or any user creating a group session
        const roomInsertData: any = { // Consider creating a more specific type if possible
          name: effectiveRoomName,
          description: description.trim() || null,
          is_private: roomType === 'group' ? isPrivate : true, // 1:1s are always private
          created_by: currentUserId,
          room_type: roomType,
          status: 'active', // Default status; 'pending' for patient requests is handled above
          metadata: {
            purpose: 'mental_health',
            created_at: new Date().toISOString(),
            group_therapy: roomType === 'group', // Simplified from isGroupTherapy state
          },
        };

        if (roomType === '1:1' && currentUserRole === 'professional' && selectedPatient) {
          roomInsertData.doctor_id = currentUserId;
          roomInsertData.patient_id = selectedPatient.id;
          // status 'active' is already set by default for this flow
        }
        
        const { data: newRoomData, error: roomError } = await supabase
          .from('rooms')
          .insert(roomInsertData)
          .select()
          .single();

        if (roomError) throw roomError;
        if (!newRoomData) throw new Error("Room creation failed to return data.");

        // Add creator as participant
        const { error: participantError } = await supabase
          .from('room_participants')
          .insert({ room_id: newRoomData.id, profile_id: currentUserId });

        if (participantError) throw participantError;

        // For 1:1 rooms created by professionals, add the patient as a participant
        if (roomType === '1:1' && currentUserRole === 'professional' && selectedPatient) {
          const { error: patientParticipantError } = await supabase
            .from('room_participants')
            .insert({ room_id: newRoomData.id, profile_id: selectedPatient.id });

          if (patientParticipantError) throw patientParticipantError;
        }
        onRoomCreated(newRoomData as Room);
        handleClose();
      }
    } catch (err: any) {
      console.error('Error in handleSubmit:', err); 
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
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
    setSearchQuery('') // Clear search query after selection
    setShowPatientSearch(false)
  }
  
  const handleProfessionalSelect = (professional: Profile) => {
    setSelectedProfessional(professional)
    setSearchQuery('') // Clear search query after selection
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
          <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={roomType === '1:1' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setRoomType('1:1');
                  // setIsGroupTherapy(false); // Removed
                }}
              >
                <UserRound className="h-4 w-4 mr-2" />
                1:1 Session
              </Button>
              <Button
                type="button"
                variant={roomType === 'group' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setRoomType('group');
                  // setIsGroupTherapy(true); // Removed
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Group Therapy
              </Button>
            </div>
          
          {roomType === '1:1' && currentUserRole === 'professional' && (
            <div className="space-y-2 pb-2">
              <Label>Select Patient</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    <span>
                      {selectedPatient.first_name || selectedPatient.username} {selectedPatient.first_name && selectedPatient.last_name}
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {setSelectedPatient(null); setSearchQuery('');}}
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
                      onClick={() => setShowPatientSearch(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search for a patient
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start"> {/* Changed w-64 to w-full for better responsiveness */}
                    <div className="p-2">
                      <Input
                        placeholder="Search patients by name or username"
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
                              <div className="font-medium">
                                {patient.first_name || patient.username} {patient.first_name && patient.last_name}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {searchQuery ? 'No patients found' : 'Type to search for patients'}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          
          {roomType === '1:1' && currentUserRole === 'patient' && (
            <div className="space-y-2 pb-2">
              <Label>Select Mental Health Professional</Label>
              {selectedProfessional ? (
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span>
                      {selectedProfessional.first_name || selectedProfessional.username} {selectedProfessional.first_name && selectedProfessional.last_name}
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {setSelectedProfessional(null); setSearchQuery('');}}
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
                      onClick={() => setShowProfessionalSearch(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search for a Mental Health Professional
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start"> {/* Changed w-64 to w-full */}
                    <div className="p-2">
                      <Input
                        placeholder="Search by name or username"
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
                               <div className="font-medium">
                                {professional.first_name || professional.username} {professional.first_name && professional.last_name}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                           {searchQuery ? 'No professionals found' : 'Type to search for professionals'}
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
            <Label htmlFor="name">{roomType === '1:1' ? 'Session Title' : 'Group Name'}</Label>
            {roomType === '1:1' ? (
              <div className="text-sm text-muted-foreground h-10 flex items-center px-3 py-2 border rounded-md bg-muted"> {/* Adjusted to look like disabled input */}
                { (currentUserRole === 'professional' && selectedPatient) 
                    ? <span className="font-medium">{`${selectedPatient.first_name || selectedPatient.username || 'Patient'} <-> ${currentUser?.first_name || currentUser?.username || 'Professional'}`}</span>
                    : (currentUserRole === 'patient' && selectedProfessional)
                        ? <span className="font-medium">{`${currentUser?.first_name || currentUser?.username || 'Patient'} <-> ${selectedProfessional.first_name || selectedProfessional.username || 'Professional'}`}</span>
                        : <span className="text-muted-foreground italic">Select participants to auto-generate title</span>
                }
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
              placeholder={roomType === '1:1' ? 'Enter session details or reason for contact' : 'Enter group description'}
              disabled={loading}
            />
          </div>
          
          {roomType === 'group' && ( // Changed from roomType !== '1:1' for clarity
            <div className="flex items-center justify-between">
              <Label htmlFor="private" className="cursor-pointer flex-grow">
                Private Group (invitation only)
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
            <Button type="submit" disabled={loading || (roomType === '1:1' && !( (currentUserRole === 'professional' && selectedPatient) || (currentUserRole === 'patient' && selectedProfessional) ) )}>
              {loading ? 'Processing...' : 
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