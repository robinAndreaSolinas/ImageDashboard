import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_TTL = Number(process.env.REDIS_TTL || 3600);
const CHANNEL = 'dashboard:updated';
const KEY_PREFIX = 'dashboard:data:';

let redis = null;
let subscriber = null;

export function cacheKey(from) {
  return from ? `${KEY_PREFIX}from:${from}` : `${KEY_PREFIX}default`;
}

export async function connectRedis() {
  if (!REDIS_URL) {
    console.log('Redis disabilitato (REDIS_URL non impostato)');
    return null;
  }

  redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('Redis error:', err.message));
  await redis.connect();
  subscriber = redis.duplicate();
  subscriber.on('error', (err) => console.error('Redis sub error:', err.message));
  await subscriber.connect();
  console.log(`✅ Redis connected at ${REDIS_URL}`);
  return redis;
}

export function redisStatus() {
  if (!REDIS_URL) return 'disabled';
  if (redis?.isOpen) return 'connected';
  return 'error';
}

export async function cacheGet(from) {
  if (!redis?.isOpen) return null;
  const raw = await redis.get(cacheKey(from));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheSet(from, payload) {
  if (!redis?.isOpen) return;
  await redis.set(cacheKey(from), JSON.stringify(payload), { EX: REDIS_TTL });
}

export async function cacheDelDefault() {
  if (!redis?.isOpen) return;
  await redis.del(cacheKey(null));
}

export async function publishUpdate(payload = {}) {
  if (!redis?.isOpen) return;
  await redis.publish(CHANNEL, JSON.stringify({ at: Date.now(), ...payload }));
}

export async function subscribeUpdates(handler) {
  if (!subscriber?.isOpen) return () => {};
  await subscriber.subscribe(CHANNEL, (message) => {
    try {
      handler(JSON.parse(message));
    } catch {
      handler({});
    }
  });
  return async () => {
    try {
      await subscriber.unsubscribe(CHANNEL);
    } catch {
      /* ignore */
    }
  };
}

export async function closeRedis() {
  if (subscriber?.isOpen) await subscriber.quit();
  if (redis?.isOpen) await redis.quit();
}
