import { DataItem, QualityClass, Orientation, ContentType } from '../types';

// --- Derivation Helpers ---

export const getQuality = (item: DataItem): QualityClass => {
  if (item.image_url.includes('/og/')) return QualityClass.NO_IMAGE;
  const w = item.image_width;
  if (w <= 799) return QualityClass.LOW;
  if (w <= 1199) return QualityClass.MEDIUM;
  if (w <= 1999) return QualityClass.HIGH;
  return QualityClass.VERY_HIGH;
};

export const getOrientation = (item: DataItem): Orientation => {
  if (item.image_width === 0 || item.image_height === 0) return Orientation.UNKNOWN;
  if (item.image_width > item.image_height) return Orientation.LANDSCAPE;
  if (item.image_height > item.image_width) return Orientation.PORTRAIT;
  return Orientation.SQUARE;
};

export const getType = (url: string): ContentType => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(p => p.length > 0);
    const basename = parts.length > 0 ? parts[parts.length - 1] : '';

    if (basename.startsWith('sch-')) return ContentType.SCHEDE;
    if (basename.endsWith('-sck')) return ContentType.SCHEDE_FLASH;
    return ContentType.ARTICOLI;
  } catch (e) {
    return ContentType.ARTICOLI;
  }
};

// --- Statistics Helpers ---

export const calculateGaussian = (data: number[]) => {
  if (data.length === 0) return [];
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / data.length);
  
  // Generate points for the curve
  const points = [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const step = (max - min) / 50; // 50 points resolution

  for (let x = min; x <= max; x += step) {
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    points.push({ x: Math.round(x), density: y });
  }
  return points;
};

// Identify "Trash" images
// Heuristic: High weight but Low/Medium quality, or very small dimensions but non-zero weight
export const getTopTrash = (items: DataItem[]): DataItem[] => {
  return [...items]
    .filter(item => !item.image_url.includes('/og/')) // Exclude placeholders from trash calc
    .map(item => {
      // Score calculation: Higher is trashier
      // Penalize heavy images with small dimensions
      const pixels = Math.max(1, item.image_width * item.image_height);
      const efficiency = item.image_weight / pixels; 
      
      // Bonus penalty for extremely low res
      const lowResPenalty = item.image_width < 300 ? 5 : 1;
      
      return { ...item, trashScore: efficiency * lowResPenalty };
    })
    // Ordina prima per larghezza (peggior width = più piccola), poi per trashScore
    .sort((a: any, b: any) => {
      if (a.image_width !== b.image_width) {
        return a.image_width - b.image_width; // width crescente: peggiori (più strette) in alto
      }
      return b.trashScore - a.trashScore;
    })
    .slice(0, 10);
};
