#!/usr/bin/env node

import { Command } from 'commander'
import { runVibetorch } from './commands/run.js'
import { removeVibetorch } from './commands/remove.js'
import chalk from 'chalk'

const program = new Command()

program
  .name('vibetorch')
  .description('VibeTorch Inspector CLI - Auto-inject and run dev server')
  .version('0.1.0')

// Default command: setup everything and run
program
  .action(async () => {
    console.log(chalk.cyan.bold('\n🔥 VibeTorch Inspector\n'))
    await runVibetorch()
  })

// Remove command
program
  .command('remove')
  .alias('rm')
  .description('Remove VibeTorch Inspector from your project')
  .action(async () => {
    console.log(chalk.cyan.bold('\n🔥 VibeTorch Inspector - Removal\n'))
    await removeVibetorch()
  })

program.parse()
