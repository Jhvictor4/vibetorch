'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { ElementInfo } from '../core/types'
import { VibetorchInspector as InspectorCore } from '../core/inspector'
import faviconUrl from '../assets/favicon.ico'

// Singleton inspector instance
let inspectorInstance: InspectorCore | null = null

export function VibetorchInspector() {
  const [isMounted, setIsMounted] = useState(false)
  const [isInspecting, setIsInspecting] = useState(false)
  const [selectedElements, setSelectedElements] = useState<ElementInfo[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  // Auto-detect if running in iframe
  const [isIframe, setIsIframe] = useState(false)

  // Export via clipboard setting (with localStorage)
  const [exportViaClipboard, setExportViaClipboard] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('vibetorch-export-clipboard')
    return saved !== null ? saved === 'true' : true
  })
  const [showSettings, setShowSettings] = useState(false)

  // Keyboard shortcuts setting (with localStorage)
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('vibetorch-keyboard-shortcuts')
    return saved !== null ? saved === 'true' : true
  })

  // Custom keybindings (with localStorage)
  const [toggleKey, setToggleKey] = useState(() => {
    if (typeof window === 'undefined') return 'Alt'
    const saved = localStorage.getItem('vibetorch-toggle-key')
    // Validate saved value - should contain 'Alt' for primary toggle
    if (saved && (saved === 'Alt' || saved.includes('Alt'))) {
      return saved
    }
    return 'Alt'
  })
  const [secondaryToggleKey, setSecondaryToggleKey] = useState(() => {
    if (typeof window === 'undefined') return 'Cmd+Shift+C'
    const saved = localStorage.getItem('vibetorch-secondary-toggle-key')
    // Validate saved value - should be a valid key combination
    if (saved && saved.length > 0 && saved !== 'undefined') {
      return saved
    }
    return 'Cmd+Shift+C'
  })

  const [isEditingToggleKey, setIsEditingToggleKey] = useState(false)
  const [isEditingSecondaryKey, setIsEditingSecondaryKey] = useState(false)

  // Handle key recording
  const handleKeyRecord = useCallback((e: React.KeyboardEvent, isSecondary: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    const parts: string[] = []
    if (e.metaKey) parts.push('Cmd')
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey && e.key !== 'Alt') parts.push('Alt')

    // Add the main key
    if (e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt') {
      parts.push(e.key.toUpperCase())
    } else if (e.key === 'Alt') {
      parts.push('Alt')
    }

    if (parts.length > 0) {
      const binding = parts.join('+')
      if (isSecondary) {
        setSecondaryToggleKey(binding)
        setIsEditingSecondaryKey(false)
      } else {
        setToggleKey(binding)
        setIsEditingToggleKey(false)
      }
    }
  }, [])

  // Save to localStorage when settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibetorch-export-clipboard', String(exportViaClipboard))
    }
  }, [exportViaClipboard])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibetorch-keyboard-shortcuts', String(keyboardShortcutsEnabled))
    }
  }, [keyboardShortcutsEnabled])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibetorch-toggle-key', toggleKey)
    }
  }, [toggleKey])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibetorch-secondary-toggle-key', secondaryToggleKey)
    }
  }, [secondaryToggleKey])

  // Helper function to show toast messages
  const showToastMessage = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000) // 3 seconds for better readability
  }, [])

  // Initialize after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true)
    // Detect iframe on client side
    setIsIframe(window.self !== window.top)
    // Update exportViaClipboard based on iframe detection
    setExportViaClipboard(window.self === window.top)
    return () => {
      setIsMounted(false)
    }
  }, [])

  // Define stopInspector before the useEffect that uses it
  const stopInspector = useCallback(() => {
    if (inspectorInstance?.isInspecting()) {
      inspectorInstance.stop()
      setIsInspecting(false)
    }
  }, [])

  const toggleInspector = useCallback(() => {
    // Create instance if it doesn't exist yet
    if (!inspectorInstance) {
      inspectorInstance = new InspectorCore({
        enabled: true,
        enableShortcuts: false,
        isIframe: isIframe,
        onElementSelected: (_info) => {
          // Will be updated via updateCallbacks
        },
        onElementRemoved: (_info) => {
          // Will be updated via updateCallbacks
        },
        onElementHovered: (_info) => {
          // Optional hover handling
        }
      })
    }

    const currentlyInspecting = inspectorInstance.isInspecting()

    if (currentlyInspecting) {
      // Turn OFF: stop selection mode and hide dropdown
      inspectorInstance.stop()
      setIsInspecting(false)
      setShowDropdown(false)
    } else {
      // Turn ON: start selection mode and show dropdown if items exist
      inspectorInstance.start()
      setIsInspecting(true)

      // Check selected elements by accessing state directly in the handler
      setSelectedElements((currentElements) => {
        if (currentElements.length > 0) {
          setShowDropdown(true)
        }
        return currentElements // Return unchanged
      })
    }
  }, [isIframe])

  // Create refs to hold the current functions
  const toggleInspectorRef = useRef(toggleInspector)
  toggleInspectorRef.current = toggleInspector

  const stopInspectorRef = useRef(stopInspector)
  stopInspectorRef.current = stopInspector

  // Create ref for selected elements to use in keyboard handler
  const selectedElementsRef = useRef(selectedElements)
  selectedElementsRef.current = selectedElements

  useEffect(() => {
    if (!isMounted) return

    // Create singleton instance if not exists
    if (!inspectorInstance) {
      inspectorInstance = new InspectorCore({
        enabled: true,
        enableShortcuts: false,
        isIframe: isIframe,
        onElementSelected: (_info) => {
          // Will be updated via updateCallbacks
        },
        onElementRemoved: (_info) => {
          // Will be updated via updateCallbacks
        },
        onElementHovered: (_info) => {
          // Optional hover handling
        }
      })
    }

    // Helper to send iframe messages
    const sendIframeMessage = (type: string, data?: any) => {
      if (isIframe && inspectorInstance) {
        const messageBridge = (inspectorInstance as any).messageBridge
        if (messageBridge) {
          messageBridge.sendToParent(type, data || {})
        }
      }
    }

    // Update callbacks for this component instance
    if (inspectorInstance && 'updateCallbacks' in inspectorInstance) {
      (inspectorInstance as any).updateCallbacks({
        onElementSelected: (info: ElementInfo) => {
          setSelectedElements(prev => {
            // Check if element already exists (by xpath or selector + text)
            const exists = prev.some(el =>
              el.xpath === info.xpath ||
              (el.selector === info.selector && el.text === info.text)
            )

            // Don't add duplicates
            if (exists) {
              return prev
            }

            const newElements = [...prev, info]

            // Show dropdown when elements are added
            if (newElements.length > 0) {
              setShowDropdown(true)
              // Focus dropdown after a short delay to ensure it's rendered
              setTimeout(() => {
                if (dropdownRef.current) {
                  dropdownRef.current.focus()
                }
              }, 100)
            }
            return newElements
          })
          // Don't stop inspector - allow multiple selections
        },
        onElementRemoved: (info: ElementInfo) => {
          setSelectedElements(prev => {
            // Remove element by matching xpath or selector + text
            const newElements = prev.filter(el =>
              el.xpath !== info.xpath &&
              !(el.selector === info.selector && el.text === info.text)
            )

            // Hide dropdown if no elements left
            if (newElements.length === 0) {
              setShowDropdown(false)
            }

            return newElements
          })
        },
        onElementHovered: (_info: ElementInfo) => {
          // Optional hover handling
        }
      })
    }

    // Helper to match key combination
    const matchesKeybinding = (e: KeyboardEvent, binding: string): boolean => {
      const parts = binding.toLowerCase().split('+').map(p => p.trim())
      const key = parts[parts.length - 1]
      const modifiers = parts.slice(0, -1)

      // Special case: single Alt/Option key
      if ((key === 'alt' || key === 'option') && modifiers.length === 0) {
        return (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') &&
               !e.metaKey && !e.ctrlKey && !e.shiftKey
      }

      // Check modifiers
      const hasCmd = modifiers.includes('cmd') || modifiers.includes('meta')
      const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('control')
      const hasShift = modifiers.includes('shift')
      const hasAlt = modifiers.includes('alt') || modifiers.includes('option')

      // Match key (handle special cases)
      let keyMatches = false
      if (key === 'alt' || key === 'option') {
        keyMatches = e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight'
      } else {
        keyMatches = e.key.toLowerCase() === key
      }

      // Match modifiers
      const modifiersMatch =
        e.metaKey === hasCmd &&
        e.ctrlKey === hasCtrl &&
        e.shiftKey === hasShift &&
        e.altKey === hasAlt

      return keyMatches && modifiersMatch
    }

    // Keyboard event handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip auto-repeat events
      if (e.repeat) {
        return
      }

      // Check if keyboard shortcuts are disabled
      if (!keyboardShortcutsEnabled) {
        return
      }

      // Check primary toggle key
      if (matchesKeybinding(e, toggleKey)) {
        e.preventDefault()
        toggleInspectorRef.current()
      }
      // Check secondary toggle key
      else if (matchesKeybinding(e, secondaryToggleKey)) {
        e.preventDefault()
        toggleInspectorRef.current()
      }
      // ESC to cancel
      else if (e.key === 'Escape' && inspectorInstance?.isInspecting()) {
        stopInspectorRef.current()
      }
      // Enter to export and clear selection
      else if (e.key === 'Enter' && selectedElementsRef.current.length > 0) {
        e.preventDefault()
        // Export is async, errors are handled inside exportToClipboard
        exportToClipboardRef.current()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Additional Option/Alt key detection on keyup as fallback
      if (!e.repeat && (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight')) {
        // Handle Alt key release if needed
      }
    }

    // Add keyboard listeners with capture phase to ensure we receive events first
    // This prevents other event listeners from blocking our shortcuts
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)

    // Clean up overlays when tab becomes hidden or on navigation
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop inspector and clear everything when tab is hidden
        stopInspectorRef.current()
        setSelectedElements([])
        setShowDropdown(false)
      }
    }

    // Clean up on page unload/navigation
    const handleBeforeUnload = () => {
      if (inspectorInstance) {
        inspectorInstance.stop()
        // Force cleanup all overlays
        if ('cleanup' in inspectorInstance) {
          (inspectorInstance as any).cleanup()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      // Remove event listeners (must match capture phase used in addEventListener)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Clean up inspector on unmount
      if (inspectorInstance) {
        inspectorInstance.stop()
        // Force cleanup all overlays
        if ('cleanup' in inspectorInstance) {
          (inspectorInstance as any).cleanup()
        }
      }
    }
  }, [isMounted, isIframe, keyboardShortcutsEnabled, toggleKey, secondaryToggleKey]) // Include all keybinding deps

  // Modified to use clipboard format for cross-origin communication
  const exportToClipboard = useCallback(async () => {
    if (!selectedElements || selectedElements.length === 0) {
      return
    }

    // Create the clipboard data in a special format
    const clipboardData = {
      type: 'vibetorch:selection',
      context: {
        url: window.location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      elements: selectedElements.map((el, index) => {
        // Filter important attributes only
        const importantAttrs: Record<string, string> = {}
        if (el.attributes.class) importantAttrs.class = el.attributes.class
        if (el.attributes.id) importantAttrs.id = el.attributes.id
        if (el.attributes.role) importantAttrs.role = el.attributes.role
        if (el.attributes['aria-label']) importantAttrs['aria-label'] = el.attributes['aria-label']
        if (el.attributes['data-testid']) importantAttrs['data-testid'] = el.attributes['data-testid']
        if (el.attributes.placeholder) importantAttrs.placeholder = el.attributes.placeholder
        if (el.attributes.type) importantAttrs.type = el.attributes.type

        return {
          index: index + 1,
          tagName: el.tagName,
          selector: el.selector,
          path: el.path, // Full DOM path like Cursor
          text: el.text?.substring(0, 100),
          innerText: el.innerText, // Full text with line breaks like Cursor

          // All important attributes
          attributes: Object.keys(importantAttrs).length > 0 ? importantAttrs : undefined,

          // Full rect info (like Cursor's POSITION & SIZE)
          rect: {
            top: el.rect.top,
            left: el.rect.left,
            width: el.rect.width,
            height: el.rect.height,
            x: el.rect.x,
            y: el.rect.y
          },

          // Enhanced computed styles (like Cursor)
          computedStyles: el.computedStyles ? {
            color: el.computedStyles.color,
            backgroundColor: el.computedStyles.backgroundColor,
            fontSize: el.computedStyles.fontSize,
            fontFamily: el.computedStyles.fontFamily,
            fontWeight: el.computedStyles.fontWeight,
            display: el.computedStyles.display,
            position: el.computedStyles.position,
            visibility: el.computedStyles.visibility,
            opacity: el.computedStyles.opacity
          } : undefined,

          // Structural parent info
          parent: el.structural ? {
            tag: el.structural.parent.tagName,
            class: el.structural.parent.className?.split(' ').filter(Boolean)[0],
            depth: el.structural.depth
          } : undefined,

          // Semantic info
          semantic: (el.semantic?.role || el.semantic?.ariaLabel || el.semantic?.label) ? {
            role: el.semantic.role,
            label: el.semantic.ariaLabel || el.semantic.label
          } : undefined,

          // React component info with props (like Cursor)
          react: el.react ? {
            component: el.react.componentName,
            props: el.react.props, // Include props like Cursor
            file: el.react.source?.fileName.split('/').pop(),
            line: el.react.source?.lineNumber
          } : undefined
        }
      }),
      timestamp: Date.now()
    }

    const jsonText = JSON.stringify(clipboardData, null, 2)
    let clipboardSuccess = false

    try {
      // Use simple writeText API instead of write() with ClipboardItem
      // ClipboardItem only supports limited MIME types (text/plain, text/html, image/png)
      // application/json is NOT supported

      if (exportViaClipboard) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonText)
          clipboardSuccess = true
        } else {
          // This shouldn't happen in modern browsers, but keep as fallback
          throw new Error('Clipboard API not available')
        }
      } else {
        // Skip clipboard export, just mark as success
        clipboardSuccess = true
      }
    } catch (clipboardError) {
      // Clipboard failed - use textarea fallback immediately
      if (process.env.NODE_ENV === 'development') {
        console.warn('[VibeTorch] Clipboard API failed, using textarea fallback:', clipboardError)
      }

      try {
        const textarea = document.createElement('textarea')
        textarea.value = jsonText
        textarea.style.position = 'fixed'
        textarea.style.top = '-9999px'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()

        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (success) {
          clipboardSuccess = true
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('[VibeTorch] execCommand copy failed')
          }
        }
      } catch (fallbackError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[VibeTorch] Fallback copy also failed:', fallbackError)
        }
      }
    }

    // Only proceed with success UI if clipboard or fallback succeeded
    if (clipboardSuccess) {

      // Show all copied indicators
      selectedElements.forEach((_, index) => {
        setCopiedIndex(index)
      })

      // Show success toast based on export mode
      const message = exportViaClipboard
        ? `${selectedElements.length} ${selectedElements.length === 1 ? 'element' : 'elements'} exported to clipboard!`
        : `${selectedElements.length} ${selectedElements.length === 1 ? 'element' : 'elements'} exported!`
      showToastMessage(message, 'success')

      // Reset all after delay
      setTimeout(() => {
        setCopiedIndex(null)
      }, 2000)

      // Send iframe message: selection (export data)
      if (isIframe && window.parent !== window && inspectorInstance) {
        const messageBridge = (inspectorInstance as any).messageBridge
        if (messageBridge) {
          messageBridge.sendToParent('selection', clipboardData)
        }
      }

      // Clear selection and close dropdown after successful export
      setSelectedElements([])
      setShowDropdown(false)

      // Stop inspector if it's active
      if (inspectorInstance?.isInspecting()) {
        inspectorInstance.stop()
        setIsInspecting(false)
      }
    } else {
      // Both clipboard API and fallback failed - show error
      if (process.env.NODE_ENV === 'development') {
        console.error('[VibeTorch] All clipboard copy methods failed')
      }
      showToastMessage('Failed to copy. Please try again or use the Copy button.', 'error')
    }
  }, [selectedElements, isIframe, exportViaClipboard, showToastMessage])

  // Create a ref for exportToClipboard to use in keyboard handler
  const exportToClipboardRef = useRef(exportToClipboard)
  exportToClipboardRef.current = exportToClipboard

  const removeElement = useCallback((index: number) => {
    setSelectedElements(prev => {
      const newElements = prev.filter((_, i) => i !== index)

      // Hide dropdown if no elements left
      if (newElements.length === 0) {
        setShowDropdown(false)
      }

      return newElements
    })
  }, [])

  const clearAllElements = useCallback(() => {
    setSelectedElements([])
    setShowDropdown(false)

    // Stop inspector if it's active
    if (inspectorInstance?.isInspecting()) {
      inspectorInstance.stop()
      setIsInspecting(false)
    }
  }, [])

  // Effect to handle dropdown visibility when elements change
  useEffect(() => {
    if (selectedElements.length === 0) {
      setShowDropdown(false)
    }
  }, [selectedElements])

  // Explicitly hide dropdown when not inspecting
  useEffect(() => {
    if (!isInspecting) {
      setShowDropdown(false)
    }
  }, [isInspecting])

  if (!isMounted) {
    return null
  }

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes vibetorchPulse {
          0%, 100% {
            box-shadow: 0 4px 16px rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 0 4px 20px rgba(255, 255, 255, 0.4);
          }
        }

        @keyframes vibetorchRipple {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes vibetorchToastSlide {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes vibetorchSettingsFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Settings Modal */}
      {showSettings && (
        <div
          data-vibetorch-ignore="true"
          style={{
            position: 'fixed',
            bottom: '60px',
            right: '20px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '16px',
            zIndex: 2147483646,
            minWidth: '200px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13px',
            color: '#e0e0e0',
            animation: 'vibetorchSettingsFadeIn 0.2s ease-out',
            colorScheme: 'dark'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #444'
          }}>
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: '#fff'
            }}>
              Settings
            </span>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                lineHeight: 1,
                colorScheme: 'dark'
              }}
              title="Close"
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Export via clipboard toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#262626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}>
              <input
                type="checkbox"
                checked={exportViaClipboard}
                onChange={(e) => setExportViaClipboard(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Export via clipboard</span>
            </label>

            {/* Keyboard shortcuts toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#262626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}>
              <input
                type="checkbox"
                checked={keyboardShortcutsEnabled}
                onChange={(e) => setKeyboardShortcutsEnabled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Use keyboard shortcuts</span>
              </div>
            </label>

            {/* Keybinding settings - only show when shortcuts are enabled */}
            {keyboardShortcutsEnabled && (
              <div style={{
                marginLeft: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingLeft: '12px',
                borderLeft: '2px solid #333'
              }}>
                {/* Primary toggle key */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>Primary toggle:</span>
                  <input
                    type="text"
                    value={isEditingToggleKey ? 'Press any key...' : toggleKey}
                    readOnly
                    onFocus={() => setIsEditingToggleKey(true)}
                    onBlur={() => setIsEditingToggleKey(false)}
                    onKeyDown={(e) => handleKeyRecord(e, false)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#262626',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* Secondary toggle key */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>Secondary toggle:</span>
                  <input
                    type="text"
                    value={isEditingSecondaryKey ? 'Press any key...' : secondaryToggleKey}
                    readOnly
                    onFocus={() => setIsEditingSecondaryKey(true)}
                    onBlur={() => setIsEditingSecondaryKey(false)}
                    onKeyDown={(e) => handleKeyRecord(e, true)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#262626',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <span style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                  ESC and Enter are always enabled
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button Container - Always visible */}
      <div
        data-vibetorch-ignore="true"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          zIndex: 2147483647
        }}
      >
        {/* Settings Button - Only show when inspecting */}
        {isInspecting && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '2px solid rgba(180, 180, 180, 0.6)',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '20px',
              color: '#fff',
              padding: '0',
              lineHeight: '1',
              backdropFilter: 'blur(10px)',
              colorScheme: 'dark'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
            }}
          >
            ⛭
          </button>
        )}

        {/* Circular Floating Button */}
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            padding: isInspecting ? '2px' : '0',
            background: isInspecting
              ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.15))'
              : 'transparent'
          }}
        >
          <button
            onClick={toggleInspector}
            title="Toggle Inspector (Click, Option/Alt, or Cmd+Shift+C)"
            className="vibetorch-inspector-button"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: isInspecting
                ? 'rgba(0, 0, 0, 0.85)'
                : 'rgba(0, 0, 0, 0.8)',
              border: isInspecting
                ? '2px solid rgba(200, 200, 200, 0.7)'
                : '2px solid rgba(180, 180, 180, 0.6)',
              cursor: 'pointer',
              boxShadow: isInspecting
                ? '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(200, 200, 200, 0.2)'
                : '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isInspecting ? 'scale(1.05)' : 'scale(1)',
              overflow: 'hidden',
              animation: isInspecting ? 'vibetorchPulse 2s ease-in-out infinite' : 'none',
              position: 'relative',
              padding: '0',
              lineHeight: '1',
              backdropFilter: 'blur(10px)',
              colorScheme: 'dark'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = isInspecting ? 'scale(1.05)' : 'scale(1)'
              e.currentTarget.style.background = isInspecting
                ? 'rgba(0, 0, 0, 0.85)'
                : 'rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Logo/Icon */}
            <img
              src={faviconUrl}
              alt="Inspector"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                borderRadius: '50%'
              }}
            />

            {/* Ripple Effect */}
            {isInspecting && (
              <>
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.7)',
                  animation: 'vibetorchRipple 1.5s infinite',
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  animation: 'vibetorchRipple 1.5s infinite 0.5s',
                  pointerEvents: 'none'
                }} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown for displaying selected elements - only show when there are elements */}
      {showDropdown && selectedElements.length > 0 && (
        <div
          ref={dropdownRef}
          className="vibetorch-inspector-dropdown"
          data-vibetorch-ignore="true"
          tabIndex={-1}
          style={{
            position: 'fixed',
            bottom: '60px',  // Move up to not overlap with floating button
            right: '20px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 2147483646,
            width: '270px',
            maxHeight: '180px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13px',
            color: '#e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            colorScheme: 'dark'
          }}
        >
          {/* Header with logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #444'
          }}>
            <img
              src={faviconUrl}
              alt="Vibetorch"
              style={{
                width: '20px',
                height: '20px',
                marginRight: '8px',
                objectFit: 'cover',
                borderRadius: '4px'
              }}
            />
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: '#fff'
            }}>
              Selected Elements ({selectedElements.length})
            </span>
            <button
              onClick={clearAllElements}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                lineHeight: 1,
                colorScheme: 'dark'
              }}
              title="Clear all"
            >
              ×
            </button>
          </div>

          {/* List of selected elements */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            marginBottom: '12px',
            minHeight: '0'
          }}>
            {selectedElements.map((el, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  marginBottom: '8px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '4px',
                  border: '1px solid #3a3a3a',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333'
                  e.currentTarget.style.borderColor = '#4a4a4a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a'
                  e.currentTarget.style.borderColor = '#3a3a3a'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ flex: 1, marginRight: '8px' }}>
                    <div style={{
                      fontFamily: 'Monaco, Consolas, monospace',
                      fontSize: '11px',
                      color: '#88c999',
                      marginBottom: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {el.selector}
                    </div>
                    {el.text && (
                      <div style={{
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {el.text.substring(0, 50)}
                        {el.text.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeElement(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '2px 6px',
                      lineHeight: 1,
                      transition: 'color 0.2s',
                      colorScheme: 'dark'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff6b6b'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#666'
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={exportToClipboard}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: copiedIndex !== null ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background-color 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                colorScheme: 'dark'
              }}
              onMouseEnter={(e) => {
                if (copiedIndex === null) {
                  e.currentTarget.style.backgroundColor = '#0056b3'
                }
              }}
              onMouseLeave={(e) => {
                if (copiedIndex === null) {
                  e.currentTarget.style.backgroundColor = '#007bff'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {copiedIndex !== null ? (
                  <>✓ Copied!</>
                ) : (
                  <>📋 Export</>
                )}
              </span>
            </button>
            <button
              onClick={clearAllElements}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background-color 0.2s',
                colorScheme: 'dark'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5a6268'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6c757d'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div
          data-vibetorch-ignore="true"
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: toastType === 'success'
              ? '0 4px 12px rgba(16, 185, 129, 0.4)'
              : '0 4px 12px rgba(239, 68, 68, 0.4)',
            zIndex: 2147483647,
            animation: 'vibetorchToastSlide 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '400px',
            textAlign: 'center',
            colorScheme: 'dark'
          }}
        >
          <span>{toastType === 'success' ? '✓' : '✕'}</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  )
}