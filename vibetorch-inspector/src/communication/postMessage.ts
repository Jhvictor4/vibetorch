/**
 * PostMessage communication bridge for iframe ↔ parent window communication
 */

import type { VibetorchMessage } from '../core/types'

export class MessageBridge {
  private targetOrigin: string
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  
  constructor(targetOrigin = '*') {
    this.targetOrigin = targetOrigin
    this.setupGlobalListener()
  }
  
  /**
   * Setup global message listener
   */
  private setupGlobalListener() {
    if (typeof window === 'undefined') return
    
    window.addEventListener('message', (event) => {
      // Security check
      if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
        return
      }
      
      // Check if it's a Vibetorch message
      if (event.data?.type?.startsWith('vibetorch:')) {
        const type = event.data.type.replace('vibetorch:', '')
        const handlers = this.listeners.get(type)
        
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(event.data)
            } catch (error) {
              console.error('[VibetorchInspector] Message handler error:', error)
            }
          })
        }
      }
    })
  }
  
  /**
   * Send message to parent window
   */
  sendToParent(type: string, data: any) {
    if (typeof window === 'undefined') return
    if (window.parent === window) return // Not in iframe
    
    const message: VibetorchMessage = {
      type: `vibetorch:${type}`,
      data,
      timestamp: Date.now()
    }
    
    window.parent.postMessage(message, this.targetOrigin)
  }
  
  /**
   * Send message to iframe
   */
  sendToIframe(iframe: HTMLIFrameElement, type: string, data: any) {
    if (!iframe?.contentWindow) return
    
    const message: VibetorchMessage = {
      type: `vibetorch:${type}`,
      data,
      timestamp: Date.now()
    }
    
    iframe.contentWindow.postMessage(message, this.targetOrigin)
  }
  
  /**
   * Listen for messages
   */
  onMessage(handler: (message: VibetorchMessage) => void): () => void {
    const wrappedHandler = (data: any) => {
      handler(data)
    }
    
    // Listen to all message types
    const allHandlers = this.listeners.get('*') || new Set()
    allHandlers.add(wrappedHandler)
    this.listeners.set('*', allHandlers)
    
    // Return unsubscribe function
    return () => {
      allHandlers.delete(wrappedHandler)
    }
  }
  
  /**
   * Listen for specific message type
   */
  on(type: string, handler: (data: any) => void): () => void {
    const cleanType = type.replace('vibetorch:', '')
    const handlers = this.listeners.get(cleanType) || new Set()
    handlers.add(handler)
    this.listeners.set(cleanType, handlers)
    
    // Also add to global handlers
    const allHandlers = this.listeners.get('*') || new Set()
    const wrappedHandler = (message: VibetorchMessage) => {
      if (message.type === `vibetorch:${cleanType}`) {
        handler(message.data)
      }
    }
    allHandlers.add(wrappedHandler as any)
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler)
      allHandlers.delete(wrappedHandler as any)
    }
  }
  
  /**
   * Request-response pattern
   */
  async request(type: string, data: any, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7)
      const responseType = `${type}-response`
      
      // Setup response listener
      const unsubscribe = this.on(responseType, (response) => {
        if (response.requestId === requestId) {
          unsubscribe()
          clearTimeout(timer)
          resolve(response.data)
        }
      })
      
      // Setup timeout
      const timer = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Request timeout: ${type}`))
      }, timeout)
      
      // Send request
      this.sendToParent(type, { ...data, requestId })
    })
  }
}