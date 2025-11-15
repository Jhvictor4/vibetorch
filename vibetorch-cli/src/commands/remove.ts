import chalk from 'chalk'
import ora from 'ora'
import { detectFramework, findEntryFile } from '../core/detector.js'
import { removeInspector, isInspectorInjected } from '../core/injector.js'
import { isInspectorInstalled, uninstallInspector } from '../core/installer.js'

export async function removeVibetorch() {
  const cwd = process.cwd()

  // Step 1: Detect framework and find entry file
  const spinner = ora('Finding injected files...').start()
  const framework = await detectFramework(cwd)
  const entryFile = await findEntryFile(cwd, framework)

  if (!entryFile) {
    spinner.fail(chalk.red('Could not find React entry file'))
    process.exit(1)
  }

  spinner.succeed(chalk.green(`✓ Found entry file: ${chalk.cyan(entryFile.replace(cwd, ''))}`))

  // Step 2: Check if injected
  const removeSpinner = ora('Checking injection status...').start()
  const isInjected = await isInspectorInjected(entryFile)

  if (!isInjected) {
    removeSpinner.info(chalk.blue('VibeTorch Inspector not found in this file'))
    console.log(chalk.gray('\nNothing to remove.'))
    return
  }

  // Step 3: Remove injection
  removeSpinner.text = 'Removing VibeTorch Inspector from code...'

  try {
    await removeInspector(entryFile)
    removeSpinner.succeed(chalk.green('✓ Code injection removed'))
  } catch (error) {
    removeSpinner.fail(chalk.red('Failed to remove inspector'))
    console.error(error)
    process.exit(1)
  }

  // Step 4: Uninstall package
  const isInstalled = await isInspectorInstalled(cwd)

  if (isInstalled) {
    const uninstallSpinner = ora('Uninstalling @vibetorch/inspector package...').start()

    try {
      await uninstallInspector(cwd)
      uninstallSpinner.succeed(chalk.green('✓ Package uninstalled'))
    } catch (error) {
      uninstallSpinner.warn(chalk.yellow('Could not uninstall package (you can manually run: npm uninstall @vibetorch/inspector)'))
    }
  }

  console.log(chalk.green.bold('\n✓ Cleanup complete!\n'))
}
