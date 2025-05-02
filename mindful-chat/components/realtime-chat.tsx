'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
  type ChatMessage,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Smile, AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CrisisAssessment } from '@/components/chat/crisis-assessment'

interface RealtimeChatProps {
  roomName: string
  username: string
  userId?: string // User's database ID
  onMessage?: (messages: ChatMessage[]) => void
  onSendMessage?: (content: string) => Promise<void>
  messages?: ChatMessage[]
  isGroupChat?: boolean // Is this a group chat or 1:1 conversation
}

/**
 * Realtime chat component
 * @param roomName - The name of the room to join. Each room is a unique chat.
 * @param username - The username of the user
 * @param onMessage - The callback function to handle the messages. Useful if you want to store the messages in a database.
 * @param messages - The messages to display in the chat. Useful if you want to display messages from a database.
 * @returns The chat component
 */
export const RealtimeChat = ({
  roomName,
  username,
  userId,
  onMessage,
  onSendMessage,
  messages: initialMessages = [],
  isGroupChat = false,
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()

  const {
    messages: realtimeMessages,
    sendMessage,
    isConnected,
  } = useRealtimeChat({
    roomName,
    username,
  })
  const [newMessage, setNewMessage] = useState('')  
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [crisisMessage, setCrisisMessage] = useState('')
  const [showCrisisAssessment, setShowCrisisAssessment] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Merge realtime messages with initial messages
  const allMessages = useMemo(() => {
    // Create a map of messages by ID from realtime messages (which have latest status)
    const realtimeMessagesMap = new Map(realtimeMessages.map(m => [m.id, m]))
    
    // Update initial messages with realtime status if available
    const updatedInitialMessages = initialMessages.map(initialMsg => {
      const realtimeVersion = realtimeMessagesMap.get(initialMsg.id)
      // If we have a realtime version with status updates, use those fields
      if (realtimeVersion) {
        return {
          ...initialMsg,
          delivered_at: realtimeVersion.delivered_at || initialMsg.delivered_at,
          read_at: realtimeVersion.read_at || initialMsg.read_at,
          // Make sure avatar_url is also passed along
          avatar_url: (initialMsg as any).avatar_url || (initialMsg.user as any).avatar_url
        }
      }
      
      // Make sure avatar_url is available on the message object
      return {
        ...initialMsg,
        avatar_url: (initialMsg as any).avatar_url || (initialMsg.user as any).avatar_url
      }
    })
    
    // Add any realtime messages that aren't in the initial messages
    const initialMessageIds = new Set(initialMessages.map(m => m.id))
    const newRealtimeMessages = realtimeMessages.filter(m => !initialMessageIds.has(m.id))
      .map(msg => ({
        ...msg,
        // Make sure avatar_url is also set for realtime messages
        avatar_url: (msg as any).avatar_url || (msg.user as any).avatar_url
      }))
    
    const mergedMessages = [...updatedInitialMessages, ...newRealtimeMessages]
    
    // Sort by creation date
    const sortedMessages = mergedMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    
    // Log status for debugging
    const statusLog = sortedMessages.map(m => ({
      id: m.id.substring(0, 8),
      delivered: m.delivered_at ? '✓' : '✗',
      read: m.read_at ? '✓' : '✗'
    }))
    console.log('Message status:', statusLog)
    
    return sortedMessages
  }, [initialMessages, realtimeMessages])

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !isConnected) return
    
    const messageContent = newMessage.trim()
    
    // Check for potential crisis content
    const lowerCaseMessage = messageContent.toLowerCase()
    const crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'want to die', 'self harm',
      'hurt myself', 'harming myself', 'cutting myself', 'overdose',
      'no reason to live', 'can\'t go on', 'can\'t take it anymore',
      'better off dead', 'hopeless', 'giving up', 'emergency',
      'immediate help', 'crisis', 'unsafe'
    ]
    
    const hasCrisisIndicator = crisisKeywords.some(keyword => 
      lowerCaseMessage.includes(keyword.toLowerCase())
    )
    
    if (hasCrisisIndicator) {
      setCrisisMessage(messageContent)
      setShowCrisisAssessment(true)
    }
    
    if (onSendMessage) {
      onSendMessage(messageContent)
    } else {
      sendMessage(messageContent)
    }
    
    setNewMessage('')
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // Get the current cursor position
    const cursorPosition = inputRef.current?.selectionStart || newMessage.length
    
    // Insert the emoji at the cursor position
    const updatedMessage = 
      newMessage.slice(0, cursorPosition) + 
      emojiData.emoji + 
      newMessage.slice(cursorPosition)
    
    setNewMessage(updatedMessage)
    setIsEmojiPickerOpen(false)
    
    // Focus back on the input after selection
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        // Place cursor after the inserted emoji
        const newCursorPosition = cursorPosition + emojiData.emoji.length
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 10)
  }

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4">
        {allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground pt-4">
            No messages yet. Start the conversation!
          </div>
        ) : null}
        <div className="space-y-1">
          {allMessages.map((message, index) => {
            const prevMessage = index > 0 ? allMessages[index - 1] : null
            const showHeader = !prevMessage || prevMessage.user.name !== message.user.name
            const isLastMessageByUser = index === allMessages.filter(m => m.user.name === message.user.name).length - 1
            
            // Determine if this is the last message in the conversation from this user
            // This checks if there are any more messages from this user later in the array
            const isLastMessage = isLastMessageByUser && message.user.name === username

            return (
              <div
                key={message.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <ChatMessageItem
                  message={message}
                  isOwnMessage={message.user.name === username}
                  showHeader={showHeader}
                  currentUserId={userId || username} // Use user ID if provided, otherwise username as fallback
                  isLastMessage={isLastMessage}
                  isGroupChat={isGroupChat}
                />
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="flex w-full gap-2 border-t border-border p-2 md:p-4 sticky bottom-0 bg-background">
        <div className="relative flex items-center w-full gap-2">
          <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              >
                <Smile className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border border-border" side="top" align="start">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                searchPlaceHolder="Search emoji..."
                width={300}
                height={400}
              />
            </PopoverContent>
          </Popover>
          
          <Input
            ref={inputRef}
            className={cn(
              'rounded-full bg-background text-sm transition-all duration-300 min-h-10 flex-1'
            )}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          
          {isConnected && newMessage.trim() && (
            <Button
              className="aspect-square rounded-full animate-in fade-in duration-300 h-10 w-10"
              type="submit"
              disabled={!isConnected}
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
      
      {/* Crisis Assessment Dialog */}
      {showCrisisAssessment && (
        <CrisisAssessment 
          messageContent={crisisMessage} 
          onClose={() => setShowCrisisAssessment(false)} 
        />
      )}
    </div>
  )
}
