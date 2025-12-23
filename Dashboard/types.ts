export interface DataItem {
  id: string;
  url: string;
  domain: string;
  image_url: string;
  image_width: number;
  image_height: number;
  image_extension: string;
  image_weight: number; // in KB
  has_video: boolean;
  source: string;
  published_at: string; // ISO date string
  fetched_at: string; // ISO date string
}

export enum QualityClass {
  LOW = 'Bassa', // <= 500
  MEDIUM = 'Media', // 501-1199
  HIGH = 'Alta', // 1200-1999
  VERY_HIGH = 'Altissima', // >= 2000
  NO_IMAGE = 'Senza Immagine', // url contains /og/
}

export enum Orientation {
  LANDSCAPE = 'Orizzontale',
  PORTRAIT = 'Verticale',
  SQUARE = 'Quadrata',
  UNKNOWN = 'Sconosciuto',
}

export enum ContentType {
  SCHEDE = 'Schede', // starts with sch-
  SCHEDE_FLASH = 'Schede Flash', // ends with -sck
  ARTICOLI = 'Articoli', // rest
}

export interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  selectedDomains: string[];
  qualities: QualityClass[];
  extensions: string[];
  hasVideo: boolean | null; // null means 'all'
  sources: string[];
  orientations: Orientation[];
  types: ContentType[];
}
