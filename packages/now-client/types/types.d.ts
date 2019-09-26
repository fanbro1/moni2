declare interface Route {
  src: string;
  dest: string;
  headers?: {
    [key: string]: string;
  };
  status?: number;
  methods?: string[];
}

declare interface Build {
  src: string;
  use: string;
}

declare interface Deployment {
  id: string;
  deploymentId?: string;
  url: string;
  name: string;
  meta: {
    [key: string]: string | number | boolean;
  };
  version: number;
  regions: string[];
  routes: Route[];
  builds: Build[];
  plan: string;
  public: boolean;
  ownerId: string;
  readyState:
    | 'INITIALIZING'
    | 'ANALYZING'
    | 'BUILDING'
    | 'DEPLOYING'
    | 'READY'
    | 'ERROR';
  state?:
    | 'INITIALIZING'
    | 'ANALYZING'
    | 'BUILDING'
    | 'DEPLOYING'
    | 'READY'
    | 'ERROR';
  createdAt: string;
  createdIn: string;
  env: {
    [key: string]: string;
  };
  build: {
    env: {
      [key: string]: string;
    };
  };
  target: string;
  alias: string[];
}

declare interface DeploymentBuild {
  id: string;
  use: string;
  createdIn: string;
  deployedTo: string;
  readyState:
    | 'INITIALIZING'
    | 'ANALYZING'
    | 'BUILDING'
    | 'DEPLOYING'
    | 'READY'
    | 'ERROR';
  state?:
    | 'INITIALIZING'
    | 'ANALYZING'
    | 'BUILDING'
    | 'DEPLOYING'
    | 'READY'
    | 'ERROR';
  readyStateAt: string;
  path: string;
}

declare interface DeploymentGithubData {
  enabled: boolean;
  autoAlias: boolean;
  silent: boolean;
  autoJobCancelation: boolean;
}

declare interface DeploymentOptions {
  version?: number;
  regions?: string[];
  routes?: Route[];
  builds?: Build[];
  env?: {
    [key: string]: string;
  };
  build?: {
    env: {
      [key: string]: string;
    };
  };
  target?: string;
  token?: string | null;
  teamId?: string;
  force?: boolean;
  name?: string;
  defaultName?: string;
  isDirectory?: boolean;
  path?: string | string[];
  github?: DeploymentGithubData;
  scope?: string;
  public?: boolean;
  forceNew?: boolean;
  deploymentType?: 'NPM' | 'STATIC' | 'DOCKER';
  registryAuthToken?: string;
  engines?: { [key: string]: string };
  sessionAffinity?: 'ip' | 'random';
  config?: { [key: string]: any };
  debug?: boolean;
}

declare interface NowJsonOptions {
  github?: DeploymentGithubData;
  scope?: string;
  type?: 'NPM' | 'STATIC' | 'DOCKER';
  version?: number;
}

declare type CreateDeploymentFunction = (
  path: string | string[],
  options?: DeploymentOptions
) => AsyncIterableIterator<any>;
