/**
 * Logger utility for the application
 * Only logs to console when DEVELOPMENT_MODE is true
 */

// Check if we're in development mode
const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true' || process.env.NODE_ENV === 'development'

/**
 * Logger utility that only outputs logs in development mode
 */
export const logger = {
  /**
   * Log a debug message (only visible in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopmentMode) {
      console.debug('[DEBUG]', ...args)
    }
  },
  
  /**
   * Log info message (only visible in development)
   */
  info: (...args: any[]) => {
    if (isDevelopmentMode) {
      console.info('[INFO]', ...args)
    }
  },
  
  /**
   * Log a warning message (visible in both dev and prod)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
  
  /**
   * Log an error message (visible in both dev and prod)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  }
}
