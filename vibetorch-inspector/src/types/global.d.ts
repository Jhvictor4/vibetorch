/**
 * Global type definitions for VibetorchInspector
 */

import type { VibetorchInspector } from '../core/inspector'

declare global {
  interface Window {
    /**
     * Global VibetorchInspector instance
     * Automatically created when the inspector is initialized
     */
    __vibetorchInspector?: VibetorchInspector
  }
}

// This export makes this file a module
export {}
