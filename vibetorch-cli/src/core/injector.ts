import * as fs from 'fs/promises'
import { spawn } from 'child_process'
import * as path from 'path'
import type { Framework } from './detector.js'
import { getFrameworkFromFile } from './detector.js'

const INSPECTOR_IMPORT = `import { VibetorchInspector } from '@vibetorch/inspector'\n`
const INSPECTOR_COMPONENT = `<VibetorchInspector />`

const INSPECTOR_IMPORT_REGEX = /import\s+\{[^}]*VibetorchInspector[^}]*\}\s+from\s+['"]@vibetorch\/inspector['"]\s*;?\s*\n?/g
const INSPECTOR_COMPONENT_REGEX = /<VibetorchInspector\s*\/?>/

/**
 * Check if inspector is already injected
 */
export async function isInspectorInjected(filePath: string): Promise<boolean> {
  const content = await fs.readFile(filePath, 'utf-8')
  const hasImport = /import\s+\{[^}]*VibetorchInspector[^}]*\}\s+from\s+['"]@vibetorch\/inspector['"]/.test(content)
  const hasComponent = INSPECTOR_COMPONENT_REGEX.test(content)
  return hasImport && hasComponent
}

/**
 * Inject VibeTorch Inspector into file
 */
export async function injectInspector(filePath: string, framework: Framework): Promise<void> {
  let content = await fs.readFile(filePath, 'utf-8')
  const detectedFramework = framework === 'unknown' ? getFrameworkFromFile(filePath) : framework

  // Add import after last import
  const lines = content.split('\n')
  let lastImportLine = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportLine = i
    }
  }

  lines.splice(lastImportLine + 1, 0, INSPECTOR_IMPORT)
  content = lines.join('\n')

  // Add component based on framework
  if (detectedFramework === 'next-app') {
    // Next.js App Router: before </body>
    const bodyMatch = content.match(/<\/body>/g)
    if (bodyMatch) {
      // Find </body> position
      const bodyIndex = content.lastIndexOf('</body>')

      // Find the line start before </body>
      const lineStart = content.lastIndexOf('\n', bodyIndex) + 1
      const lineText = content.substring(lineStart, bodyIndex)
      const indent = lineText.match(/^\s*/)?.[0] || '      '

      content = content.replace(
        '</body>',
        `\n${indent}${INSPECTOR_COMPONENT}\n${indent}</body>`
      )
    }
  } else if (detectedFramework === 'vite' || detectedFramework === 'cra') {
    // Vite/CRA: after <App />
    const appComponentMatch = content.match(/(<App\s*\/>)/g)
    if (appComponentMatch) {
      const lastAppComponent = appComponentMatch[appComponentMatch.length - 1]

      // Detect indentation
      const lineStart = content.lastIndexOf('\n', content.lastIndexOf(lastAppComponent))
      const lineText = content.substring(lineStart + 1, content.lastIndexOf(lastAppComponent))
      const indent = lineText.match(/^\s*/)?.[0] || '    '

      content = content.replace(
        lastAppComponent,
        `${lastAppComponent}\n${indent}${INSPECTOR_COMPONENT}`
      )
    }
  } else if (detectedFramework === 'next-pages') {
    // Next.js Pages Router: before </body> or at end of return
    const closingBodyMatch = content.match(/<\/body>/g)
    if (closingBodyMatch) {
      const indent = '        '
      content = content.replace(
        '</body>',
        `${indent}${INSPECTOR_COMPONENT}\n${indent}</body>`
      )
    }
  }

  await fs.writeFile(filePath, content, 'utf-8')

  // Auto-format the file
  await formatFile(filePath)
}

/**
 * Format file using prettier or eslint if available
 */
async function formatFile(filePath: string): Promise<void> {
  const projectRoot = path.dirname(filePath)

  // Try prettier first
  try {
    await runCommand(projectRoot, 'npx', ['prettier', '--write', filePath])
    return
  } catch {
    // Prettier not available or failed
  }

  // Try eslint --fix
  try {
    await runCommand(projectRoot, 'npx', ['eslint', '--fix', filePath])
    return
  } catch {
    // ESLint not available or failed
  }

  // No formatter available, skip
}

/**
 * Run a command and return a promise
 */
function runCommand(cwd: string, command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'ignore' // Suppress output
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Remove VibeTorch Inspector from file
 */
export async function removeInspector(filePath: string): Promise<void> {
  let content = await fs.readFile(filePath, 'utf-8')

  // Remove import line
  content = content.replace(INSPECTOR_IMPORT_REGEX, '')

  // Remove component
  content = content.replace(new RegExp(`\\s*${INSPECTOR_COMPONENT}\\s*\n?`, 'g'), '')

  // Clean up extra blank lines
  content = content.replace(/\n\n\n+/g, '\n\n')

  await fs.writeFile(filePath, content, 'utf-8')
}
