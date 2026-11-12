import http from 'node:http';
import { createRequire } from 'node:module';

// express ships no types and the project does not add any, so the module is
// loaded as unknown and each value is checked at runtime before it is used.
const require = createRequire(import.meta.url);
/** @type {unknown} */
const express = require('express');

/**
 * @param {unknown} value
 * @param {string} what
 * @returns {asserts value is object}
 */
function assertObjectLike(value, what) {
  if (
    (typeof value !== 'object' && typeof value !== 'function') ||
    value === null
  )
    throw new Error(`express test server: ${what} is not an object`);
}

/**
 * Calls a method that must exist, with the object as its receiver.
 * @param {unknown} target
 * @param {string} name
 * @param {unknown[]} args
 * @returns {unknown}
 */
function callMethod(target, name, args) {
  assertObjectLike(target, name);
  /** @type {unknown} */
  const method = Reflect.get(target, name);
  if (typeof method !== 'function')
    throw new Error(`express test server: ${name} is not a function`);
  /** @type {unknown} */
  const result = Reflect.apply(method, target, args);
  return result;
}

/**
 * Serves a directory with express.static on a free port, for tests that need
 * a page they can change.
 * @param {string} dir
 * @param {(pathname: string) => void} [onRequest] called with each request path
 * @returns {Promise<http.Server>} the listening server
 */
export async function serveDirectory(dir, onRequest) {
  if (typeof express !== 'function')
    throw new Error('express test server: express is not a function');
  /** @type {unknown} */
  let app = Reflect.apply(express, undefined, []);
  if (onRequest) {
    const record = (
      /** @type {unknown} */ request,
      /** @type {unknown} */ _response,
      /** @type {unknown} */ next
    ) => {
      assertObjectLike(request, 'request');
      /** @type {unknown} */
      const pathname = Reflect.get(request, 'path');
      if (typeof pathname !== 'string')
        throw new Error('express test server: request.path is not a string');
      onRequest(pathname);
      if (typeof next !== 'function')
        throw new Error('express test server: next is not a function');
      Reflect.apply(next, undefined, []);
    };
    app = callMethod(app, 'use', [record]);
  }
  app = callMethod(app, 'use', [callMethod(express, 'static', [dir])]);
  const server = callMethod(app, 'listen', [0]);
  if (!(server instanceof http.Server))
    throw new Error('express test server: listen did not return a server');
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
}
