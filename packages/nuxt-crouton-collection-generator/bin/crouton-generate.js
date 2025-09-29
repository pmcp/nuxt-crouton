#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the main generator script
const generatorPath = join(__dirname, '..', 'lib', 'generate-collection.mjs');

// Check if generator exists
if (!fs.existsSync(generatorPath)) {
  console.error(chalk.red('Error: Generator script not found. Please ensure the package is properly installed.'));
  process.exit(1);
}

// Setup CLI
program
  .name('crouton-generate')
  .description('Generate CRUD collections for Nuxt Crouton')
  .version('1.0.0');

// Config command
program
  .command('config [configPath]')
  .description('Generate collections using a config file')
  .action(async (configPath = './crouton.config.js') => {
    const spinner = ora('Loading config...').start();

    try {
      // Pass config as the first argument to the generator
      const args = ['--config', configPath];

      spinner.stop();

      // Import and execute the generator script directly
      process.argv = ['node', 'generate-collection.mjs', ...args];
      await import(generatorPath);

    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Main generate command
program
  .command('generate <layer> <collection>', { isDefault: true })
  .description('Generate a new CRUD collection')
  .option('-f, --fields-file <path>', 'Path to JSON schema file')
  .option('-d, --dialect <type>', 'Database dialect (pg or sqlite)', 'sqlite')
  .option('--auto-relations', 'Add relation stubs in comments')
  .option('--dry-run', 'Preview what will be generated')
  .option('--no-translations', 'Skip translation fields')
  .option('--force', 'Force generation despite missing dependencies')
  .option('--no-db', 'Skip database table creation')
  .option('-c, --config <path>', 'Use config file instead of CLI args')
  .action(async (layer, collection, options) => {
    const spinner = ora('Generating collection...').start();

    try {
      // If config is provided, use config mode
      if (options.config) {
        const args = ['--config', options.config];

        spinner.stop();

        // Import and execute the generator script directly
        process.argv = ['node', 'generate-collection.mjs', ...args];
        await import(generatorPath);
        return;
      }

      // Build args for the generator script (normal CLI mode)
      const args = [layer, collection];

      if (options.fieldsFile) {
        args.push(`--fields-file=${options.fieldsFile}`);
      }
      if (options.dialect) {
        args.push(`--dialect=${options.dialect}`);
      }
      if (options.autoRelations) {
        args.push('--auto-relations');
      }
      if (options.dryRun) {
        args.push('--dry-run');
      }
      // Commander.js sets --no-* flags to false when used
      if (options.translations === false) {
        args.push('--no-translations');
      }
      if (options.force) {
        args.push('--force');
      }
      if (options.db === false) {
        args.push('--no-db');
      }

      spinner.stop();

      // Import and execute the generator script directly
      process.argv = ['node', 'generate-collection.mjs', ...args];
      await import(generatorPath);

    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Install command
program
  .command('install')
  .description('Install required Nuxt modules')
  .action(async () => {
    const spinner = ora('Checking modules...').start();

    try {
      const installModulesPath = join(__dirname, '..', 'lib', 'install-modules.mjs');

      if (!fs.existsSync(installModulesPath)) {
        spinner.fail('Install script not found');
        console.log(chalk.yellow('Please install modules manually:'));
        console.log(chalk.cyan('  pnpm add @friendlyinternet/nuxt-crouton'));
        process.exit(1);
      }

      spinner.stop();

      const { install } = await import(installModulesPath);
      await install();

    } catch (error) {
      spinner.fail('Installation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Init command - creates example schema
program
  .command('init')
  .description('Create an example schema file')
  .option('-o, --output <path>', 'Output path for schema', './crouton-schema.json')
  .action(async (options) => {
    const exampleSchema = {
      id: {
        type: "string",
        meta: {
          primaryKey: true
        }
      },
      name: {
        type: "string",
        meta: {
          required: true,
          maxLength: 255
        }
      },
      description: {
        type: "text"
      },
      price: {
        type: "decimal",
        meta: {
          precision: 10,
          scale: 2
        }
      },
      inStock: {
        type: "boolean"
      },
      createdAt: {
        type: "date"
      }
    };

    try {
      await fs.writeJSON(options.output, exampleSchema, { spaces: 2 });
      console.log(chalk.green(`✓ Created example schema at ${options.output}`));
      console.log(chalk.gray('\nNow you can generate a collection:'));
      console.log(chalk.cyan(`  crouton-generate shop products --fields-file=${options.output}`));
    } catch (error) {
      console.error(chalk.red('Failed to create schema file:'), error.message);
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}