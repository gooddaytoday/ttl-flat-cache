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

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as flatCache from "flat-cache";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(duration);
dayjs.extend(relativeTime);

interface CacheOptions {

    ns?: string;
    dir?: string;
    ttl?: number;
}

/**
 * The `Cache` class is a cache implementation that allows storing and retrieving data with an optional time-to-live (TTL) value.
 * It uses the `flat-cache` library to persist the cache data to disk.
 */
export default class Cache {
    private dir: string;
    private ns: string;
    private defaultTTL: number | null;
    private cache: flatCache.Cache;

    constructor(options: CacheOptions = { ns: "default", ttl: undefined }) {
        const { ns = "default", dir, ttl } = options;
        this.ns = ns;

        const cacheDir = dir && fs.existsSync(path.dirname(dir)) ? dir : path.join(os.tmpdir(), "cache", ns);
        this.dir = cacheDir;

        this.defaultTTL = !isNaN(Number(ttl)) ? Number(ttl) : null;
        this.cache = flatCache.load(ns, this.dir);
    }

    /**
     * Checks if a key has expired.
     * @param expires - The expiration date of the key.
     * @param returnTTL - Whether to return the remaining time-to-live (TTL) as a human-readable string.
     * @returns - True if the key has expired, or the remaining time-to-live (TTL) as a string if returnTTL is true.
     */
    private isExpired(expires: Date | null, returnTTL: boolean = false): boolean | string {
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
     * @param key - The key to invalidate.
     * @returns - The remaining time-to-live (TTL) as a string if the key has not expired, or null if the key has expired.
     */
    private invalidateKey(key: string): string | null {
        const data = this.cache.getKey(key);

        if (data && data.expires) {
            if (this.isExpired(data.expires)) {
                this.cache.removeKey(key);
                return null;
            } else {
                const remainingTTL = <string>this.isExpired(data.expires, true);
                return remainingTTL ? remainingTTL : null;
            }
        }
        return null;
    }

    /**
     * Returns all the data stored in the cache.
     * @returns {Object} - An object with all the cached data.
     */
    public all(): Record<string, any> {
        const data = this.cache.all();

        Object.keys(data).forEach(key => {
            if (this.isExpired(data[key].expires)) {
                delete data[key];
                this.cache.removeKey(key);
            } else {
                data[key] = data[key].value;
            }
        });

        return data;
    }

    /**
     * Retrieves the value associated with the specified key from the cache.
     * @param key - The key to retrieve the value for.
     * @returns - The value associated with the key, or null if the key is expired or does not exist.
     */
    public get(key: string): any {
        this.invalidateKey(key);
        const data = this.cache.getKey(key);
        return data ? data.value : null;
    }

    /**
     * Deletes the value associated with the specified key from the cache.
     * @param key - The key to delete.
     * @returns - True if the key was deleted, false otherwise.
     */
    public del(key: string): void {
        this.cache.removeKey(key);
    }

    /**
     * Returns the remaining time-to-live (TTL) of the specified key.
     * @param key - The key to get the remaining TTL for.
     * @returns - An object containing the key and the remaining time-to-live (TTL) as a string, or null if the key is expired or does not exist.
     */
    public ttl(key: string): { key: string; expires: string | null } {
        return { key, expires: this.invalidateKey(key) };
    }

    /**
     * Sets the value associated with the specified key in the cache.
     * @param key - The key to set the value for.
     * @param value - The value to set.
     * @param [ttl] - The time-to-live (TTL) value for the key. If not provided, the default TTL will be used.
     * @returns - True if the value was set successfully, false otherwise.
     */
    public set(key: string, value: any, ttl?: number): void {
        const effectiveTTL = to_num(ttl) || to_num(this.defaultTTL);

        const data = {
            expires: effectiveTTL ? dayjs().add(effectiveTTL, "seconds").toDate() : null,
            value,
        };

        this.cache.setKey(key, data);
    }

    /**
     * Saves the cache without pruning.
     * @param noPrune - whether to prune the cache or not
     */
    public save(noPrune: boolean = true): void {
        this.cache.save(noPrune);
    }

    /** Destroy the file cache and cache content. */
    public destroy(): void {
        this.cache.destroy();
    }
}

function to_num(val: any): number {
  return !isNaN(Number(val)) ? Number(val) : 0;
}