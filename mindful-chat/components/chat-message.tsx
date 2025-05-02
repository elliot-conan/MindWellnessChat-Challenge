import { cn, formatRelativeTime } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-realtime-chat'
import { MessageReactions } from '@/components/chat/message-reactions'
import { Check, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  currentUserId: string
  isLastMessage?: boolean
  isGroupChat?: boolean
}

export const ChatMessageItem = ({ message, isOwnMessage, showHeader, currentUserId, isLastMessage = false, isGroupChat = false }: ChatMessageItemProps) => {
  // Show status indicators for all messages sent by the current user
  const showMessageStatus = isOwnMessage
  return (
    <div className={`flex mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} relative`}>
      {/* Avatar - only show for messages not from current user */}
      {!isOwnMessage && (
        <div className="mr-2 flex-shrink-0 self-end mb-1">
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.avatar_url || message.user.avatar_url || ''} />
            <AvatarFallback>
              {(message.user.first_name?.[0] || '') + (message.user.last_name?.[0] || '')}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div
        className={cn('max-w-[75%] w-fit flex flex-col gap-1', {
          'items-end': isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn('flex items-center gap-2 text-xs px-3', {
              'justify-end flex-row-reverse': isOwnMessage,
            })}
          >
            {/* Only show names in group chats */}
            {!isOwnMessage && isGroupChat && (
              <span className={'font-medium'}>{message.user.first_name || message.user.name}</span>
            )}
            <span className="text-foreground/50 text-xs">
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        )}
        <div
          className={cn(
            'py-2 px-3 rounded-xl text-sm w-fit',
            isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          {message.content}
        </div>
        
        {/* Message reactions */}
        <div className="flex items-center gap-1">
          <MessageReactions 
            messageId={message.id} 
            userId={currentUserId}
            className={cn({
              'justify-end': isOwnMessage,
              'justify-start': !isOwnMessage,
            })}
          />
          
          {/* Message status indicators - only shown for own messages */}
          {showMessageStatus && (
            <div className="flex items-center text-xs text-muted-foreground">
              {(() => {
                const hasReadReceipt = !!message.read_at;
                const hasDeliveredReceipt = !!message.delivered_at;
                
                // Format the relative timestamps
                const readTime = formatRelativeTime(message.read_at);
                const deliveredTime = formatRelativeTime(message.delivered_at);
                
                // For last message, show text status
                if (isLastMessage) {
                  if (hasReadReceipt) {
                    return (
                      <div className="flex items-center gap-1">
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                        <span className="text-[10px]">Read {readTime}</span>
                      </div>
                    );
                  } else if (hasDeliveredReceipt) {
                    return (
                      <div className="flex items-center gap-1">
                        <CheckCheck className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px]">Delivered {deliveredTime}</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px]">Sent</span>
                      </div>
                    );
                  }
                } else {
                  // For other messages, just show icons with tooltips
                  if (hasReadReceipt) {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            <CheckCheck className="h-3 w-3 text-blue-500" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Read {readTime}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  } else if (hasDeliveredReceipt) {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            <CheckCheck className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Delivered {deliveredTime}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  } else {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            <Check className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Sent</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                }
              })()} 
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
