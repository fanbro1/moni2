/**
 * This converts Superstatic configuration to Now.json Routes
 * See https://github.com/firebase/superstatic#configuration
 */

import pathToRegexp from 'path-to-regexp';
import { Route, NowRedirect, NowRewrite, NowHeader } from './types';

export function convertCleanUrls(filePaths: string[]): Route[] {
  const htmlFiles = filePaths
    .map(toRoute)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      html: f,
      clean: f.slice(0, -5),
    }));

  const redirects: Route[] = htmlFiles.map(o => ({
    src: o.html,
    headers: { Location: o.clean },
    status: 301,
  }));

  const rewrites: Route[] = htmlFiles.map(o => ({
    src: o.clean,
    dest: o.html,
    continue: true,
  }));

  return redirects.concat(rewrites);
}

export function convertRedirects(redirects: NowRedirect[]): Route[] {
  return redirects.map(r => {
    const { src, segments } = sourceToRegex(r.source);
    const loc = replaceSegments(segments, r.destination);
    return {
      src,
      headers: { Location: loc },
      status: r.statusCode || 307,
    };
  });
}

export function convertRewrites(rewrites: NowRewrite[]): Route[] {
  const routes: Route[] = rewrites.map(r => {
    const { src, segments } = sourceToRegex(r.source);
    const dest = replaceSegments(segments, r.destination);
    return { src, dest, continue: true };
  });
  routes.unshift({ handle: 'filesystem' });
  return routes;
}

export function convertHeaders(headers: NowHeader[]): Route[] {
  return headers.map(h => {
    const obj: { [key: string]: string } = {};
    h.headers.forEach(kv => {
      obj[kv.key] = kv.value;
    });
    return {
      src: h.source,
      headers: obj,
      continue: true,
    };
  });
}

export function convertTrailingSlash(enable: boolean): Route[] {
  const routes: Route[] = [];
  if (enable) {
    routes.push({
      src: '^(.*[^\\/])$',
      headers: { Location: '$1/' },
      status: 307,
    });
  } else {
    routes.push({
      src: '^(.*)\\/$',
      headers: { Location: '$1' },
      status: 307,
    });
  }
  return routes;
}

function sourceToRegex(source: string): { src: string; segments: string[] } {
  const keys: pathToRegexp.Key[] = [];
  const r = pathToRegexp(source, keys, { strict: true });
  const segments = keys.map(k => k.name).filter(isString);
  return { src: r.source, segments };
}

function isString(key: any): key is string {
  return typeof key === 'string';
}

function replaceSegments(segments: string[], destination: string): string {
  if (destination.includes(':')) {
    segments.forEach((name, index) => {
      const r = new RegExp(':' + name, 'g');
      destination = destination.replace(r, toSegmentDest(index));
    });
  } else if (segments.length > 0) {
    let prefix = '?';
    segments.forEach((name, index) => {
      destination += `${prefix}${name}=${toSegmentDest(index)}`;
      prefix = '&';
    });
  }
  return destination;
}

function toSegmentDest(index: number): string {
  const i = index + 1; // js is base 0, regex is base 1
  return '$' + i.toString();
}

function toRoute(filePath: string): string {
  return filePath.startsWith('/') ? filePath : '/' + filePath;
}
