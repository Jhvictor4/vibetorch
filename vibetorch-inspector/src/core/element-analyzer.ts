/**
 * Element analyzer for extracting comprehensive element information
 */

import type { ElementInfo, SemanticInfo, ComputedStyles, StructuralContext } from './types'
import { ReactBridge } from './react-bridge'

export class ElementAnalyzer {
  constructor(private reactBridge: ReactBridge) {}
  
  /**
   * Analyze a DOM element and extract all relevant information
   */
  analyze(element: Element): ElementInfo {
    const domRect = element.getBoundingClientRect()
    const attributes = this.getAttributes(element)

    // Get text content (first 100 chars for preview)
    const text = element.textContent?.trim().substring(0, 100) || ''

    // Get full inner text with line breaks (like Cursor)
    const innerText = (element as HTMLElement).innerText || element.textContent || ''

    // Get React component info
    const reactInfo = this.reactBridge.getComponentInfo(element)

    // Get semantic info
    const semanticInfo = this.getSemanticInfo(element)

    // Check for data-source attribute (added by build plugin)
    const dataSource = element.getAttribute('data-source') || undefined

    // Get computed styles
    const computedStyles = this.getComputedStyles(element)

    // Get structural context
    const structural = this.getStructuralContext(element)

    // Get full DOM path (like Cursor's PATH)
    const path = this.getDOMPath(element)

    // Properly extract rect values
    const rect = {
      x: domRect.x,
      y: domRect.y,
      width: domRect.width,
      height: domRect.height,
      top: domRect.top,
      right: domRect.right,
      bottom: domRect.bottom,
      left: domRect.left
    }

    return {
      tagName: element.tagName.toLowerCase(),
      xpath: this.getXPath(element),
      selector: this.getCSSSelector(element),
      text,
      innerText,
      path,
      attributes,
      rect,
      className: String(element.className || ''),
      id: element.id || '',
      react: reactInfo || undefined,
      semantic: semanticInfo,
      dataSource,
      computedStyles,
      structural
    }
  }
  
  /**
   * Get all attributes as object
   */
  private getAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {}
    
    for (const attr of Array.from(element.attributes)) {
      attributes[attr.name] = attr.value
    }
    
    return attributes
  }
  
  /**
   * Get semantic information from element
   */
  private getSemanticInfo(element: Element): SemanticInfo {
    const tagName = element.tagName
    
    const info: SemanticInfo = {}
    
    // Get various semantic attributes
    const ariaLabel = element.getAttribute('aria-label')
    const title = element.getAttribute('title')
    const placeholder = (element as HTMLInputElement).placeholder
    const role = element.getAttribute('role')
    const testId = element.getAttribute('data-testid')
    
    if (ariaLabel) info.ariaLabel = ariaLabel
    if (role) info.role = role
    if (testId) info.testId = testId
    
    // Determine label
    info.label = ariaLabel || title || placeholder || undefined
    
    // For interactive elements, get the action text
    if (['BUTTON', 'A'].includes(tagName)) {
      const actionText = element.textContent?.trim()
      if (actionText) {
        info.actionText = actionText
      }
    }
    
    // For inputs, get the value or placeholder
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      const value = (element as HTMLInputElement).value
      const inputType = (element as HTMLInputElement).type
      
      if (value) {
        info.actionText = `${inputType || 'text'}: ${value.substring(0, 50)}`
      } else if (placeholder) {
        info.actionText = `placeholder: ${placeholder}`
      }
    }
    
    return info
  }
  
  /**
   * Generate XPath for element
   */
  private getXPath(element: Element): string {
    // If element has ID, use it for shorter XPath
    if (element.id) {
      return `//*[@id="${element.id}"]`
    }
    
    const parts: string[] = []
    let current: Element | null = element
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1
      let sibling = current.previousElementSibling
      
      // Count position among siblings with same tag
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++
        }
        sibling = sibling.previousElementSibling
      }
      
      const tagName = current.tagName.toLowerCase()
      const part = index > 1 ? `${tagName}[${index}]` : tagName
      parts.unshift(part)
      
      current = current.parentElement
    }
    
    return '/' + parts.join('/')
  }
  
  /**
   * Generate CSS selector for element
   */
  private getCSSSelector(element: Element): string {
    // If element has ID, use it for shorter selector
    if (element.id) {
      return `#${element.id}`
    }
    
    const parts: string[] = []
    let current: Element | null = element
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()
      
      if (current.id) {
        selector = `#${current.id}`
        parts.unshift(selector)
        break
      } else if (current.className) {
        const classes = String(current.className).trim().split(/\s+/).filter(Boolean)
        if (classes.length > 0) {
          // Use only the first class to avoid overly specific selectors
          selector += `.${classes[0]}`
        }
      }
      
      // Add nth-child if needed for uniqueness
      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children)
        const sameTags = siblings.filter(s => s.tagName === current!.tagName)
        
        if (sameTags.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-child(${index})`
        }
      }
      
      parts.unshift(selector)
      current = current.parentElement
    }
    
    return parts.join(' > ')
  }

  /**
   * Get computed styles for LLM visual understanding
   */
  private getComputedStyles(element: Element): ComputedStyles {
    const computed = window.getComputedStyle(element)

    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      display: computed.display,
      position: computed.position,
      visibility: computed.visibility,
      opacity: computed.opacity,
      zIndex: computed.zIndex,
      overflow: computed.overflow
    }
  }

  /**
   * Get full DOM path with classes (like Cursor's PATH field)
   * Example: main.min-h-screen.bg-neutral-950 > div.absolute.inset-0 > div.card
   */
  private getDOMPath(element: Element): string {
    const parts: string[] = []
    let current: Element | null = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tagName = current.tagName.toLowerCase()
      const classes = current.className
        ? '.' + String(current.className).split(' ').filter(Boolean).join('.')
        : ''

      parts.unshift(tagName + classes)
      current = current.parentElement
    }

    return parts.join(' > ')
  }

  /**
   * Get structural context for element
   */
  private getStructuralContext(element: Element): StructuralContext {
    const parent = element.parentElement
    const depth = this.getElementDepth(element)
    const siblingCount = parent ? parent.children.length : 0

    return {
      parent: {
        tagName: parent?.tagName.toLowerCase() || '',
        className: String(parent?.className || ''),
        selector: parent ? this.getCSSSelector(parent) : ''
      },
      depth,
      siblingCount
    }
  }

  /**
   * Calculate DOM depth of element
   */
  private getElementDepth(element: Element): number {
    let depth = 0
    let current = element.parentElement

    while (current) {
      depth++
      current = current.parentElement
    }

    return depth
  }
}