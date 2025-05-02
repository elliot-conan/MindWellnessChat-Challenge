'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile-form'
import { Skeleton } from '@/components/ui/skeleton'
import { redirect, useRouter } from 'next/navigation'
import { Heart, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        redirect('/auth/login')
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(profileData)
      }

      setIsLoading(false)
    }

    checkSession()
  }, [supabase])

  const LoadingContent = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton className="h-12 w-full" key={i} />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/dashboard')} 
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Heart className="h-6 w-6 text-rose-500" />
            <span className="text-xl font-semibold">MindfulChat</span>
            <Badge variant="outline" className="hidden md:flex ml-2">
              Profile Settings
            </Badge>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-6 px-4">
        <div className="container max-w-4xl mx-auto">
          <Card className="shadow-md border-border">
            <CardHeader>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-72 mt-2" />
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl">Profile Settings</CardTitle>
                  <CardDescription>Update your profile information and avatar</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingContent /> : (profile && <ProfileForm profile={profile} />)}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-4 mt-auto">
        <div className="container px-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            <span className="font-medium text-sm">MindfulChat</span>
            <span className="text-muted-foreground text-xs">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
