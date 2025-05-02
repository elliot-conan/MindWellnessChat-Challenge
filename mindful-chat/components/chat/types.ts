export interface Room {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string | null
  room_type: 'group' | '1:1'
  patient_id: string | null
  doctor_id: string | null
  metadata: Record<string, any> | null
  status?: 'active' | 'pending' | 'closed'
  created_at?: string
  updated_at?: string
}

export interface Profile {
  id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: 'professional' | 'patient'
  is_verified: boolean
}
