/**
 * Ghana administrative regions — all 16 as of 2019 reorganisation.
 */
export const GHANA_REGIONS = [
  {
    id: 'greater-accra',
    name: 'Greater Accra',
    capital: 'Accra',
    zone: 'south',
    population_est: 5_400_000,
  },
  {
    id: 'ashanti',
    name: 'Ashanti',
    capital: 'Kumasi',
    zone: 'middle',
    population_est: 5_500_000,
  },
  {
    id: 'western',
    name: 'Western',
    capital: 'Sekondi-Takoradi',
    zone: 'south',
    population_est: 2_400_000,
  },
  {
    id: 'western-north',
    name: 'Western North',
    capital: 'Sefwi Wiawso',
    zone: 'south',
    population_est: 760_000,
  },
  {
    id: 'eastern',
    name: 'Eastern',
    capital: 'Koforidua',
    zone: 'south',
    population_est: 2_600_000,
  },
  {
    id: 'central',
    name: 'Central',
    capital: 'Cape Coast',
    zone: 'south',
    population_est: 2_500_000,
  },
  {
    id: 'volta',
    name: 'Volta',
    capital: 'Ho',
    zone: 'south',
    population_est: 1_900_000,
  },
  {
    id: 'oti',
    name: 'Oti',
    capital: 'Dambai',
    zone: 'middle',
    population_est: 750_000,
  },
  {
    id: 'bono',
    name: 'Bono',
    capital: 'Sunyani',
    zone: 'middle',
    population_est: 1_200_000,
  },
  {
    id: 'bono-east',
    name: 'Bono East',
    capital: 'Techiman',
    zone: 'middle',
    population_est: 1_100_000,
  },
  {
    id: 'ahafo',
    name: 'Ahafo',
    capital: 'Goaso',
    zone: 'middle',
    population_est: 660_000,
  },
  {
    id: 'northern',
    name: 'Northern',
    capital: 'Tamale',
    zone: 'north',
    population_est: 2_700_000,
  },
  {
    id: 'savannah',
    name: 'Savannah',
    capital: 'Damango',
    zone: 'north',
    population_est: 640_000,
  },
  {
    id: 'north-east',
    name: 'North East',
    capital: 'Nalerigu',
    zone: 'north',
    population_est: 620_000,
  },
  {
    id: 'upper-east',
    name: 'Upper East',
    capital: 'Bolgatanga',
    zone: 'north',
    population_est: 1_200_000,
  },
  {
    id: 'upper-west',
    name: 'Upper West',
    capital: 'Wa',
    zone: 'north',
    population_est: 900_000,
  },
] as const;

export type GhanaRegionId = (typeof GHANA_REGIONS)[number]['id'];

export const GHANA_REGION_IDS = GHANA_REGIONS.map((r) => r.id) as GhanaRegionId[];

/**
 * Languages spoken in Ghana (ISO 639-1 / custom codes).
 */
export const GHANA_LANGUAGES = [
  { code: 'en', name: 'English', primary: true },
  { code: 'tw', name: 'Twi (Akan)', primary: true },
  { code: 'gaa', name: 'Ga', primary: false },
  { code: 'ee', name: 'Ewe', primary: false },
  { code: 'dag', name: 'Dagbani', primary: false },
  { code: 'ha', name: 'Hausa', primary: false },
  { code: 'fat', name: 'Fante', primary: false },
  { code: 'nzi', name: 'Nzema', primary: false },
] as const;

export type GhanaLanguageCode = (typeof GHANA_LANGUAGES)[number]['code'];

/**
 * Key public-interest topics for the Ghana pilot.
 * Each topic has keywords used for extraction and a region-weight map for
 * adjusting how strongly each region's signals feed into that topic.
 */
export const GHANA_TOPICS = [
  {
    id: 'economy',
    label: 'Economy & Cost of Living',
    keywords: ['economy', 'inflation', 'prices', 'cost', 'cedis', 'cedi', 'exchange rate', 'dollar'],
    icon: '📈',
    priority: 1,
  },
  {
    id: 'energy',
    label: 'Energy & Dumsor',
    keywords: ['dumsor', 'electricity', 'ecg', 'power cut', 'outage', 'generator', 'fuel', 'petrol', 'diesel'],
    icon: '⚡',
    priority: 2,
  },
  {
    id: 'jobs',
    label: 'Jobs & Unemployment',
    keywords: ['job', 'unemployment', 'work', 'hiring', 'layoff', 'graduate', 'youth', 'employment'],
    icon: '💼',
    priority: 3,
  },
  {
    id: 'education',
    label: 'Education',
    keywords: ['education', 'school', 'free shs', 'bece', 'wassce', 'teacher', 'university', 'students'],
    icon: '🎓',
    priority: 4,
  },
  {
    id: 'healthcare',
    label: 'Healthcare & NHIS',
    keywords: ['health', 'hospital', 'nhis', 'medicine', 'doctor', 'clinic', 'malaria', 'maternal'],
    icon: '🏥',
    priority: 5,
  },
  {
    id: 'infrastructure',
    label: 'Roads & Infrastructure',
    keywords: ['road', 'pothole', 'bridge', 'highway', 'transport', 'trotro', 'traffic', 'construction'],
    icon: '🛣️',
    priority: 6,
  },
  {
    id: 'agriculture',
    label: 'Agriculture & Cocoa',
    keywords: ['cocoa', 'farm', 'cocobod', 'harvest', 'farmer', 'crop', 'drought', 'galamsey'],
    icon: '🌾',
    priority: 7,
  },
  {
    id: 'governance',
    label: 'Governance & Corruption',
    keywords: ['corruption', 'government', 'minister', 'parliament', 'ndc', 'npp', 'political', 'election', 'accountability'],
    icon: '🏛️',
    priority: 8,
  },
  {
    id: 'security',
    label: 'Security & Safety',
    keywords: ['security', 'crime', 'robbery', 'police', 'armed', 'kidnap', 'violent', 'fraud'],
    icon: '🔒',
    priority: 9,
  },
  {
    id: 'digital',
    label: 'Digital & Fintech',
    keywords: ['momo', 'mobile money', 'internet', 'fintech', 'startup', 'digital', 'cybercrime', 'e-levy'],
    icon: '📱',
    priority: 10,
  },
] as const;

export type GhanaTopicId = (typeof GHANA_TOPICS)[number]['id'];
