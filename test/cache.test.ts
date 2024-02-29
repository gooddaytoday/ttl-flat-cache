import Cache from "../src/index";
import * as fs from "fs";

describe('Cache', () => {

    // Cache can be instantiated with default options
    it('should instantiate Cache with default options', () => {
      const cache = new Cache();
      expect(cache["defaultTTL"]).toBe(null);
      expect(cache["cache"]).toBeDefined();
    });

    it('should instantiate Cache with custom options', () => {
      const options = { ns: "custom", ttl: 60 };
      const cache = new Cache(options);
      expect(cache["defaultTTL"]).toBe(60);
      expect(cache["cache"]).toBeDefined();
    });

    it('should set a key-value pair in the cache', () => {
      const cache = new Cache();
      cache.set("key", "value", 60);
      expect(cache.get("key")).toBe("value");
    });

    // Cache can delete a value from the cache by key
    it('should delete a value from the cache by key', () => {
      const cache = new Cache();
      cache.set('key1', 'value1');
      cache.del('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('should return the time to live (TTL) of a key', () => {
      const cache = new Cache();
      cache.set('key1', 'value1', 10);
      const ttl = cache.ttl('key1');
      expect(ttl.key).toBe('key1');
      expect(ttl.expires).not.toBeNull();
    });

    // Cache can return all key-value pairs in the cache
    it('should return all key-value pairs in the cache', () => {
      const cache = new Cache();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const data = cache.all();
      expect(data.key1).toBe('value1');
      expect(data.key2).toBe('value2');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    // Cache can clear all key-value pairs in the cache
    it('should clear all key-value pairs in the cache', () => {
      const cache = new Cache();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.save();
      // Check that cache is saved to directory
      expect(fs.existsSync(cache["dir"])).toBeTruthy();

      cache.destroy();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    // Cache can clear a specific key-value pair in the cache
    it('should clear a specific key-value pair in the cache', () => {
      const cache = new Cache();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.del('key2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
    });

    // Cache can handle non-existent keys
    it('should handle non-existent keys', () => {
      const cache = new Cache();

      expect(cache.get('nonexistent')).toBeNull();
    });

    // Cache can handle expired keys
    it('should return null for expired key', () => {
      const cache = new Cache();
      cache.set('key', 'value', 1); // set key with 1 second TTL
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000); // advance time by 2 seconds
      const result = cache.get('key');
      expect(result).toBeNull();
    });

    it('should instantiate multiple instances of Cache with different namespaces', () => {
      const cache1 = new Cache({ ns: "namespace1" });
      const cache2 = new Cache({ ns: "namespace2" });

      expect(cache1["ns"]).toBe("namespace1");
      expect(cache2["ns"]).toBe("namespace2");
    });

    it('should set a key-value pair with a custom TTL', () => {
      const cache = new Cache();
      const key = "key";
      const value = "value";
      const ttl = 60;

      cache.set(key, value, ttl);

      expect(cache.get(key)).toBe(value);
      expect(cache.ttl(key).expires).toBeDefined();
    });

    it('should set a key-value pair with a default TTL', () => {
      const cache = new Cache({ ttl: 60 });
      const key = "key";
      const value = "value";

      cache.set(key, value);

      expect(cache.get(key)).toBe(value);
      expect(cache.ttl(key).expires).toBeDefined();
    });

    it('should return null when getting the TTL of a non-existent key', () => {
      const cache = new Cache();
      const ttl = cache.ttl("nonexistent");
      expect(ttl.expires).toBeNull();
    });

    it('should return null when getting the TTL of an expired key', () => {
      const cache = new Cache();
      cache.set("key", "value", 1); // Set TTL to 1 second
      jest.useFakeTimers();
      jest.advanceTimersByTime(3000); // Advance time by 2 seconds to expire the key
      const ttl = cache.ttl("key");
      expect(ttl.expires).toBeNull();
      jest.useRealTimers();
    });
});
