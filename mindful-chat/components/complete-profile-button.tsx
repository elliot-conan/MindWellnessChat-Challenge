'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function CompleteProfileButton() {
  const router = useRouter()

  return (
    <div className="flex flex-col w-full gap-3">
      <Button 
        variant="default" 
        onClick={() => router.push('/profile/edit')}
        className="w-full"
      >
        Complete your profile
      </Button>
      <Button 
        variant="outline" 
        onClick={() => router.push('/chat')}
        className="w-full"
      >
        Skip and go to chat
      </Button>
    </div>
  )
}
