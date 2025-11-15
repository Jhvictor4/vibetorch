/**
 * Core types for Vibetorch Inspector
 */

export interface ReactComponentInfo {
  componentName: string
  props?: Record<string, any>
  source?: {
    fileName: string
    lineNumber: number
    columnNumber: number
  }
  key?: string
  testId?: string
}

export interface SemanticInfo {
  label?: string
  role?: string
  testId?: string
  ariaLabel?: string
  actionText?: string
}

export interface ComputedStyles {
  color: string
  backgroundColor: string
  fontSize: string
  fontWeight: string
  fontFamily: string
  display: string
  position: string
  visibility: string
  opacity: string
  zIndex: string
  overflow: string
}

export interface StructuralContext {
  parent: {
    tagName: string
    className: string
    selector: string
  }
  depth: number
  siblingCount: number
}

export interface ElementInfo {
  tagName: string
  xpath: string
  selector: string
  text: string
  innerText: string  // Full inner text with line breaks
  path: string  // Full DOM path like Cursor
  attributes: Record<string, string>
  rect: DOMRect
  className: string
  id: string
  react?: ReactComponentInfo
  semantic?: SemanticInfo
  dataSource?: string  // Added by build plugin
  computedStyles?: ComputedStyles
  structural?: StructuralContext
}

export interface InspectorConfig {
  enabled?: boolean
  onElementSelected?: (info: ElementInfo) => void
  onElementRemoved?: (info: ElementInfo) => void
  onElementHovered?: (info: ElementInfo) => void
  enableShortcuts?: boolean
  shortcutKey?: string  // Default: 'cmd+shift+c' or 'ctrl+shift+c'
  theme?: 'light' | 'dark'
  targetOrigin?: string  // For postMessage security
  highlightColor?: string
  tooltipStyle?: Partial<CSSStyleDeclaration>
  isIframe?: boolean  // Flag to enable iframe postMessage communication
}

export interface MessageData {
  type: string
  data: any
  timestamp: number
}

export interface VibetorchMessage extends MessageData {
  type: `vibetorch:${string}`
}