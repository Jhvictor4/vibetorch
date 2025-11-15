import * as fs from 'fs/promises'
import * as path from 'path'

export type Framework = 'next-app' | 'next-pages' | 'vite' | 'cra' | 'unknown'

/**
 * React entry files in priority order
 */
const ENTRY_FILES = [
  { path: 'src/app/layout.tsx', framework: 'next-app' as Framework },
  { path: 'src/app/layout.jsx', framework: 'next-app' as Framework },
  { path: 'app/layout.tsx', framework: 'next-app' as Framework },
  { path: 'app/layout.jsx', framework: 'next-app' as Framework },
  { path: 'src/main.tsx', framework: 'vite' as Framework },
  { path: 'src/main.jsx', framework: 'vite' as Framework },
  { path: 'src/index.tsx', framework: 'cra' as Framework },
  { path: 'src/index.jsx', framework: 'cra' as Framework },
  { path: 'pages/_app.tsx', framework: 'next-pages' as Framework },
  { path: 'pages/_app.jsx', framework: 'next-pages' as Framework }
]

/**
 * Detect framework from package.json
 */
export async function detectFramework(cwd: string): Promise<Framework> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json')
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    if (deps['next']) return 'next-app'
    if (deps['vite']) return 'vite'
    if (deps['react-scripts']) return 'cra'

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Find React entry file
 */
export async function findEntryFile(
  cwd: string,
  framework: Framework
): Promise<string | null> {
  // Try framework-specific files first
  const frameworkFiles = ENTRY_FILES.filter(f => f.framework === framework)
  for (const entry of frameworkFiles) {
    const fullPath = path.join(cwd, entry.path)
    if (await fileExists(fullPath)) {
      return fullPath
    }
  }

  // Try all files
  for (const entry of ENTRY_FILES) {
    const fullPath = path.join(cwd, entry.path)
    if (await fileExists(fullPath)) {
      return fullPath
    }
  }

  return null
}

/**
 * Get framework from entry file path
 */
export function getFrameworkFromFile(filePath: string): Framework {
  if (filePath.includes('/app/layout.')) return 'next-app'
  if (filePath.includes('/pages/_app.')) return 'next-pages'
  if (filePath.includes('/main.')) return 'vite'
  if (filePath.includes('/index.')) return 'cra'
  return 'unknown'
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
