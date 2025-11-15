/**
 * Core Inspector implementation
 */

import type { ElementInfo, InspectorConfig } from './types'
import { ReactBridge } from './react-bridge'
import { ElementAnalyzer } from './element-analyzer'
import { MessageBridge } from '../communication/postMessage'

export class VibetorchInspector {
  private config: InspectorConfig
  private overlay: HTMLDivElement | null = null
  private tooltip: HTMLDivElement | null = null
  private highlightBox: HTMLDivElement | null = null
  private isActive = false
  private selectedElement: Element | null = null
  private pinnedElements: Map<Element, HTMLDivElement> = new Map()
  private pinnedTooltips: Map<Element, HTMLDivElement> = new Map()
  private pinnedCounter = 0
  private messageBridge: MessageBridge
  private reactBridge: ReactBridge
  private elementAnalyzer: ElementAnalyzer
  private scrollThrottleTimer: number | null = null
  
  constructor(config: InspectorConfig = {}) {
    // Safely detect platform - default to ctrl+shift+c if not in browser
    const isMac = typeof navigator !== 'undefined' && navigator.platform ?
      navigator.platform.includes('Mac') : false

    this.config = {
      enabled: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
      enableShortcuts: true,
      shortcutKey: isMac ? 'cmd+shift+c' : 'ctrl+shift+c',
      theme: 'light',
      targetOrigin: '*',
      highlightColor: '#3b82f6',
      isIframe: false,
      ...config
    }
    
    this.messageBridge = new MessageBridge(this.config.targetOrigin)
    this.reactBridge = new ReactBridge()
    this.elementAnalyzer = new ElementAnalyzer(this.reactBridge)
    
    if (this.config.enabled) {
      this.init()
    }
  }
  
  private init() {
    this.createOverlayElements()

    if (this.config.enableShortcuts) {
      this.setupKeyboardShortcuts()
    }

    this.setupMessageListeners()

    // Auto-register global instance
    if (typeof window !== 'undefined') {
      window.__vibetorchInspector = this
    }
  }

  /**
   * Update callbacks without recreating the inspector
   * This allows React components to update their callbacks
   */
  updateCallbacks(callbacks: {
    onElementSelected?: (info: ElementInfo) => void
    onElementRemoved?: (info: ElementInfo) => void
    onElementHovered?: (info: ElementInfo) => void
  }) {
    if (callbacks.onElementSelected) {
      this.config.onElementSelected = callbacks.onElementSelected
    }
    if (callbacks.onElementRemoved) {
      this.config.onElementRemoved = callbacks.onElementRemoved
    }
    if (callbacks.onElementHovered) {
      this.config.onElementHovered = callbacks.onElementHovered
    }
  }
  
  private createOverlayElements() {
    // Don't recreate if already exists
    if (this.overlay) return

    // Main overlay container
    this.overlay = document.createElement('div')
    this.overlay.id = 'vibetorch-inspector-overlay'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `
    
    // Highlight box
    this.highlightBox = document.createElement('div')
    this.highlightBox.style.cssText = `
      position: absolute;
      background: ${this.config.highlightColor}15;
      border: 2px solid ${this.config.highlightColor};
      border-radius: 2px;
      pointer-events: none;
      transition: all 0.1s ease-out;
    `
    
    // Tooltip
    this.tooltip = document.createElement('div')
    this.tooltip.style.cssText = `
      position: absolute;
      background: ${this.config.theme === 'dark' ? '#1e293b' : '#334155'};
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 350px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 6px;
    `
    
    // Apply custom tooltip styles if provided
    if (this.config.tooltipStyle) {
      Object.assign(this.tooltip.style, this.config.tooltipStyle)
    }
    
    this.overlay.appendChild(this.highlightBox)
    this.overlay.appendChild(this.tooltip)
  }
  
  private setupKeyboardShortcuts() {
    const parseShortcut = (shortcut: string) => {
      const parts = shortcut.toLowerCase().split('+')
      return {
        ctrl: parts.includes('ctrl'),
        cmd: parts.includes('cmd'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt'),
        key: parts[parts.length - 1]
      }
    }
    
    const shortcut = parseShortcut(this.config.shortcutKey!)
    
    document.addEventListener('keydown', (e) => {
      const matchesShortcut = 
        e.key.toLowerCase() === shortcut.key &&
        e.ctrlKey === shortcut.ctrl &&
        e.metaKey === shortcut.cmd &&
        e.shiftKey === shortcut.shift &&
        e.altKey === shortcut.alt
      
      if (matchesShortcut) {
        e.preventDefault()
        this.toggle()
      }
      
      // ESC to cancel
      if (e.key === 'Escape' && this.isActive) {
        this.stop()
      }
    })
  }
  
  private setupMessageListeners() {
    // Only setup message listeners if in iframe mode
    if (!this.config.isIframe) return

    this.messageBridge.onMessage((message) => {
      switch (message.type) {
        case 'vibetorch:start-inspector':
          this.start()
          break
        case 'vibetorch:stop-inspector':
          this.stop()
          break
        case 'vibetorch:toggle-inspector':
          this.toggle()
          break
      }
    })
  }
  
  start() {
    if (this.isActive) return

    this.isActive = true

    // Add overlay to DOM
    if (this.overlay) {
      document.body.appendChild(this.overlay)
    }

    // Add event listeners - use capture phase for click to intercept before bubbling
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('click', this.handleClick, true) // capture phase
    document.addEventListener('scroll', this.handleScroll, true) // capture to catch all scroll events

    // Add mouseleave to clear overlay when cursor leaves window
    document.documentElement.addEventListener('mouseleave', this.handleMouseLeave)

    // Don't change cursor - keep normal pointer
    // document.body.style.cursor = 'crosshair'

    // Notify parent window only if in iframe mode
    if (this.config.isIframe) {
      this.messageBridge.sendToParent('inspector-started', { timestamp: Date.now() })
    }
  }
  
  stop() {
    if (!this.isActive) return

    this.isActive = false

    // Clear all pinned overlays
    this.clearAllPinnedOverlays()

    // Clear scroll throttle timer
    if (this.scrollThrottleTimer !== null) {
      clearTimeout(this.scrollThrottleTimer)
      this.scrollThrottleTimer = null
    }

    // Remove overlay from DOM
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }

    // Remove event listeners - must match how they were added (with capture flag)
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('click', this.handleClick, true) // capture phase
    document.removeEventListener('scroll', this.handleScroll, true) // capture phase
    document.documentElement.removeEventListener('mouseleave', this.handleMouseLeave)

    // No need to reset cursor since we didn't change it
    // document.body.style.cursor = ''

    this.selectedElement = null

    // Notify parent window only if in iframe mode
    if (this.config.isIframe) {
      this.messageBridge.sendToParent('inspector-stopped', { timestamp: Date.now() })
    }
  }
  
  toggle() {
    if (this.isActive) {
      this.stop()
    } else {
      this.start()
    }
  }
  
  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isActive) return

    // Check if mouse is over inspector UI before doing anything
    const target = e.target as Element
    if (this.isInspectorElement(target)) {
      // Clear selection when hovering over inspector UI
      this.selectedElement = null
      if (this.highlightBox) {
        this.highlightBox.style.display = 'none'
      }
      if (this.tooltip) {
        this.tooltip.style.display = 'none'
      }
      return
    }

    // Hide overlay temporarily to get actual element
    if (this.overlay) {
      this.overlay.style.pointerEvents = 'none'
      this.overlay.style.display = 'none'
    }

    const element = document.elementFromPoint(e.clientX, e.clientY)

    // Show overlay again
    if (this.overlay) {
      this.overlay.style.display = 'block'
    }

    // Double-check the element we found
    if (element && this.isInspectorElement(element)) {
      return
    }

    if (element && element !== this.selectedElement) {
      // Reset previous pinned element's orange highlight
      if (this.selectedElement && this.pinnedElements.has(this.selectedElement)) {
        const prevPinnedBox = this.pinnedElements.get(this.selectedElement)
        const prevPinnedTooltip = this.pinnedTooltips.get(this.selectedElement)
        if (prevPinnedBox) {
          prevPinnedBox.style.background = 'rgba(34, 197, 94, 0.1)'
          prevPinnedBox.style.borderColor = '#22c55e'
          const badge = prevPinnedBox.querySelector('.vibetorch-pinned-badge') as HTMLElement
          if (badge) {
            badge.style.background = '#22c55e'
          }
        }
        if (prevPinnedTooltip) {
          prevPinnedTooltip.style.background = '#16a34a'
        }
      }

      this.selectedElement = element
      this.highlightElement(element)

      // If hovering over a pinned element, change to orange (ready to remove)
      if (this.pinnedElements.has(element)) {
        const pinnedBox = this.pinnedElements.get(element)
        const pinnedTooltip = this.pinnedTooltips.get(element)
        if (pinnedBox) {
          pinnedBox.style.background = 'rgba(251, 146, 60, 0.1)'
          pinnedBox.style.borderColor = '#fb923c'
          const badge = pinnedBox.querySelector('.vibetorch-pinned-badge') as HTMLElement
          if (badge) {
            badge.style.background = '#fb923c'
          }
        }
        if (pinnedTooltip) {
          pinnedTooltip.style.background = '#ea580c'
        }
      }

      // Trigger hover callback
      if (this.config.onElementHovered) {
        const info = this.elementAnalyzer.analyze(element)
        this.config.onElementHovered(info)
      }
    }
  }

  private handleMouseLeave = () => {
    // Clear hover overlay when mouse leaves the window
    this.clearHoverOverlay()
  }

  private handleScroll = () => {
    // Throttle scroll updates to improve performance (100ms)
    if (this.scrollThrottleTimer !== null) {
      return // Skip if already scheduled
    }

    this.scrollThrottleTimer = window.setTimeout(() => {
      this.updatePinnedOverlayPositions()
      this.scrollThrottleTimer = null
    }, 100) // 100ms throttle - smooth enough while maintaining 60fps
  }

  private updatePinnedOverlayPositions() {
    // Update all pinned overlays to match current element positions
    this.pinnedElements.forEach((pinnedBox, element) => {
      const rect = element.getBoundingClientRect()

      // Update box position
      pinnedBox.style.left = `${rect.left}px`
      pinnedBox.style.top = `${rect.top}px`
      pinnedBox.style.width = `${rect.width}px`
      pinnedBox.style.height = `${rect.height}px`

      // Update tooltip position
      const pinnedTooltip = this.pinnedTooltips.get(element)
      if (pinnedTooltip) {
        pinnedTooltip.style.left = `${rect.left}px`
        pinnedTooltip.style.top = `${rect.top - 30}px`
      }
    })
  }

  private clearHoverOverlay() {
    // Only clear the hover overlay, not pinned ones
    if (this.highlightBox) {
      this.highlightBox.style.display = 'none'
    }
    if (this.tooltip) {
      this.tooltip.style.display = 'none'
    }
    this.selectedElement = null
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.isActive) return

    // Check event target first
    const clickTarget = e.target as Element
    if (this.isInspectorElement(clickTarget)) {
      // Inspector UI clicked - allow normal behavior
      return  // Don't prevent events on inspector UI
    }

    // Block all propagation immediately
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation() // Stop all other handlers on this element

    // Also check the selected element
    if (this.selectedElement && this.isInspectorElement(this.selectedElement)) {
      return
    }

    if (this.selectedElement) {
      // Toggle pinned overlay for this element
      if (this.pinnedElements.has(this.selectedElement)) {
        // Element is already pinned - remove it
        this.removePinnedOverlay(this.selectedElement)
        // removePinnedOverlay will call onElementRemoved internally
      } else {
        // Element is not pinned - add it
        this.createPinnedOverlay(this.selectedElement)

        const info = this.elementAnalyzer.analyze(this.selectedElement)

        // Call local callback only when adding
        if (this.config.onElementSelected) {
          this.config.onElementSelected(info)
        }

        // Send iframe message: selected (single element)
        if (this.config.isIframe) {
          this.messageBridge.sendToParent('selected', info)
        }
      }

      // Don't stop - allow multiple selections
      // User can press ESC or click button to stop
    }
  }
  
  private highlightElement(element: Element) {
    if (!this.highlightBox || !this.tooltip) return

    const rect = element.getBoundingClientRect()

    // Ensure highlight elements are visible
    this.highlightBox.style.display = 'block'
    this.tooltip.style.display = 'block'

    // Update highlight box position - use viewport coordinates directly (no scroll offset)
    // Parent is position:fixed, so children should use viewport-relative coordinates
    this.highlightBox.style.left = `${rect.left}px`
    this.highlightBox.style.top = `${rect.top}px`
    this.highlightBox.style.width = `${rect.width}px`
    this.highlightBox.style.height = `${rect.height}px`

    // Get element info for tooltip
    const info = this.elementAnalyzer.analyze(element)

    // Update tooltip content
    let tooltipContent = ''

    if (info.react?.componentName) {
      tooltipContent = `${info.react.componentName}`
      if (info.react.source) {
        const fileName = info.react.source.fileName.split('/').pop()
        tooltipContent += ` <span style="opacity: 0.7; font-size: 11px">${fileName}:${info.react.source.lineNumber}</span>`
      }
    } else if (info.dataSource) {
      // Use data-source attribute if available
      const [file, line] = info.dataSource.split(':')
      const fileName = file.split('/').pop()
      tooltipContent = `${fileName}:${line}`
    } else {
      // Fallback to tag info
      const tagName = element.tagName.toLowerCase()
      const id = element.id ? `#${element.id}` : ''
      const className = element.className ?
        `.${String(element.className).split(' ').filter(Boolean)[0]}` : ''

      tooltipContent = `&lt;${tagName}${id}${className}&gt;`
    }

    this.tooltip.innerHTML = tooltipContent

    // Position tooltip - use viewport coordinates (no scroll offset)
    let tooltipX = rect.left
    let tooltipY = rect.top - 40

    // Adjust if tooltip goes off screen
    if (tooltipY < 10) {
      tooltipY = rect.bottom + 10
    }

    if (tooltipX + 200 > window.innerWidth) {
      tooltipX = window.innerWidth - 200
    }

    this.tooltip.style.left = `${tooltipX}px`
    this.tooltip.style.top = `${tooltipY}px`
  }
  
  /**
   * Create a pinned overlay for an element
   */
  private createPinnedOverlay(element: Element) {
    if (!this.overlay) return

    this.pinnedCounter++
    const rect = element.getBoundingClientRect()

    // Create pinned box with green color - use viewport coordinates (no scroll offset)
    const pinnedBox = document.createElement('div')
    pinnedBox.style.cssText = `
      position: absolute;
      background: rgba(34, 197, 94, 0.1);
      border: 2px solid #22c55e;
      border-radius: 2px;
      pointer-events: none;
      z-index: 999998;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      transition: all 0.2s ease;
    `

    // Add number badge with green color
    const badge = document.createElement('div')
    badge.className = 'vibetorch-pinned-badge'
    badge.style.cssText = `
      position: absolute;
      top: -10px;
      left: -10px;
      background: #22c55e;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      font-family: system-ui, -apple-system, sans-serif;
    `
    badge.textContent = String(this.pinnedCounter)
    pinnedBox.appendChild(badge)

    // Create pinned tooltip
    const pinnedTooltip = document.createElement('div')
    const info = this.elementAnalyzer.analyze(element)

    let tooltipContent = ''
    if (info.react?.componentName) {
      tooltipContent = `${info.react.componentName}`
      if (info.react.source) {
        const fileName = info.react.source.fileName.split('/').pop()
        tooltipContent += ` <span style="opacity: 0.7; font-size: 11px">${fileName}:${info.react.source.lineNumber}</span>`
      }
    } else {
      const tagName = element.tagName.toLowerCase()
      const id = element.id ? `#${element.id}` : ''
      const className = element.className ?
        `.${String(element.className).split(' ').filter(Boolean)[0]}` : ''
      tooltipContent = `&lt;${tagName}${id}${className}&gt;`
    }

    pinnedTooltip.innerHTML = `#${this.pinnedCounter} - ${tooltipContent}`
    pinnedTooltip.style.cssText = `
      position: absolute;
      background: #16a34a;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      left: ${rect.left}px;
      top: ${rect.top - 30}px;
      z-index: 999998;
      transition: background 0.2s ease;
    `

    // Add to overlay and map
    this.overlay.appendChild(pinnedBox)
    this.overlay.appendChild(pinnedTooltip)
    this.pinnedElements.set(element, pinnedBox)
    this.pinnedTooltips.set(element, pinnedTooltip)
  }

  /**
   * Remove a pinned overlay for an element
   */
  private removePinnedOverlay(element: Element) {
    const pinnedBox = this.pinnedElements.get(element)
    const pinnedTooltip = this.pinnedTooltips.get(element)

    if (pinnedBox && pinnedBox.parentNode) {
      pinnedBox.parentNode.removeChild(pinnedBox)
    }
    if (pinnedTooltip && pinnedTooltip.parentNode) {
      pinnedTooltip.parentNode.removeChild(pinnedTooltip)
    }

    this.pinnedElements.delete(element)
    this.pinnedTooltips.delete(element)

    // Notify about removal
    if (this.config.onElementRemoved) {
      const info = this.elementAnalyzer.analyze(element)
      this.config.onElementRemoved(info)
    }

    // Send iframe message: unselected (single element)
    if (this.config.isIframe) {
      const info = this.elementAnalyzer.analyze(element)
      this.messageBridge.sendToParent('unselected', info)
    }
  }

  /**
   * Clear all pinned overlays
   */
  private clearAllPinnedOverlays() {
    this.pinnedElements.forEach((box, element) => {
      if (box.parentNode) {
        box.parentNode.removeChild(box)
      }
    })
    this.pinnedTooltips.forEach((tooltip, element) => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip)
      }
    })
    this.pinnedElements.clear()
    this.pinnedTooltips.clear()
    this.pinnedCounter = 0
  }

  // Public method to force cleanup all overlays
  cleanup() {
    this.clearHoverOverlay()
    this.clearAllPinnedOverlays()
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
  }

  /**
   * Public method to remove a specific element's overlay
   * Used when removing from dropdown
   */
  removeElementOverlay(elementInfo: ElementInfo) {
    // Find the element that matches the info
    let elementToRemove: Element | null = null

    this.pinnedElements.forEach((overlay, element) => {
      const info = this.elementAnalyzer.analyze(element)
      // Match by xpath or selector + text
      if (info.xpath === elementInfo.xpath ||
          (info.selector === elementInfo.selector && info.text === elementInfo.text)) {
        elementToRemove = element
      }
    })

    if (elementToRemove) {
      // Remove overlay directly without calling the callback (to avoid loop)
      const pinnedBox = this.pinnedElements.get(elementToRemove)
      const pinnedTooltip = this.pinnedTooltips.get(elementToRemove)

      if (pinnedBox && pinnedBox.parentNode) {
        pinnedBox.parentNode.removeChild(pinnedBox)
      }
      if (pinnedTooltip && pinnedTooltip.parentNode) {
        pinnedTooltip.parentNode.removeChild(pinnedTooltip)
      }

      this.pinnedElements.delete(elementToRemove)
      this.pinnedTooltips.delete(elementToRemove)
      // Don't call onElementRemoved here - dropdown already knows
    }
  }

  /**
   * Check if inspector is active
   */
  isInspecting(): boolean {
    return this.isActive
  }
  
  /**
   * Check if element is part of VibetorchInspector UI
   */
  private isInspectorElement(element: Element): boolean {
    // Check if element or any parent has inspector attributes
    let current: Element | null = element
    while (current) {
      // Check for inspector-specific identifiers
      const className = (current as HTMLElement).className
      const classStr = typeof className === 'string' ? className : ''

      if (current.id === 'vibetorch-inspector-root' ||
          current.id === 'vibetorch-inspector-overlay' ||
          current.hasAttribute('data-vibetorch-ignore') ||
          classStr.includes('vibetorch-inspector')) {
        return true
      }

      // Also check inline styles that indicate inspector UI
      const style = (current as HTMLElement).style
      if (style && style.zIndex === '999999') {
        return true
      }

      current = current.parentElement
    }
    return false
  }

  /**
   * Manually analyze an element
   */
  analyzeElement(element: Element): ElementInfo {
    return this.elementAnalyzer.analyze(element)
  }
}