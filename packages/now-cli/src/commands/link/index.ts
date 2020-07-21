import { join, basename } from 'path';
import chalk from 'chalk';
import { NowContext } from '../../types';
import { NowConfig } from '../../util/dev/types';
import createOutput from '../../util/output';
import getArgs from '../../util/get-args';
import getSubcommand from '../../util/get-subcommand';
import {
  getLinkedProject,
  linkFolderToProject,
} from '../../util/projects/link';
import Client from '../../util/client';
import handleError from '../../util/handle-error';
import logo from '../../util/output/logo';
import { getPkgName } from '../../util/pkg-name';
import confirm from '../../util/input/confirm';
import toHumanPath from '../../util/humanize-path';
import { emoji, prependEmoji } from '../../util/emoji';
import { isDirectory } from '../../util/config/global-path';
import selectOrg from '../../util/input/select-org';
import inputProject from '../../util/input/input-project';
import { validateRootDirectory } from '../../util/validate-paths';
import { inputRootDirectory } from '../../util/input/input-root-directory';
import editProjectSettings from '../../util/input/edit-project-settings';
import stamp from '../../util/output/stamp';
//@ts-expect-error
import createDeploy from '../../util/deploy/create-deploy';
//@ts-expect-error
import Now from '../../util';

const help = () => {
  console.log(`
  ${chalk.bold(`${logo} ${getPkgName()} link`)} [options]

  ${chalk.dim('Options:')}

    -h, --help                     Output usage information
    -A ${chalk.bold.underline('FILE')}, --local-config=${chalk.bold.underline(
    'FILE'
  )}   Path to the local ${'`vercel.json`'} file
    -Q ${chalk.bold.underline('DIR')}, --global-config=${chalk.bold.underline(
    'DIR'
  )}    Path to the global ${'`.vercel`'} directory
    -d, --debug                    Debug mode [off]
    -t ${chalk.bold.underline('TOKEN')}, --token=${chalk.bold.underline(
    'TOKEN'
  )}        Login token

  ${chalk.dim('Examples:')}

  ${chalk.gray('–')} Link current directory to a Vercel Project

      ${chalk.cyan(`$ ${getPkgName()} link`)}
`);
};

const COMMAND_CONFIG = {
  // No subcommands yet
};

export default async function main(ctx: NowContext) {
  let argv;

  try {
    argv = getArgs(ctx.argv.slice(2), {
      '--yes': Boolean,
      '-y': '--yes',
    });
  } catch (error) {
    handleError(error);
    return 1;
  }

  if (argv['--help']) {
    help();
    return 2;
  }

  const debug = argv['--debug'];
  const output = createOutput({ debug });
  const { args } = getSubcommand(argv._.slice(1), COMMAND_CONFIG);
  const {
    authConfig: { token },
    config,
  } = ctx;
  const { currentTeam } = config;
  const { apiUrl } = ctx;
  const client = new Client({ apiUrl, token, currentTeam, debug });
  //client.currentTeam = org.type === 'team' ? org.id : undefined;

  const path = args[0] || process.cwd();
  if (!isDirectory(path)) {
    output.error(`Expected directory but found file: ${path}`);
    return 1;
  }
  const link = await getLinkedProject(output, client, path);
  const autoConfirm = false;
  const isFile = false;
  const isTTY = process.stdout.isTTY;
  const quiet = !isTTY;
  const contextName = currentTeam || 'current user';
  let rootDirectory = null;
  let newProjectName = null;
  let project = null;
  let org;

  if (link.status === 'linked') {
    link.project;
    output.note('Project is already linked');
    // TODO: delete project first?
    return 0;
  }

  const shouldStartSetup =
    autoConfirm ||
    (await confirm(
      `Set up and develop ${chalk.cyan(`“${toHumanPath(path)}”`)}?`,
      true
    ));

  if (!shouldStartSetup) {
    output.print(`Aborted. Project not set up.\n`);
    return 0;
  }

  try {
    org = await selectOrg(
      output,
      'Which scope should contain your project?',
      client,
      ctx.config.currentTeam,
      autoConfirm
    );
  } catch (err) {
    if (err.code === 'NOT_AUTHORIZED' || err.code === 'TEAM_DELETED') {
      output.error(err.message);
      return 1;
    }

    throw err;
  }

  const detectedProjectName = basename(path);

  const projectOrNewProjectName = await inputProject(
    output,
    client,
    org,
    detectedProjectName,
    autoConfirm
  );

  if (typeof projectOrNewProjectName === 'string') {
    newProjectName = projectOrNewProjectName;
    rootDirectory = await inputRootDirectory(path, output, autoConfirm);
  } else {
    project = projectOrNewProjectName;

    await linkFolderToProject(
      output,
      path,
      {
        projectId: project.id,
        orgId: org.id,
      },
      project.name,
      org.slug
    );
    output.log(`Linked to project ${project.name}`);
    return 0;
  }
  const sourcePath = rootDirectory ? join(path, rootDirectory) : path;

  if (
    rootDirectory &&
    !(await validateRootDirectory(output, path, sourcePath, ''))
  ) {
    return 1;
  }

  let localConfig: NowConfig = {};
  if (ctx.localConfig && !(ctx.localConfig instanceof Error)) {
    localConfig = ctx.localConfig;
  }
  const now = new Now({ apiUrl, token, debug, currentTeam: undefined });
  let deployment = null;

  try {
    const createArgs: any = {
      name: newProjectName,
      env: {},
      build: { env: {} },
      forceNew: undefined,
      withCache: undefined,
      quiet,
      wantsPublic: localConfig.public,
      isFile,
      type: null,
      nowConfig: localConfig,
      regions: undefined,
      meta: {},
      deployStamp: stamp(),
      target: undefined,
      skipAutoDetectionConfirmation: autoConfirm,
      createProjectAndSkipDeploy: '1', // TODO: implement backend
    };

    console.log({ createArgs }); // TODO: remove

    deployment = await createDeploy(
      output,
      now,
      contextName,
      [sourcePath],
      createArgs,
      org,
      !project && !isFile,
      path
    );

    console.log({ deployment }); // TODO: remove

    if (
      'code' in deployment &&
      deployment.code === 'missing_project_settings'
    ) {
      const { projectSettings, framework } = deployment;

      if (rootDirectory) {
        projectSettings.rootDirectory = rootDirectory;
      }

      const settings = await editProjectSettings(
        output,
        projectSettings,
        framework
      );

      // deploy again, but send projectSettings this time
      createArgs.projectSettings = settings;

      createArgs.deployStamp = stamp();

      console.log({ createArgs }); // TODO: remove

      deployment = await createDeploy(
        output,
        now,
        contextName,
        [sourcePath],
        createArgs,
        org,
        false,
        path
      );

      console.log({ deployment }); // TODO: remove
    }

    if (deployment instanceof Error) {
      (deployment.message =
        deployment.message ||
        'An unexpected error occurred while creating your project'),
        output.prettyError(deployment);
      return 1;
    }

    if (deployment === null) {
      output.error('Link failed. Please try again.');
      return 1;
    }

    output.print(
      `${prependEmoji(
        `Linked to project ${chalk.bold(deployment.name)}`,
        emoji('success')
      )}\n`
    );
    return 0;
  } catch (err) {
    handleError(err);
    return 1;
  }
}
