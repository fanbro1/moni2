import chalk from 'chalk';

import { NowContext } from '../../types';
import createOutput from '../../util/output';
import getArgs from '../../util/get-args';
import getSubcommand from '../../util/get-subcommand';
import handleError from '../../util/handle-error';
import logo from '../../util/output/logo';

import add from './add';
import pull from './pull';
import ls from './ls';
import rm from './rm';

const help = () => {
  console.log(`
  ${chalk.bold(`${logo} now env`)} [options] <command>

  ${chalk.dim('Commands:')}

    ls      [environment]              List all variables for the specified environment
    add     [name] [environment]       Add an environment variable (see examples below)
    rm      [name] [environment]       Remove an environment variable
    pull    [filename]                 Read development environment from the cloud and write to a file, default .env

  ${chalk.dim('Options:')}

    -h, --help                     Output usage information
    -A ${chalk.bold.underline('FILE')}, --local-config=${chalk.bold.underline(
    'FILE'
  )}   Path to the local ${'`now.json`'} file
    -Q ${chalk.bold.underline('DIR')}, --global-config=${chalk.bold.underline(
    'DIR'
  )}    Path to the global ${'`.now`'} directory
    -d, --debug                    Debug mode [off]
    -t ${chalk.bold.underline('TOKEN')}, --token=${chalk.bold.underline(
    'TOKEN'
  )}        Login token

  ${chalk.dim('Examples:')}

  ${chalk.gray('–')} Add a new variable to multiple environments

      ${chalk.cyan('$ now env add <name>')}
      ${chalk.cyan('$ now env add API_TOKEN')}

  ${chalk.gray('–')} Add a new variable for a specific environment

      ${chalk.cyan('$ now env add <name> <production | preview | development>')}
      ${chalk.cyan('$ now env add DB_CONNECTION production')}

  ${chalk.gray('–')} Add a new environment variable from stdin

      ${chalk.cyan(
        '$ cat <file> | now env add <name> <production | preview | development>'
      )}
      ${chalk.cyan('$ cat ~/.npmrc | now env add NPM_RC preview')}

  ${chalk.gray('–')} Remove a variable from multiple environments

      ${chalk.cyan('$ now env rm <name>')}
      ${chalk.cyan('$ now env rm API_TOKEN')}

  ${chalk.gray('–')} Remove a variable from a specific environment

      ${chalk.cyan('$ now env rm <name> <production | preview | development>')}
      ${chalk.cyan('$ now env rm NPM_RC preview')}
`);
};

const COMMAND_CONFIG = {
  ls: ['ls', 'list'],
  add: ['add'],
  rm: ['rm', 'remove'],
  pull: ['pull'],
};

export default async function main(ctx: NowContext) {
  let argv;

  try {
    argv = getArgs(ctx.argv.slice(2), {});
  } catch (error) {
    handleError(error);
    return 1;
  }

  if (argv['--help']) {
    help();
    return 2;
  }

  const output = createOutput({ debug: argv['--debug'] });
  const { subcommand, args } = getSubcommand(argv._.slice(1), COMMAND_CONFIG);
  switch (subcommand) {
    case 'ls':
      return ls(ctx, argv, args, output);
    case 'add':
      return add(ctx, argv, args, output);
    case 'rm':
      return rm(ctx, argv, args, output);
    case 'pull':
      return pull(ctx, argv, args, output);
    default:
      output.error(
        `Please specify a valid subcommand: ${Object.keys(COMMAND_CONFIG).join(
          ' | '
        )}`
      );
      help();
      return 2;
  }
}
