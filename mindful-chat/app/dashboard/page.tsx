import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatInterfaceWrapper from '@/components/chat/chat-interface-wrapper'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-screen w-full">
      <ChatInterfaceWrapper userId={data.user.id} />
    </div>
  )
}
