import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import { REDIS_CLIENT } from "./redis.constants";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly defaultTTL = 300;
  private readonly memoryStore = new Map<string, { value: string; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {
    if (!this.redis) {
      this.cleanupTimer = setInterval(() => this.evictExpired(), 30000);
    }
  }

  private evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore) {
      if (entry.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  private memGet(key: string): string | null {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  private memSet(key: string, value: string, ttl: number) {
    this.memoryStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  async get<T = string>(key: string): Promise<T | null> {
    if (!this.redis) {
      const raw = this.memGet(key);
      if (!raw) return null;
      try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
    }
    const raw = await this.redis.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultTTL;
    if (!this.redis) { this.memSet(key, serialized, ttl); return; }
    await this.redis.setex(key, ttl, serialized);
  }

  async del(key: string): Promise<void> {
    if (!this.redis) { this.memoryStore.delete(key); return; }
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.redis) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      for (const key of this.memoryStore.keys()) {
        if (regex.test(key)) this.memoryStore.delete(key);
      }
      return;
    }
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return this.memGet(key) !== null;
    return (await this.redis.exists(key)) === 1;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.redis) {
      const current = this.memGet(key);
      const next = (current ? parseInt(current, 10) : 0) + 1;
      this.memSet(key, String(next), ttlSeconds ?? this.defaultTTL);
      return next;
    }
    const count = await this.redis.incr(key);
    if (ttlSeconds && count === 1) await this.redis.expire(key, ttlSeconds);
    return count;
  }

  async setHash(key: string, field: string, value: unknown): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (!this.redis) {
      const existing = this.memGet(key);
      const hash: Record<string, string> = existing ? JSON.parse(existing) : {};
      hash[field] = serialized;
      this.memSet(key, JSON.stringify(hash), this.defaultTTL);
      return;
    }
    await this.redis.hset(key, field, serialized);
  }

  async getHash<T = string>(key: string, field: string): Promise<T | null> {
    if (!this.redis) {
      const raw = this.memGet(key);
      if (!raw) return null;
      const hash: Record<string, string> = JSON.parse(raw);
      const val = hash[field];
      if (!val) return null;
      try { return JSON.parse(val) as T; } catch { return val as unknown as T; }
    }
    const raw = await this.redis.hget(key, field);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  }

  async getAllHash<T = Record<string, unknown>>(key: string): Promise<T | null> {
    if (!this.redis) {
      const raw = this.memGet(key);
      if (!raw) return null;
      const hash: Record<string, unknown> = {};
      const parsed: Record<string, string> = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        try { hash[k] = JSON.parse(v); } catch { hash[k] = v; }
      }
      return hash as T;
    }
    const raw = await this.redis.hgetall(key);
    if (!raw || Object.keys(raw).length === 0) return null;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      try { result[k] = JSON.parse(v as string); } catch { result[k] = v; }
    }
    return result as T;
  }

  async delHash(key: string, field: string): Promise<void> {
    if (!this.redis) {
      const raw = this.memGet(key);
      if (!raw) return;
      const hash: Record<string, string> = JSON.parse(raw);
      delete hash[field];
      this.memSet(key, JSON.stringify(hash), this.defaultTTL);
      return;
    }
    await this.redis.hdel(key, field);
  }

  async pushToList(key: string, ...values: unknown[]): Promise<void> {
    const serialized = values.map((v) => typeof v === "string" ? v : JSON.stringify(v));
    if (!this.redis) {
      const raw = this.memGet(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      list.push(...serialized);
      this.memSet(key, JSON.stringify(list), this.defaultTTL);
      return;
    }
    await this.redis.rpush(key, ...serialized);
  }

  async popFromList<T = string>(key: string, count = 1): Promise<T[]> {
    if (!this.redis) {
      const raw = this.memGet(key);
      if (!raw) return [];
      const list: string[] = JSON.parse(raw);
      const items = list.splice(0, count);
      this.memSet(key, JSON.stringify(list), this.defaultTTL);
      return items.map((item) => { try { return JSON.parse(item) as T; } catch { return item as unknown as T; } });
    }
    const items = await this.redis.lrange(key, 0, count - 1);
    await this.redis.ltrim(key, count, -1);
    return items.map((item: string) => { try { return JSON.parse(item) as T; } catch { return item as unknown as T; } });
  }

  async getListItemCount(key: string): Promise<number> {
    if (!this.redis) {
      const raw = this.memGet(key);
      if (!raw) return 0;
      return (JSON.parse(raw) as string[]).length;
    }
    return this.redis.llen(key);
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.redis) await this.redis.quit();
  }
}
