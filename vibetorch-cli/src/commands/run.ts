import chalk from 'chalk'
import ora from 'ora'
import { detectFramework, findEntryFile } from '../core/detector.js'
import { injectInspector, isInspectorInjected } from '../core/injector.js'
import { installInspector, isInspectorInstalled } from '../core/installer.js'

export async function runVibetorch() {
  const cwd = process.cwd()

  // Step 1: Check if inspector is installed
  let spinner = ora('Checking @vibetorch/inspector installation...').start()
  const isInstalled = await isInspectorInstalled(cwd)

  if (!isInstalled) {
    spinner.warn(chalk.yellow('@vibetorch/inspector not found'))

    const installSpinner = ora('Installing @vibetorch/inspector...').start()
    try {
      await installInspector(cwd)
      installSpinner.succeed(chalk.green('✓ @vibetorch/inspector installed'))
    } catch (error) {
      installSpinner.fail(chalk.red('Failed to install @vibetorch/inspector'))
      console.error(error)
      process.exit(1)
    }
  } else {
    spinner.succeed(chalk.green('✓ @vibetorch/inspector found'))
  }

  // Step 2: Detect framework and find entry file
  spinner = ora('Detecting framework and entry file...').start()
  const framework = await detectFramework(cwd)
  const entryFile = await findEntryFile(cwd, framework)

  if (!entryFile) {
    spinner.fail(chalk.red('Could not find React entry file'))
    console.log(chalk.yellow('\nSearched for:'))
    console.log('  - app/layout.tsx (Next.js App Router)')
    console.log('  - src/main.tsx (Vite)')
    console.log('  - src/index.tsx (CRA)')
    console.log('  - pages/_app.tsx (Next.js Pages Router)')
    process.exit(1)
  }

  spinner.succeed(chalk.green(`✓ Found entry file: ${chalk.cyan(entryFile.replace(cwd, ''))}`))

  // Step 3: Check if already injected
  spinner = ora('Checking injection status...').start()
  const alreadyInjected = await isInspectorInjected(entryFile)

  if (alreadyInjected) {
    spinner.info(chalk.blue('VibeTorch Inspector already injected'))
  } else {
    spinner.text = 'Injecting VibeTorch Inspector...'
    try {
      await injectInspector(entryFile, framework)
      spinner.succeed(chalk.green('✓ VibeTorch Inspector injected'))
    } catch (error) {
      spinner.fail(chalk.red('Failed to inject inspector'))
      console.error(error)
      process.exit(1)
    }
  }

  // Done!
  console.log(chalk.green.bold('\n✓ VibeTorch Inspector is ready!\n'))
  console.log(chalk.cyan('Next steps:'))
  console.log(chalk.white('  1. Run your dev server: ') + chalk.gray('npm run dev'))
  console.log(chalk.white('  2. Open your app in the browser'))

  // Display correct keyboard shortcuts based on platform
  const isMac = process.platform === 'darwin'
  const primaryShortcut = isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C'
  const alternativeShortcut = isMac ? 'Option (Alt)' : 'Alt'

  console.log(chalk.white('  3. Toggle inspector: ') +
    chalk.yellow(primaryShortcut) +
    chalk.gray(` or ${alternativeShortcut}\n`))
}
