/**
 * Vite plugin for Vibetorch Inspector
 * Adds source location attributes and auto-injects inspector in development
 */

import type { Plugin } from 'vite'
import path from 'path'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { transformFromAstSync } from '@babel/core'
import * as t from '@babel/types'

export interface VibetorchPluginOptions {
  enabled?: boolean
  autoInject?: boolean
  includeSource?: boolean
  framework?: 'react' | 'vue' | 'svelte' | 'auto'
}

export function vibetorchInspectorPlugin(options: VibetorchPluginOptions = {}): Plugin {
  const {
    enabled = true,
    autoInject = true,
    includeSource = true,
    framework = 'auto'
  } = options
  
  let isDevelopment = false
  let projectRoot = process.cwd()
  
  return {
    name: 'vibetorch-inspector',
    enforce: 'pre',
    
    configResolved(config) {
      isDevelopment = config.mode === 'development'
      projectRoot = config.root
    },
    
    transformIndexHtml(html) {
      if (!enabled || !isDevelopment || !autoInject) return html
      
      // Inject inspector initialization script
      const injectionScript = `
        <script type="module">
          // Auto-initialize Vibetorch Inspector in development
          import { VibetorchInspector } from '@vibetorch/inspector';
          
          if (!window.__vibetorchInspector) {
            window.__vibetorchInspector = new VibetorchInspector({
              enabled: true,
              enableShortcuts: true,
              onElementSelected: (info) => {
                if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_VIBETORCH) {
                  console.log('[VibetorchInspector] Element selected:', info);
                }

                // Send to parent window if in iframe
                if (window.parent !== window) {
                  window.parent.postMessage({
                    type: 'vibetorch:element-selected',
                    data: info,
                    timestamp: Date.now()
                  }, '*');
                }
              }
            });

            if (import.meta.env.DEV) {
              console.log('[VibetorchInspector] Initialized - Press Cmd+Shift+C (Mac) or Ctrl+Shift+C to activate');
            }
          }
        </script>
      `
      
      // Inject before closing body tag
      return html.replace('</body>', `${injectionScript}</body>`)
    },
    
    transform(code, id) {
      if (!enabled || !isDevelopment || !includeSource) return null
      
      // Only process JSX/TSX files
      if (!id.match(/\.[jt]sx$/)) return null
      
      // Skip node_modules
      if (id.includes('node_modules')) return null
      
      // Get relative path from project root
      const relativePath = path.relative(projectRoot, id).replace(/\\/g, '/')
      
      // Simple source injection for React/JSX
      // In production, you'd use a proper AST transformer
      if (framework === 'react' || framework === 'auto') {
        return injectSourceForReact(code, relativePath)
      }
      
      return null
    }
  }
}

/**
 * Inject data-source attributes for React/JSX using AST
 */
function injectSourceForReact(code: string, filePath: string): string {
  try {
    // Parse the code to AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    })

    // Traverse and modify JSX elements
    traverse(ast, {
      JSXOpeningElement(path) {
        const { node } = path

        // Check if data-source attribute already exists
        const hasDataSource = node.attributes.some(
          attr => t.isJSXAttribute(attr) &&
                  t.isJSXIdentifier(attr.name) &&
                  attr.name.name === 'data-source'
        )

        // Skip if already has data-source
        if (hasDataSource) {
          return
        }

        // Get line number from node location
        const lineNumber = node.loc?.start.line || 0
        const sourceValue = `${filePath}:${lineNumber}`

        // Create data-source attribute
        const dataSourceAttr = t.jsxAttribute(
          t.jsxIdentifier('data-source'),
          t.stringLiteral(sourceValue)
        )

        // Add attribute to the element
        node.attributes.push(dataSourceAttr)
      }
    })

    // Generate code from modified AST
    const result = transformFromAstSync(ast, code, {
      retainLines: true,
      compact: false
    })

    return result?.code || code
  } catch (error) {
    // If parsing fails, return original code
    if (process.env.DEBUG_VIBETORCH) {
      console.warn(`[VibeTorch] Failed to parse ${filePath}:`, error)
    }
    return code
  }
}

/**
 * Create a standalone plugin for just source injection
 */
export function sourceInjectionPlugin(options: { enabled?: boolean } = {}): Plugin {
  return vibetorchInspectorPlugin({
    ...options,
    autoInject: false,
    includeSource: true
  })
}

/**
 * Create a standalone plugin for just auto-injection
 */
export function autoInjectPlugin(options: { enabled?: boolean } = {}): Plugin {
  return vibetorchInspectorPlugin({
    ...options,
    autoInject: true,
    includeSource: false
  })
}