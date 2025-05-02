'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Define the shape of a common reaction
export interface CommonReaction {
  emoji: string
  emoji_name: string
}

// Module-level cache to store the reactions across component instances
let cachedReactions: CommonReaction[] | null = null
let fetchPromise: Promise<CommonReaction[]> | null = null

export function useCommonReactions() {
  const supabase = createClient()
  const [reactions, setReactions] = useState<CommonReaction[]>([])
  const [loading, setLoading] = useState(cachedReactions === null)

  useEffect(() => {
    const fetchCommonReactions = async (): Promise<CommonReaction[]> => {
      // If we already have cached reactions, use those
      if (cachedReactions !== null) {
        return cachedReactions
      }

      // If there's already a fetch in progress, wait for it
      if (fetchPromise !== null) {
        return fetchPromise
      }

      // Otherwise, start a new fetch
      fetchPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('common_reactions')
            .select('emoji, emoji_name')
            .order('display_order', { ascending: true })

          if (error) {
            console.error('Error fetching common reactions:', error)
            return []
          }

          // Cache the reactions
          cachedReactions = data || []
          return cachedReactions
        } catch (error) {
          console.error('Error in fetchCommonReactions:', error)
          return []
        } finally {
          // Clear the promise once done
          fetchPromise = null
        }
      })()

      return fetchPromise
    }

    const getReactions = async () => {
      const data = await fetchCommonReactions()
      setReactions(data)
      setLoading(false)
    }

    getReactions()
  }, [supabase])

  return { reactions, loading }
}
