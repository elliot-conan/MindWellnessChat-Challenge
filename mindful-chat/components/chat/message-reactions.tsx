'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SmilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'

interface MessageReactionsProps {
  messageId: string
  userId: string
  className?: string
}

interface Reaction {
  reaction_type: string
  count: number
  users: string[]
  usernames: string[] // Usernames of people who reacted
}

// Using the interface from our hook

export function MessageReactions({ messageId, userId, className }: MessageReactionsProps) {
  const supabase = createClient()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch reactions for this message
  useEffect(() => {
    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          reaction_type, 
          profile_id,
          profiles:profile_id (username, full_name)
        `)
        .eq('message_id', messageId)

      if (!error && data) {
        // Group reactions by type and count them
        const reactionMap = data.reduce((acc, reaction) => {
          if (!acc[reaction.reaction_type]) {
            acc[reaction.reaction_type] = {
              reaction_type: reaction.reaction_type,
              count: 0,
              users: [],
              usernames: []
            }
          }
          acc[reaction.reaction_type].count += 1
          acc[reaction.reaction_type].users.push(reaction.profile_id)
          
          // Get the user's name (prefer full_name if available, otherwise username)
          const profile = reaction.profiles as any // Type assertion to handle the nested structure
          const userName = profile ? (profile.full_name || profile.username || 'Unknown user') : 'Unknown user'
          acc[reaction.reaction_type].usernames.push(userName)
          
          return acc
        }, {} as Record<string, Reaction>)
        
        setReactions(Object.values(reactionMap))
      }
    }

    fetchReactions()

    // Subscribe to reaction changes for realtime updates
    const realtimeChannel = supabase
      .channel(`message-reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [messageId, supabase])

  // Add a reaction
  const addReaction = async (reactionType: string) => {
    setIsLoading(true)
    try {
      // Check if user already added this reaction
      const hasReaction = reactions.some(reaction => 
        reaction.reaction_type === reactionType && reaction.users.includes(userId)
      )

      if (hasReaction) {
        // Remove the reaction if it already exists
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('profile_id', userId)
          .eq('reaction_type', reactionType)
      } else {
        // Add the reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            profile_id: userId,
            reaction_type: reactionType,
          })
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  // Check if user has added a specific reaction
  const hasUserReacted = (reactionType: string) => {
    return reactions.some(reaction => 
      reaction.reaction_type === reactionType && reaction.users.includes(userId)
    )
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1 mt-1", className)}>
      {/* Display existing reactions */}
      {reactions.map((reaction) => (
        <TooltipProvider key={reaction.reaction_type}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => addReaction(reaction.reaction_type)}
                size="sm"
                variant={hasUserReacted(reaction.reaction_type) ? "default" : "outline"}
                className="h-6 px-2 rounded-full text-xs font-normal my-1"
                disabled={isLoading}
              >
                {reaction.reaction_type} {reaction.count}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-[200px] max-h-[150px] overflow-y-auto text-xs">
                <p className="font-semibold mb-1">{reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}</p>
                <ul className="list-disc pl-4">
                  {reaction.usernames.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      {/* Reaction picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 rounded-full my-1"
            disabled={isLoading}
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border border-border" align="start" side="top">
          {/* Emoji picker for reactions */}
          <EmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) => {
              addReaction(emojiData.emoji);
            }}
            searchPlaceHolder="Search emoji..."
            reactionsDefaultOpen={true}
            width={280}
            height={350}
            previewConfig={{ showPreview: false }}
            theme={Theme.LIGHT}
            skinTonesDisabled
            lazyLoadEmojis
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
