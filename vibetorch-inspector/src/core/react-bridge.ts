/**
 * React Fiber bridge for extracting component information
 */

import type { ReactComponentInfo } from './types'

export class ReactBridge {
  /**
   * Get React Fiber instance from DOM element
   */
  private getFiberFromElement(element: Element): any | null {
    const key = Object.keys(element).find(key => 
      key.startsWith('__reactFiber$') || // React 17+
      key.startsWith('__reactInternalInstance$') // React <17
    )
    
    if (!key) return null
    
    try {
      return (element as any)[key]
    } catch {
      return null
    }
  }
  
  /**
   * Navigate up fiber tree to find React component (not DOM element)
   */
  private findComponentFiber(fiber: any): any | null {
    let current = fiber
    
    // Navigate up until we find a component (not a DOM element)
    while (current && typeof current.type === 'string') {
      current = current.return
    }
    
    return current
  }
  
  /**
   * Extract component name from fiber
   */
  private getComponentName(fiber: any): string {
    if (!fiber) return 'Unknown'

    const type = fiber.type

    // Try various name sources in priority order
    // 1. Display name (explicitly set)
    if (type?.displayName) return type.displayName

    // 2. Function/Class name
    if (type?.name && type.name !== 'Component') return type.name

    // 3. Debug owner (for Next.js and modern React)
    if (fiber._debugOwner?.elementType?.name) {
      return fiber._debugOwner.elementType.name
    }

    // 4. Alternative element type
    if (fiber.elementType?.displayName) return fiber.elementType.displayName
    if (fiber.elementType?.name && fiber.elementType.name !== 'Component') {
      return fiber.elementType.name
    }

    // 5. Function component name
    if (fiber.functionComponent?.name) return fiber.functionComponent.name

    // 6. Try to extract from function string (last resort)
    if (typeof type === 'function') {
      const funcStr = type.toString()
      const match = funcStr.match(/function\s+([^\s(]+)/)
      if (match && match[1] !== 'Component') return match[1]
    }

    // 7. Check stateNode for class components
    if (fiber.stateNode?.constructor?.name &&
        fiber.stateNode.constructor.name !== 'Component' &&
        fiber.stateNode.constructor.name !== 'Object') {
      return fiber.stateNode.constructor.name
    }

    // 8. Try parent fiber names as context
    let parent = fiber.return
    while (parent) {
      if (parent.type?.name && parent.type.name !== 'Component') {
        return `${parent.type.name}.Child`
      }
      parent = parent.return
    }

    return 'Component'
  }
  
  /**
   * Get React component info from DOM element
   */
  getComponentInfo(element: Element): ReactComponentInfo | null {
    const fiber = this.getFiberFromElement(element)
    if (!fiber) return null
    
    const componentFiber = this.findComponentFiber(fiber)
    if (!componentFiber) return null
    
    try {
      const info: ReactComponentInfo = {
        componentName: this.getComponentName(componentFiber),
        props: this.sanitizeProps(componentFiber.memoizedProps),
        key: componentFiber.key,
        testId: element.getAttribute('data-testid') || undefined
      }
      
      // Add source info if available (development mode)
      if (componentFiber._debugSource) {
        info.source = {
          fileName: componentFiber._debugSource.fileName,
          lineNumber: componentFiber._debugSource.lineNumber,
          columnNumber: componentFiber._debugSource.columnNumber
        }
      }
      
      return info
    } catch (error) {
      console.debug('[VibetorchInspector] Failed to extract React info:', error)
      return null
    }
  }
  
  /**
   * Sanitize props to avoid circular references
   */
  private sanitizeProps(props: any): Record<string, any> | undefined {
    if (!props) return undefined
    
    const sanitized: Record<string, any> = {}
    const seen = new WeakSet()
    
    const sanitize = (obj: any, depth = 0): any => {
      if (depth > 3) return '[Max Depth]'
      if (obj === null || obj === undefined) return obj
      if (typeof obj !== 'object') return obj
      if (seen.has(obj)) return '[Circular]'
      
      seen.add(obj)
      
      if (Array.isArray(obj)) {
        return obj.slice(0, 5).map(item => sanitize(item, depth + 1))
      }
      
      const result: Record<string, any> = {}
      const keys = Object.keys(obj).slice(0, 10)
      
      for (const key of keys) {
        // Skip functions and React internal props
        if (key.startsWith('_') || key.startsWith('$$')) continue
        if (typeof obj[key] === 'function') continue
        
        result[key] = sanitize(obj[key], depth + 1)
      }
      
      return result
    }
    
    try {
      return sanitize(props)
    } catch {
      return { error: 'Failed to sanitize props' }
    }
  }
  
  /**
   * Check if React is available in the current environment
   */
  isReactAvailable(): boolean {
    // Check for React DevTools hook
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      return true
    }
    
    // Check for React in global scope
    if (typeof window !== 'undefined' && (window as any).React) {
      return true
    }
    
    // Check for React Fiber in any DOM element
    const testElement = document.body.firstElementChild
    if (testElement) {
      const fiber = this.getFiberFromElement(testElement)
      return fiber !== null
    }
    
    return false
  }
}