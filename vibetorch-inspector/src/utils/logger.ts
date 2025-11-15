/**
 * Unified logging system for VibetorchInspector
 * Provides consistent logging with environment-aware behavior
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  enabled?: boolean
  debugMode?: boolean
  prefix?: string
}

class Logger {
  private config: Required<LoggerConfig>

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enabled: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
      debugMode: typeof process !== 'undefined' && !!process.env?.DEBUG_VIBETORCH,
      prefix: '[VibeTorch]',
      ...config
    }
  }

  /**
   * Debug level - only shown when DEBUG_VIBETORCH is enabled
   */
  debug(message: string, ...args: any[]): void {
    if (this.config.enabled && this.config.debugMode) {
      console.log(`${this.config.prefix}:DEBUG`, message, ...args)
    }
  }

  /**
   * Info level - shown in development mode
   */
  info(message: string, ...args: any[]): void {
    if (this.config.enabled) {
      console.log(this.config.prefix, message, ...args)
    }
  }

  /**
   * Warning level - always shown
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`${this.config.prefix}:WARN`, message, ...args)
  }

  /**
   * Error level - always shown
   */
  error(message: string, ...args: any[]): void {
    console.error(`${this.config.prefix}:ERROR`, message, ...args)
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export class for custom instances
export { Logger }
export type { LoggerConfig, LogLevel }
