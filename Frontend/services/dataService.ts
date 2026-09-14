import { DataItem } from '../types';

// In production, API is served from the same origin, so use relative URL
// In development, use the configured API URL or default to localhost:3001
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

// Mock data generator (fallback)
const DOMAINS = ['repubblica.it', 'corriere.it', 'gazzetta.it', 'ansa.it', 'wired.it'];
const EXTENSIONS = ['jpg', 'png', 'webp', 'gif'];
const SOURCES = ['Redazione Milano', 'Redazione Roma', 'Esteri', 'Sport Desk', 'Tech Team'];

const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

const generateUrl = (domain: string, type: 'sch' | 'flash' | 'art') => {
  const base = `https://www.${domain}/`;
  const slug = Math.random().toString(36).substring(7);
  if (type === 'sch') return `${base}sch-${slug}`;
  if (type === 'flash') return `${base}${slug}-sck`;
  return `${base}articolo-${slug}`;
};

export const generateMockData = (count: number = 500): DataItem[] => {
  const data: DataItem[] = [];
  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  for (let i = 0; i < count; i++) {
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    
    // Determine Type for URL generation
    const typeRoll = Math.random();
    let typeKey: 'sch' | 'flash' | 'art' = 'art';
    if (typeRoll < 0.2) typeKey = 'sch';
    else if (typeRoll < 0.4) typeKey = 'flash';

    const url = generateUrl(domain, typeKey);
    const isOg = Math.random() < 0.1; // 10% chance of being an OG image placeholer
    const imageUrl = isOg ? 'https://example.com/og/default.png' : `https://picsum.photos/id/${i}/800/600`;
    
    // Width logic: skewed distribution
    let width = Math.floor(Math.random() * 2500) + 200;
    // Bias towards standard sizes
    if (Math.random() > 0.5) width = [640, 1080, 1200, 1920][Math.floor(Math.random() * 4)];

    const height = Math.floor(width * (Math.random() * 0.5 + 0.5)); // Aspect ratio variation
    
    data.push({
      id: `id-${i}`,
      url,
      domain,
      image_url: imageUrl,
      image_width: isOg ? 0 : width,
      image_height: isOg ? 0 : height,
      image_extension: EXTENSIONS[Math.floor(Math.random() * EXTENSIONS.length)],
      image_weight: Math.floor(Math.random() * 500) + 10, // 10kb to 510kb
      has_video: Math.random() > 0.7,
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      published_at: randomDate(threeMonthsAgo, now),
      fetched_at: randomDate(threeMonthsAgo, now),
    });
  }
  return data;
};

// Default block = last 30 days (rolling). Historical blocks use their date as key.
const CACHE_KEY_DEFAULT = 'datascope_cache_latest';
const CACHE_KEY_HISTORICAL = (from: string) => `datascope_cache_${from}`;

// Default block expires in 1 hour; historical blocks are immutable — 7 days TTL
const CACHE_DURATION_DEFAULT = 60 * 60 * 1000;
const CACHE_DURATION_HISTORICAL = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  data: DataItem[];
  timestamp: number;
}

const getCachedData = (cacheKey: string, maxAge: number): DataItem[] | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    
    if (age < maxAge) {
      console.log(`Using cached data [${cacheKey}] (age: ${Math.round(age / 1000 / 60)} min)`);
      return entry.data;
    }
    
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

const setCachedData = (cacheKey: string, data: DataItem[]): void => {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log(`Data cached [${cacheKey}]`);
  } catch (error) {
    console.error('Error saving cache:', error);
  }
};

// Fetch real data from API
// blockFrom: 'YYYY-MM-DD' for a fixed historical block, undefined for the default rolling block
export const fetchDataFromAPI = async (forceRefresh: boolean = false, blockFrom?: string): Promise<DataItem[]> => {
  const isHistorical = Boolean(blockFrom);
  const cacheKey = isHistorical ? CACHE_KEY_HISTORICAL(blockFrom!) : CACHE_KEY_DEFAULT;
  const cacheDuration = isHistorical ? CACHE_DURATION_HISTORICAL : CACHE_DURATION_DEFAULT;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey, cacheDuration);
    if (cached) return cached;
  }

  try {
    const url = blockFrom ? `${API_URL}/api/data?from=${blockFrom}` : `${API_URL}/api/data`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      setCachedData(cacheKey, result.data);
      return result.data;
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    console.error(`Error fetching data [blockFrom=${blockFrom ?? 'default'}]:`, error);

    // Fallback: return stale cache if available
    const stale = getCachedData(cacheKey, Infinity);
    if (stale) {
      console.log('Using stale cache as fallback');
      return stale;
    }

    if (!isHistorical) {
      console.warn('Falling back to mock data');
      return generateMockData(800);
    }

    return [];
  }
};

export const subscribeLiveUpdates = (onUpdate: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  const es = new EventSource(`${API_URL}/api/events`);
  es.addEventListener('update', () => {
    onUpdate();
  });
  return () => es.close();
};
