import assert from 'node:assert/strict';

/** @typedef {{ [key: string]: unknown }} JsonObject */

/**
 * Narrows a value that must be present; fails the test when it is not.
 * @template T
 * @param {T | null | undefined} value
 * @returns {T}
 */
export function present(value) {
  assert.ok(value !== null && value !== undefined, 'value must be present');
  return value;
}

/**
 * @param {unknown} value
 * @returns {value is JsonObject}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {JsonObject}
 */
export function jsonObject(value) {
  if (!isObject(value)) assert.fail('value must be a JSON object');
  return value;
}

/**
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function jsonArray(value) {
  if (!isArray(value)) assert.fail('value must be a JSON array');
  return value;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function jsonString(value) {
  if (typeof value !== 'string') assert.fail('value must be a string');
  return value;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function jsonNumber(value) {
  if (typeof value !== 'number') assert.fail('value must be a number');
  return value;
}

/**
 * Parses JSON text that must hold an object.
 * @param {string} text
 * @returns {JsonObject}
 */
export function parseJsonObject(text) {
  /** @type {unknown} */
  const value = JSON.parse(text);
  return jsonObject(value);
}

/**
 * Calls the original JSON.stringify with the arguments a replacement received,
 * keeping the replacer function, the property list and the indent as given.
 * @param {typeof JSON.stringify} original
 * @param {unknown} value
 * @param {unknown} replacer
 * @param {unknown} space
 * @returns {string}
 */
export function stringifyLike(original, value, replacer, space) {
  const indent =
    typeof space === 'string' || typeof space === 'number' ? space : undefined;
  if (typeof replacer === 'function') {
    /** @type {(this: unknown, key: string, item: unknown) => unknown} */
    const forward = function (key, item) {
      return Reflect.apply(replacer, this, [key, item]);
    };
    return original(value, forward, indent);
  }
  if (isArray(replacer)) {
    // JSON.stringify ignores property-list entries that are not strings or numbers.
    /** @type {Array<string | number>} */
    const names = [];
    for (const name of replacer)
      if (typeof name === 'string' || typeof name === 'number')
        names.push(name);
    return original(value, names, indent);
  }
  return original(value, null, indent);
}

/**
 * Delete a property and fail if the delete is refused (for example a
 * non-configurable property). Like `delete`, an absent key is accepted.
 * @param {object} target
 * @param {PropertyKey} key
 */
export function remove(target, key) {
  assert.ok(
    Reflect.deleteProperty(target, key),
    `could not delete ${String(key)}`
  );
}
