import bytes from 'bytes';
import Progress from 'progress';
import chalk from 'chalk';
import {
  createDeployment,
  DeploymentOptions,
  NowClientOptions,
} from 'now-client';
import wait from '../output/wait';
import { Output } from '../output';
// @ts-ignore
import Now from '../../util';
import { NowConfig } from '../dev/types';
import { Org } from '../../types';
import ua from '../ua';
import processLegacyDeployment from './process-legacy-deployment';
import { linkFolderToProject } from '../projects/link';

function printInspectUrl(
  output: Output,
  deploymentUrl: string,
  deployStamp: () => number,
  orgName: string
) {
  const urlParts = deploymentUrl
    .replace(/\..*/, '')
    .replace('https://', '')
    .split('-');
  const deploymentShortId = urlParts.pop();
  const projectName = urlParts.join('-');
  const inspectUrl = `https://zeit.co/${orgName}/${projectName}/${deploymentShortId}`;
  output.print(`🔍  Inspect: ${chalk.bold(inspectUrl)} ${deployStamp()}\n`);
}

export default async function processDeployment({
  isLegacy,
  org,
  projectName,
  shouldLinkFolder,
  ...args
}: {
  now: Now;
  output: Output;
  hashes: { [key: string]: any };
  paths: string[];
  requestBody: DeploymentOptions;
  uploadStamp: () => number;
  deployStamp: () => number;
  isLegacy: boolean;
  quiet: boolean;
  nowConfig?: NowConfig;
  force?: boolean;
  org: Org;
  projectName: string;
  shouldLinkFolder: boolean;
}) {
  if (isLegacy) return processLegacyDeployment(args);

  let {
    now,
    output,
    hashes,
    paths,
    requestBody,
    deployStamp,
    quiet,
    force,
    nowConfig,
  } = args;

  const { warn, debug, note } = output;
  let bar: Progress | null = null;

  const { env = {} } = requestBody;

  const nowClientOptions: NowClientOptions = {
    teamId: now.currentTeam,
    apiUrl: now._apiUrl,
    token: now._token,
    debug: now._debug,
    userAgent: ua,
    path: paths[0],
    force,
  };

  let queuedSpinner = null;
  let buildSpinner = null;
  let deploySpinner = null;

  let deployingSpinner = wait(
    `Deploying ${chalk.bold(`${org.slug}/${projectName}`)}`
  );

  for await (const event of createDeployment(
    nowClientOptions,
    requestBody,
    nowConfig
  )) {
    if (event.type === 'hashes-calculated') {
      hashes = event.payload;
    }

    if (event.type === 'warning') {
      warn(event.payload);
    }

    if (event.type === 'notice') {
      note(event.payload);
    }

    if (event.type === 'file_count') {
      debug(
        `Total files ${event.payload.total.size}, ${event.payload.missing.length} changed`
      );

      const missingSize = event.payload.missing
        .map((sha: string) => event.payload.total.get(sha).data.length)
        .reduce((a: number, b: number) => a + b, 0);

      bar = new Progress(`${chalk.gray('>')} Upload [:bar] :percent :etas`, {
        width: 20,
        complete: '=',
        incomplete: '',
        total: missingSize,
        clear: true,
      });
    }

    if (event.type === 'file-uploaded') {
      debug(
        `Uploaded: ${event.payload.file.names.join(' ')} (${bytes(
          event.payload.file.data.length
        )})`
      );

      if (bar) {
        bar.tick(event.payload.file.data.length);
      }
    }

    if (event.type === 'created') {
      if (deployingSpinner) {
        deployingSpinner();
      }

      now._host = event.payload.url;

      if (shouldLinkFolder) {
        await linkFolderToProject(output, {
          orgId: org.id,
          projectId: event.payload.projectId,
        });
      }

      if (!quiet) {
        printInspectUrl(output, event.payload.url, deployStamp, org.slug);
      } else {
        process.stdout.write(`https://${event.payload.url}`);
      }

      if (queuedSpinner === null) {
        queuedSpinner =
          event.payload.readyState === 'QUEUED'
            ? wait('Queued')
            : wait('Building');
      }
    }

    if (
      event.type === 'build-state-changed' &&
      event.payload.readyState === 'BUILDING'
    ) {
      if (queuedSpinner) {
        queuedSpinner();
      }

      if (buildSpinner === null) {
        buildSpinner = wait('Building');
      }
    }

    if (event.type === 'all-builds-completed') {
      if (queuedSpinner) {
        queuedSpinner();
      }
      if (buildSpinner) {
        buildSpinner();
      }

      deploySpinner = wait('Finalizing');
    }

    // Handle error events
    if (event.type === 'error') {
      if (queuedSpinner) {
        queuedSpinner();
      }
      if (buildSpinner) {
        buildSpinner();
      }
      if (deploySpinner) {
        deploySpinner();
      }
      if (deployingSpinner) {
        deployingSpinner();
      }

      const error = await now.handleDeploymentError(event.payload, {
        hashes,
        env,
      });

      if (error.code === 'missing_project_settings') {
        return error;
      }

      throw error;
    }

    // Handle ready event
    if (event.type === 'alias-assigned') {
      if (queuedSpinner) {
        queuedSpinner();
      }
      if (buildSpinner) {
        buildSpinner();
      }
      if (deploySpinner) {
        deploySpinner();
      }
      if (deployingSpinner) {
        deployingSpinner();
      }

      return event.payload;
    }
  }
}
