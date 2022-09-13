import ms from 'ms';
import { join } from 'path';
import { remove } from 'fs-extra';
import { getWriteableDirectory } from '@vercel/build-utils';
import { client } from '../../../mocks/client';
import {
  importBuilders,
  resolveBuilders,
} from '../../../../src/util/build/import-builders';
import vercelNextPkg from '@vercel/next/package.json';
import vercelNodePkg from '@vercel/node/package.json';

jest.setTimeout(ms('30 seconds'));

describe('importBuilders()', () => {
  it('should import built-in Builders', async () => {
    const specs = new Set(['@vercel/node', '@vercel/next']);
    const builders = await importBuilders(specs, process.cwd(), client.output);
    expect(builders.size).toEqual(2);
    expect(builders.get('@vercel/node')?.pkg).toMatchObject(vercelNodePkg);
    expect(builders.get('@vercel/next')?.pkg).toMatchObject(vercelNextPkg);
    expect(typeof builders.get('@vercel/node')?.builder.build).toEqual(
      'function'
    );
    expect(typeof builders.get('@vercel/next')?.builder.build).toEqual(
      'function'
    );
  });

  it('should import built-in Builders using `@latest`', async () => {
    const specs = new Set(['@vercel/node@latest', '@vercel/next@latest']);
    const builders = await importBuilders(specs, process.cwd(), client.output);
    expect(builders.size).toEqual(2);
    expect(builders.get('@vercel/node@latest')?.pkg).toMatchObject(
      vercelNodePkg
    );
    expect(builders.get('@vercel/next@latest')?.pkg).toMatchObject(
      vercelNextPkg
    );
    expect(typeof builders.get('@vercel/node@latest')?.builder.build).toEqual(
      'function'
    );
    expect(typeof builders.get('@vercel/next@latest')?.builder.build).toEqual(
      'function'
    );
  });

  it('should import built-in Builders using `@canary`', async () => {
    const specs = new Set(['@vercel/node@canary', '@vercel/next@canary']);
    const builders = await importBuilders(specs, process.cwd(), client.output);
    expect(builders.size).toEqual(2);
    expect(builders.get('@vercel/node@canary')?.pkg).toMatchObject(
      vercelNodePkg
    );
    expect(builders.get('@vercel/next@canary')?.pkg).toMatchObject(
      vercelNextPkg
    );
    expect(typeof builders.get('@vercel/node@canary')?.builder.build).toEqual(
      'function'
    );
    expect(typeof builders.get('@vercel/next@canary')?.builder.build).toEqual(
      'function'
    );
  });

  it('should install and import 1st party Builders with explicit version', async () => {
    if (process.platform === 'win32') {
      // this test creates symlinks which require admin by default on Windows
      console.log('Skipping test on Windows');
      return;
    }

    const cwd = await getWriteableDirectory();
    try {
      const spec = '@vercel/node@2.0.0';
      const specs = new Set([spec]);
      const builders = await importBuilders(specs, cwd, client.output);
      expect(builders.size).toEqual(1);
      expect(builders.get(spec)?.pkg.name).toEqual('@vercel/node');
      expect(builders.get(spec)?.pkg.version).toEqual('2.0.0');
      expect(typeof builders.get(spec)?.builder.build).toEqual('function');
      await expect(client.stderr).toOutput(
        '> Installing Builder: @vercel/node'
      );
    } finally {
      await remove(cwd);
    }
  });

  it('should install and import 3rd party Builders', async () => {
    if (process.platform === 'win32') {
      // this test creates symlinks which require admin by default on Windows
      console.log('Skipping test on Windows');
      return;
    }

    const cwd = await getWriteableDirectory();
    try {
      const spec = 'vercel-deno@2.0.1';
      const tarballSpec = 'https://test2020-h5hdll5dz-tootallnate.vercel.app';
      const specs = new Set([spec, tarballSpec]);
      const builders = await importBuilders(specs, cwd, client.output);
      expect(builders.size).toEqual(2);
      expect(builders.get(spec)?.pkg.name).toEqual('vercel-deno');
      expect(builders.get(spec)?.pkg.version).toEqual('2.0.1');
      expect(builders.get(spec)?.pkgPath).toEqual(
        join(cwd, '.vercel/builders/node_modules/vercel-deno/package.json')
      );
      expect(typeof builders.get(spec)?.builder.build).toEqual('function');
      expect(builders.get(tarballSpec)?.pkg.name).toEqual('vercel-bash');
      expect(builders.get(tarballSpec)?.pkg.version).toEqual('4.1.0');
      expect(builders.get(tarballSpec)?.pkgPath).toEqual(
        join(cwd, '.vercel/builders/node_modules/vercel-bash/package.json')
      );
      expect(typeof builders.get(tarballSpec)?.builder.build).toEqual(
        'function'
      );
      await expect(client.stderr).toOutput(
        '> Installing Builders: vercel-deno@2.0.1, https://test2020-h5hdll5dz-tootallnate.vercel.app'
      );
    } finally {
      await remove(cwd);
    }
  });

  it('should install and import legacy `@now/build-utils` Builders', async () => {
    if (process.platform === 'win32') {
      // this test creates symlinks which require admin by default on Windows
      console.log('Skipping test on Windows');
      return;
    }

    const cwd = await getWriteableDirectory();
    try {
      const spec = '@frontity/now@1.2.0';
      const specs = new Set([spec]);
      const builders = await importBuilders(specs, cwd, client.output);
      expect(builders.size).toEqual(1);
      expect(builders.get(spec)?.pkg.name).toEqual('@frontity/now');
      expect(builders.get(spec)?.pkg.version).toEqual('1.2.0');
      expect(builders.get(spec)?.pkgPath).toEqual(
        join(cwd, '.vercel/builders/node_modules/@frontity/now/package.json')
      );
      expect(typeof builders.get(spec)?.builder.build).toEqual('function');
    } finally {
      await remove(cwd);
    }
  });

  it('should throw when importing a Builder that is not on npm registry', async () => {
    let err: Error | undefined;
    const cwd = await getWriteableDirectory();
    try {
      const spec = '@vercel/does-not-exist@0.0.1';
      const specs = new Set([spec]);
      await importBuilders(specs, cwd, client.output);
    } catch (_err) {
      err = _err;
    } finally {
      await remove(cwd);
    }

    if (!err) {
      throw new Error('Expected `err` to be defined');
    }

    expect(err.message).toEqual(
      'The package `@vercel/does-not-exist` is not published on the npm registry'
    );
    expect((err as any).link).toEqual(
      'https://vercel.link/builder-dependencies-install-failed'
    );
  });
});

describe('resolveBuilders()', () => {
  it('should return builders to install when missing', async () => {
    const specs = new Set(['@vercel/does-not-exist']);
    const result = await resolveBuilders(process.cwd(), specs, client.output);
    if (!('buildersToAdd' in result)) {
      throw new Error('Expected `buildersToAdd` to be defined');
    }
    expect([...result.buildersToAdd]).toEqual(['@vercel/does-not-exist']);
  });

  it('should throw error when `MODULE_NOT_FOUND` on 2nd pass', async () => {
    let err: Error | undefined;
    const specs = new Set(['@vercel/does-not-exist']);

    // The empty Map represents `resolveBuilders()` being invoked after the install step
    try {
      await resolveBuilders(process.cwd(), specs, client.output, new Map());
    } catch (_err: any) {
      err = _err;
    }

    if (!err) {
      throw new Error('Expected `err` to be defined');
    }

    expect(
      err.message.startsWith('Importing "@vercel/does-not-exist": Cannot')
    ).toEqual(true);
  });
});
