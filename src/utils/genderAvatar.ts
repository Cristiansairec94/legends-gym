// Utility for gym-themed avatars for members featuring high-definition gym facilities and equipment
import { 
  gymDumbbellsBase64,
  gymRackBase64,
  gymCableBase64,
  gymCardioBase64,
  maleGym1Base64, 
  maleGym2Base64, 
  femaleGym1Base64, 
  femaleGym2Base64 
} from '../assets/avatars/avatarBase64';

// 100% offline Base64 ultra-HD photos of gym facilities, areas and equipment
export const GYM_AREAS_PHOTOS = [
  gymRackBase64,      // Rack de sentadillas y barras olímpicas Eleiko con discos dorados
  gymDumbbellsBase64, // Zona de mancuernas premium acero negro y dorado
  gymCableBase64,     // Máquina de poleas cruzadas y fuerza
  gymCardioBase64,    // Zona de cardio y caminadoras panorámicas de lujo
];

// Presets for selection in modals
export const MALE_GYM_PHOTOS = [
  gymRackBase64,
  gymDumbbellsBase64,
];

export const FEMALE_GYM_PHOTOS = [
  gymCableBase64,
  gymCardioBase64,
];

// Offline avatars (using high-def gym area photos)
export const MALE_GYM_SVG_AVATAR = gymRackBase64;
export const FEMALE_GYM_SVG_AVATAR = gymCableBase64;

const KNOWN_FEMALE_NAMES = new Set([
  'maria', 'mary', 'carmen', 'ana', 'valeria', 'sofia', 'andrea', 'valentina', 'camila',
  'isabella', 'lucia', 'natalia', 'daniela', 'mariana', 'fernanda', 'gabriela', 'laura',
  'paula', 'patricia', 'claudia', 'diana', 'carolina', 'brenda', 'alejandra', 'sara',
  'monica', 'elena', 'rosa', 'jessica', 'vanessa', 'karen', 'karla', 'guadalupe', 'lupita',
  'ximena', 'jimena', 'paulina', 'adriana', 'lorena', 'esmeralda', 'rocio',
  'beatriz', 'teresa', 'gloria', 'margarita', 'leticia', 'silvia', 'yolanda', 'miriam',
  'veronica', 'elizabeth', 'raquel', 'ruth', 'susana', 'ivonne', 'fatima',
  'estefania', 'monzerrat', 'monserrat', 'rebeca', 'nayeli', 'marisol', 'araceli',
  'clara', 'cecilia', 'blanca', 'alma', 'alicia', 'luz', 'olga', 'irma', 'juana'
]);

const KNOWN_MALE_NAMES = new Set([
  'carlos', 'juan', 'jose', 'pedro', 'miguel', 'alejandro', 'diego', 'mateo', 'jorge',
  'luis', 'daniel', 'fernando', 'ricardo', 'eduardo', 'roberto', 'javier', 'david',
  'sergio', 'mario', 'pablo', 'marcos', 'marco', 'andres', 'hector', 'rodrigo',
  'gabriel', 'rafael', 'arturo', 'ivan', 'angel', 'raul', 'oscar', 'emilio', 'joaquin',
  'manuel', 'francisco', 'antonio', 'enrique', 'cesar', 'hugo', 'victor', 'ramon',
  'gustavo', 'felipe', 'alonso', 'alberto', 'gonzalo', 'esteban', 'mauricio', 'cristian',
  'christian', 'kevin', 'brayan', 'brian', 'erik', 'eric', 'ruben', 'julio', 'gerardo',
  'adrian', 'martin', 'santiago', 'sebastian', 'lucas', 'leonardo', 'tomas', 'nicolas'
]);

/**
 * Automatically infers gender from a full Spanish or international name
 */
export function detectGender(fullName: string): 'male' | 'female' {
  if (!fullName || typeof fullName !== 'string') return 'male';

  const clean = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const parts = clean.split(/\s+/);
  if (parts.length === 0) return 'male';

  const firstName = parts[0];
  const secondName = parts[1] || '';

  // Composite names check (e.g., "maria jose" -> female, "jose maria" -> male)
  if (firstName === 'maria' || (secondName && KNOWN_FEMALE_NAMES.has(secondName) && firstName === 'ma')) {
    return 'female';
  }
  if (firstName === 'jose' && secondName === 'maria') {
    return 'male';
  }

  // Exact dictionary match for first name
  if (KNOWN_FEMALE_NAMES.has(firstName)) return 'female';
  if (KNOWN_MALE_NAMES.has(firstName)) return 'male';

  // Check second name if first name is indeterminate
  if (KNOWN_FEMALE_NAMES.has(secondName)) return 'female';
  if (KNOWN_MALE_NAMES.has(secondName)) return 'male';

  // Fallback heuristics: names ending in 'a' are overwhelmingly female in Spanish
  if (firstName.endsWith('a') && firstName !== 'luca' && firstName !== 'luka' && firstName !== 'borja') {
    return 'female';
  }

  // Otherwise default to male
  return 'male';
}

/**
 * Converts a built-in 1MB base64 gym photo into a lightweight preset token ('preset:0'..'preset:3')
 * for fast storage in localStorage (avoiding 5MB QuotaExceededError) and fast HTTP sync with Vercel/localhost.
 */
export function serializeGymAvatar(avatarUrl?: string): string | undefined {
  if (!avatarUrl) return undefined;
  const idx = GYM_AREAS_PHOTOS.indexOf(avatarUrl);
  if (idx !== -1) {
    return `preset:${idx}`;
  }
  // If it's another huge base64 string (>150KB), omit it so getGymAvatar assigns deterministic gym photo
  if (avatarUrl.length > 150000) {
    return undefined;
  }
  return avatarUrl;
}

/**
 * Returns an appropriate gym avatar based on name and gym facility/area images.
 * Replaces any missing, relative, old unsplash, preset token, or placeholder avatars with an embedded Base64 gym area portrait.
 */
export function getGymAvatar(fullName: string, currentAvatarUrl?: string): string {
  if (currentAvatarUrl && currentAvatarUrl.startsWith('preset:')) {
    const idx = parseInt(currentAvatarUrl.split(':')[1], 10);
    if (!isNaN(idx) && GYM_AREAS_PHOTOS[idx]) {
      return GYM_AREAS_PHOTOS[idx];
    }
  }

  // If currentAvatarUrl is missing, an old unsplash URL, a relative path, or a placeholder SVG
  const needsGymAvatar = 
    !currentAvatarUrl ||
    currentAvatarUrl.includes('images.unsplash.com') ||
    currentAvatarUrl.includes('photo-1534528741775-53994a69daeb') ||
    currentAvatarUrl.includes('rect width=') ||
    currentAvatarUrl.includes('fill=') ||
    currentAvatarUrl.includes('svg+xml') ||
    currentAvatarUrl.startsWith('./') ||
    currentAvatarUrl.startsWith('/') ||
    currentAvatarUrl.includes('avatars/male_gym') ||
    currentAvatarUrl.includes('avatars/female_gym') ||
    currentAvatarUrl.includes('avatars/gym_');

  // If user has a real custom uploaded data URL (not a placeholder) and doesn't need replacement, keep it
  if (!needsGymAvatar && currentAvatarUrl) {
    return currentAvatarUrl;
  }

  // Generate deterministically from name hash so same person always gets the same gym area photo
  let hash = 0;
  for (let i = 0; i < fullName.length; i++) {
    hash = (hash + fullName.charCodeAt(i)) % 100;
  }

  return GYM_AREAS_PHOTOS[hash % GYM_AREAS_PHOTOS.length];
}

/**
 * Returns the offline vector/portrait gym avatar for a given gender
 */
export function getOfflineGymSvgAvatar(gender: 'male' | 'female'): string {
  return gender === 'female' ? FEMALE_GYM_SVG_AVATAR : MALE_GYM_SVG_AVATAR;
}
