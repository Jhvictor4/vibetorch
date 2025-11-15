'use client'

/**
 * VibetorchInspector - Full functionality (tree-shaken in production)
 */

// Export types
export type { ElementInfo } from './core/types'

// Export React component
// Bundle minifiers (terser, etc.) will tree-shake this based on NODE_ENV
export { VibetorchInspector } from './react/VibetorchInspector'
