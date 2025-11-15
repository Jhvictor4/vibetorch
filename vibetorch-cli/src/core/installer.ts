import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn } from 'child_process'

/**
 * Check if @vibetorch/inspector is installed
 */
export async function isInspectorInstalled(cwd: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json')
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    const deps = packageJson.dependencies || {}
    const devDeps = packageJson.devDependencies || {}

    return '@vibetorch/inspector' in deps || '@vibetorch/inspector' in devDeps
  } catch {
    return false
  }
}

/**
 * Install @vibetorch/inspector (always install latest version)
 */
export async function installInspector(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install', '--save-dev', '@vibetorch/inspector@latest'], {
      cwd,
      stdio: 'inherit'
    })

    npm.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`npm install failed with code ${code}`))
      }
    })

    npm.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Uninstall @vibetorch/inspector
 */
export async function uninstallInspector(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['uninstall', '@vibetorch/inspector'], {
      cwd,
      stdio: 'inherit'
    })

    npm.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`npm uninstall failed with code ${code}`))
      }
    })

    npm.on('error', (err) => {
      reject(err)
    })
  })
}
