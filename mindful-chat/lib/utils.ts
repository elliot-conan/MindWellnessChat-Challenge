import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a timestamp as a relative time string
 * @param timestamp ISO string timestamp
 * @returns Formatted relative time string (e.g., 'just now', '5m ago', '2h ago', 'today at 2:30 PM', or the full date)
 */
export function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Just now: less than a minute ago
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  // Minutes ago: less than an hour ago
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  
  // Hours ago: less than a day ago
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  
  // Today at specific time: within the current day
  if (date.toDateString() === now.toDateString()) {
    return `today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // Yesterday at specific time
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // Default: show the full date
  return date.toLocaleDateString(undefined, { 
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
