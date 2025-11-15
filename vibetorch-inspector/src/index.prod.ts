'use client'

/**
 * Production build - VibetorchInspector is disabled
 */

// Export types only
export type { ElementInfo } from './core/types'

// Export noop component for production
export const VibetorchInspector = () => null
