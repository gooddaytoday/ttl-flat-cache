// Copyright 2021 Anthony Mugendi
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Copyright 2021 Anthony Mugendi
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  flatCache = require("flat-cache"),
  dayjs = require("dayjs"),
  duration = require("dayjs/plugin/duration"),
  relativeTime = require("dayjs/plugin/relativeTime");

//   extend dayjs
dayjs.extend(duration);
dayjs.extend(relativeTime);

/**
 * The `Cache` class is a cache implementation that allows storing and retrieving data with an optional time-to-live (TTL) value.
 * It uses the `flat-cache` library to persist the cache data to disk.
 */
class Cache {
  /**
   * Initializes a new cache instance with the provided options.
   * @param {Object} options - The cache options.
   * @param {string} options.ns - The namespace for the cache.
   * @param {string} options.dir - The directory path to store the cache data.
   * @param {number} options.ttl - The default time-to-live (TTL) value for cached data.
   */
  constructor(options) {
    options = Object.assign({ ns: "default", ttl: null }, options);
    let { ns, dir, ttl } = options;

    ns = ns || "default";
    dir = dir && fs.existsSync(path.dirname(dir)) ? dir : null;
    dir = path.join(os.tmpdir(), "cache", ns);

    this.defaultTTL = isNaN(Number(ttl)) ? null : Number(ttl);
    this.cache = flatCache.load(ns, dir);

    this.getKey = this.get;
    this.setKey = this.set;
    this.removeKey = this.del;
    this.clearAll = function () {
      flatCache.clearAll(dir);
    };
    this.clearCacheById = function () {
      flatCache.clearCacheById(ns, dir);
    };
  }

  /**
   * Checks if a key has expired.
   * @private
   * @param {Date} expires - The expiration date of the key.
   * @param {boolean} returnTTL - Whether to return the remaining time-to-live (TTL) as a human-readable string.
   * @returns {boolean|string} - True if the key has expired, or the remaining time-to-live (TTL) as a string if returnTTL is true.
   */
  __isExpired(expires, returnTTL = false) {
    if (expires) {
      const exp = dayjs(expires);
      const now = dayjs();

      if (returnTTL) {
        return dayjs.duration(exp.diff(now)).humanize(true);
      }

      return now.isAfter(exp);
    }

    return false;
  }

  /**
   * Invalidates a key if it has expired.
   * @private
   * @param {string} key - The key to invalidate.
   * @returns {string|null} - The remaining time-to-live (TTL) as a string if the key has not expired, or null if the key has expired.
   */
  __invalidateKey(key) {
    const data = this.cache.getKey(key);

    if (data && data.expires) {
      if (this.__isExpired(data.expires)) {
        this.cache.removeKey(key);
        return null;
      } else {
        const remainingTTL = this.__isExpired(data.expires, true);
        return remainingTTL ? remainingTTL : null;
      }
    }
  }

  /**
   * Returns all the data stored in the cache.
   * @returns {Object} - An object with all the cached data.
   */
  all() {
    const data = this.cache.all();

    for (const key in data) {
      if (this.__isExpired(data[key].expires)) {
        data[key] = null;
        this.cache.removeKey(key);
      } else {
        data[key] = data[key].value;
      }
    }

    return data;
  }

  /**
   * Retrieves the value associated with the specified key from the cache.
   * @param {string} key - The key to retrieve the value for.
   * @returns {*} - The value associated with the key, or null if the key is expired or does not exist.
   */
  get(key) {
    this.__invalidateKey(key);
    const data = this.cache.getKey(key);
    return data ? data.value : null;
  }

  /**
   * Deletes the value associated with the specified key from the cache.
   * @param {string} key - The key to delete.
   * @returns {boolean} - True if the key was deleted, false otherwise.
   */
  del(key) {
    return this.cache.removeKey(key);
  }

  /**
   * Returns the remaining time-to-live (TTL) of the specified key.
   * @param {string} key - The key to get the remaining TTL for.
   * @returns {Object} - An object containing the key and the remaining time-to-live (TTL) as a string, or null if the key is expired or does not exist.
   */
  ttl(key) {
    return { key, expires: this.__invalidateKey(key) };
  }

  /**
   * Sets the value associated with the specified key in the cache.
   * @param {string} key - The key to set the value for.
   * @param {*} value - The value to set.
   * @param {number} [ttl] - The time-to-live (TTL) value for the key. If not provided, the default TTL will be used.
   * @returns {void}
   */
  set(key, value, ttl) {
    ttl = to_num(ttl) || to_num(this.defaultTTL);

    const data = {
      expires: ttl ? dayjs().add(ttl, "seconds").toDate() : null,
      value,
    };

    this.cache.setKey(key, data);
  }

  /**
   * Saves the cache without pruning.
   * @param {boolean} [noPrune=true] - whether to prune the cache or not
   * @return {void}
   */
  save(noPrune = true){
    this.cache.save(noPrune);
  }
}


function to_num(val){
  return !isNaN(Number(val)) ? Number(val) : 0 ;
}

module.exports = (options = {}) => new Cache(options);
