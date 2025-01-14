import chalk from 'chalk';
import type Client from '../../util/client';
import getScope from '../../util/get-scope';
import { getLinkedProject } from '../../util/projects/link';
import type { Resource } from './types';
import { getResources } from '../../util/integration/get-resources';
import { listSubcommand } from './command';
import { getFlagsSpecification } from '../../util/get-flags-specification';
import { parseArguments } from '../../util/get-args';
import handleError from '../../util/handle-error';
import table from '../../util/output/table';
import title from 'title';
import type { Output } from '../../util/output';
import type { Team } from '@vercel-internals/types';
import { buildSSOLink } from '../../util/integration/build-sso-link';

export async function list(client: Client) {
  let parsedArguments = null;
  const flagsSpecification = getFlagsSpecification(listSubcommand.options);

  try {
    parsedArguments = parseArguments(client.argv.slice(3), flagsSpecification);
  } catch (error) {
    handleError(error);
    return 1;
  }

  const { contextName, team } = await getScope(client);
  let project: { id?: string; name?: string } | undefined;

  if (!team) {
    client.output.error('Team not found.');
    return 1;
  }

  if (parsedArguments.args.length > 2) {
    client.output.error(
      'Cannot specify more than one project at a time. Use `--all` to show all resources.'
    );
    return 1;
  }

  if (parsedArguments.args.length === 2) {
    if (parsedArguments.flags['--all']) {
      client.output.error(
        'Cannot specify a project when using the `--all` flag.'
      );
      return 1;
    }

    project = { name: parsedArguments.args[1] };
  }

  if (!parsedArguments.flags['--all']) {
    project = await getLinkedProject(client).then(result => {
      if (result.status === 'linked') {
        return result.project;
      }
      return;
    });
    if (!project) {
      client.output.error(
        'No project linked. Either use `vc link` to link a project, or the `--all` flag to list all resources.'
      );
      return 1;
    }
  }

  let resources: Resource[] | undefined;

  try {
    client.output.spinner('Retrieving resources…', 500);
    resources = await getResources(client, team.id);
  } catch (error) {
    client.output.error(
      `Failed to fetch resources: ${(error as Error).message}`
    );
    return 1;
  }

  const filterIntegration =
    parsedArguments.flags['--integration']?.toLocaleLowerCase();

  function resourceIsFromMarketplace(resource: Resource): boolean {
    return resource.type === 'integration';
  }

  function filterOnIntegration(resource: Resource): boolean {
    return !filterIntegration || filterIntegration === resource.product?.slug;
  }

  function filterOnProject(resource: Resource): boolean {
    return (
      !project ||
      !!resource.projectsMetadata?.find(
        metadata =>
          metadata.projectId === project?.id || metadata.name === project?.name
      )
    );
  }

  function filterOnFlags(resource: Resource): boolean {
    return filterOnIntegration(resource) && filterOnProject(resource);
  }

  const results = resources
    .filter(resourceIsFromMarketplace)
    .filter(filterOnFlags)
    .map(resource => {
      return {
        id: resource.id,
        name: resource.name,
        status: resource.status,
        product: resource.product?.name,
        integration: resource.product?.slug,
        configurationId: resource.product?.integrationConfigurationId,
        projects: resource.projectsMetadata
          ?.map(metadata => metadata.name)
          .join(', '),
      };
    });

  if (results.length === 0) {
    client.output.log('No resources found.');
    return 0;
  }

  client.output.log(
    `Integrations in ${chalk.bold(contextName)}:\n${table(
      [
        ['Name', 'Status', 'Product', 'Integration', 'Projects'].map(header =>
          chalk.bold(chalk.cyan(header))
        ),
        ...results.map(result => [
          resourceLink(client.output, contextName, result) ?? chalk.gray('–'),
          resourceStatus(result.status ?? '–'),
          result.product ?? chalk.gray('–'),
          integrationLink(client.output, result, team) ?? chalk.gray('–'),
          chalk.grey(result.projects ? result.projects : '–'),
        ]),
      ],
      { hsep: 8 }
    )}`
  );
  return 0;
}

// Builds a string with an appropriately coloured indicator
function resourceStatus(status: string) {
  const CIRCLE = '● ';
  const statusTitleCase = title(status);
  switch (status) {
    case 'initializing':
      return chalk.yellow(CIRCLE) + statusTitleCase;
    case 'error':
      return chalk.red(CIRCLE) + statusTitleCase;
    case 'available':
      return chalk.green(CIRCLE) + statusTitleCase;
    case 'suspended':
      return chalk.white(CIRCLE) + statusTitleCase;
    case 'limits-exceeded-suspended':
      return `${chalk.white(CIRCLE)}Limits exceeded`;
    default:
      return chalk.gray(statusTitleCase);
  }
}

// Builds a deep link to the vercel dashboard resource page
function resourceLink(
  output: Output,
  orgSlug: string,
  resource: { id: string; name?: string }
): string | undefined {
  if (!resource.name) {
    return;
  }

  const projectUrl = `https://vercel.com/${orgSlug}/~`;
  return output.link(
    resource.name,
    `${projectUrl}/stores/integration/${resource.id}`,
    { fallback: () => resource.name ?? '–', color: false }
  );
}

// Builds a deep link to the integration dashboard
function integrationLink(
  output: Output,
  integration: { integration?: string; configurationId?: string },
  team: Team
): string | undefined {
  if (!integration.integration) {
    return;
  }

  if (!integration.configurationId) {
    return integration.integration;
  }

  const boldName = chalk.bold(integration.integration);
  const integrationDeepLink = buildSSOLink(team, integration.configurationId);
  return output.link(boldName, integrationDeepLink, {
    fallback: () => boldName,
    color: false,
  });
}
