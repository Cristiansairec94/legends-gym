// Utility for gender-based client avatars (Female: left dumbbell silhouette, Male: right dumbbell curl illustration)
import {
  femaleClientBase64,
  maleClientBase64,
} from '../assets/avatars/avatarBase64';

export const FEMALE_CLIENT_AVATAR = femaleClientBase64;
export const MALE_CLIENT_AVATAR = maleClientBase64;

// Backward-compatible exports used across modals and components
export const GYM_AREAS_PHOTOS = [
  maleClientBase64,
  maleClientBase64,
  femaleClientBase64,
  femaleClientBase64,
];

export const MALE_GYM_PHOTOS = [
  maleClientBase64,
];

export const FEMALE_GYM_PHOTOS = [
  femaleClientBase64,
];

export const MALE_GYM_SVG_AVATAR = maleClientBase64;
export const FEMALE_GYM_SVG_AVATAR = femaleClientBase64;

const KNOWN_FEMALE_NAMES = new Set([
  'alondra', 'maria', 'mary', 'carmen', 'ana', 'valeria', 'sofia', 'andrea', 'valentina', 'camila',
  'isabella', 'isabela', 'lucia', 'natalia', 'daniela', 'mariana', 'fernanda', 'gabriela', 'laura',
  'paula', 'patricia', 'claudia', 'diana', 'carolina', 'brenda', 'alejandra', 'sara', 'sarah',
  'monica', 'elena', 'rosa', 'jessica', 'yesica', 'vanessa', 'vanesa', 'karen', 'karla', 'carla',
  'guadalupe', 'lupita', 'ximena', 'jimena', 'paulina', 'adriana', 'lorena', 'esmeralda', 'rocio',
  'beatriz', 'teresa', 'gloria', 'margarita', 'leticia', 'silvia', 'yolanda', 'miriam', 'myriam',
  'veronica', 'elizabeth', 'elisabeth', 'raquel', 'ruth', 'susana', 'ivonne', 'fatima',
  'estefania', 'stephanie', 'monzerrat', 'monserrat', 'montserrat', 'rebeca', 'nayeli', 'marisol',
  'araceli', 'aracely', 'arely', 'areli', 'clara', 'cecilia', 'blanca', 'alma', 'alicia', 'luz',
  'olga', 'irma', 'juana', 'juanita', 'abigail', 'noemi', 'sarai', 'anahi', 'rubi', 'itzel',
  'citlalli', 'xochitl', 'yazmin', 'yasmin', 'jasmin', 'jazmin', 'lizbeth', 'lizeth', 'lissette',
  'jaqueline', 'jacqueline', 'kimberly', 'ashley', 'melanie', 'valery', 'nataly', 'nancy', 'fanny',
  'yenny', 'jenny', 'jennifer', 'marifer', 'mafer', 'pilar', 'mercedes', 'consuelo', 'concepcion',
  'dolores', 'lourdes', 'isabel', 'maribel', 'anabel', 'mabel', 'ester', 'esther', 'belen',
  'soledad', 'trinidad', 'natividad', 'rosario', 'amparo', 'milagros', 'wendy', 'heidy', 'ingrid',
  'astrid', 'edith', 'judith', 'estela', 'perla', 'dulce', 'estrella', 'cintia', 'cynthia',
  'nadia', 'sonia', 'tania', 'katia', 'kenia', 'regina', 'renata', 'romina', 'ximena', 'aitana',
  'alexa', 'alexandra', 'alison', 'allison', 'amanda', 'amelia', 'angela', 'angelica', 'antonia',
  'ariadna', 'ariana', 'aurora', 'barbara', 'berenice', 'bianca', 'cameron', 'casandra', 'cassandra',
  'catalina', 'celeste', 'celia', 'chloe', 'constanza', 'cristina', 'dafne', 'dalia', 'dana',
  'danna', 'debora', 'deborah', 'delia', 'denise', 'denisse', 'elisa', 'eloisa', 'elsa', 'emilia',
  'emily', 'emma', 'erika', 'erica', 'eva', 'evelyn', 'fabiola', 'florencia', 'frida', 'genesis',
  'georgina', 'gisela', 'giselle', 'graciela', 'greta', 'hanna', 'hannah', 'helena', 'ilse',
  'ines', 'irene', 'iris', 'ivana', 'ivette', 'jade', 'jimena', 'julieta', 'julia', 'juliana',
  'karina', 'laia', 'lara', 'leire', 'lia', 'liliana', 'lidia', 'linda', 'luciana', 'luisa',
  'magdalena', 'maite', 'mayte', 'marcela', 'marina', 'marta', 'martha', 'martina', 'mayra',
  'melissa', 'melisa', 'mia', 'micaela', 'michelle', 'milena', 'miranda', 'mireya', 'nadia',
  'naomi', 'nerea', 'nicole', 'nina', 'noelia', 'nora', 'nur', 'nuria', 'ofelia', 'olivia',
  'paloma', 'pamela', 'paola', 'priscila', 'rafaela', 'ramona', 'reyna', 'reina', 'roberta',
  'rosalia', 'rosana', 'roxana', 'sabrina', 'salma', 'samanta', 'samantha', 'sandra', 'selena',
  'selene', 'silvana', 'simona', 'tamara', 'tatiana', 'ursula', 'violeta', 'virginia', 'viviana',
  'ximena', 'yadira', 'yamileth', 'yaneth', 'yesenia', 'zoe', 'zulema'
]);

const KNOWN_MALE_NAMES = new Set([
  'samuel', 'carlos', 'juan', 'jose', 'pedro', 'miguel', 'alejandro', 'diego', 'mateo', 'jorge',
  'luis', 'daniel', 'fernando', 'ricardo', 'eduardo', 'roberto', 'javier', 'david',
  'sergio', 'mario', 'pablo', 'marcos', 'marco', 'andres', 'hector', 'rodrigo',
  'gabriel', 'rafael', 'arturo', 'ivan', 'angel', 'raul', 'oscar', 'emilio', 'joaquin',
  'manuel', 'francisco', 'antonio', 'enrique', 'cesar', 'hugo', 'victor', 'ramon',
  'gustavo', 'felipe', 'alonso', 'alberto', 'gonzalo', 'esteban', 'mauricio', 'cristian',
  'christian', 'kevin', 'brayan', 'brian', 'erik', 'eric', 'erick', 'ercik', 'ruben', 'julio',
  'gerardo', 'adrian', 'martin', 'santiago', 'sebastian', 'lucas', 'leonardo', 'tomas', 'nicolas',
  'emanuel', 'emmanuel', 'isaac', 'abraham', 'israel', 'isidro', 'ismael', 'uriel', 'azael',
  'gael', 'axel', 'joel', 'noel', 'abel', 'fidel', 'ariel', 'omar', 'edgar', 'nestor', 'saul',
  'paul', 'josue', 'noah', 'ian', 'alan', 'adair', 'aldair', 'yair', 'yahir', 'jair', 'efrain',
  'benjamin', 'valentin', 'agustin', 'fermin', 'roman', 'dylan', 'brandon', 'jonathan', 'johan',
  'damian', 'fabian', 'julian', 'hernan', 'german', 'aaron', 'simon', 'braulio', 'emiliano',
  'maximiliano', 'ulises', 'moises', 'jesus', 'matias', 'elias', 'isaias', 'jeremias', 'tobias',
  'zacarias', 'alexis', 'dennis', 'alvaro', 'armando', 'arnoldo', 'augusto', 'aurelio', 'baltazar',
  'bernardo', 'bruno', 'camilo', 'claudio', 'clemente', 'cristobal', 'dante', 'dario', 'demian',
  'domingo', 'edmundo', 'edson', 'efren', 'eleazar', 'eliseo', 'ernesto', 'eugenio', 'ezequiel',
  'fabricio', 'fausto', 'federico', 'felix', 'flavio', 'franco', 'gaspar', 'genaro', 'gilberto',
  'gregorio', 'guillermo', 'homero', 'horacio', 'humberto', 'ignacio', 'iker', 'ildebrando',
  'jaime', 'jeronimo', 'jonas', 'jordi', 'josafat', 'lorenzo', 'luciano', 'marcelo', 'mariano',
  'mauro', 'maximo', 'milton', 'nelson', 'norberto', 'octavio', 'oliver', 'orlando', 'osvaldo',
  'oswaldo', 'patricio', 'porfirio', 'quentin', 'ramiro', 'reinaldo', 'renato', 'rene', 'reynaldo',
  'rigoberto', 'rodolfo', 'rogelio', 'rolando', 'romulo', 'roque', 'salvador', 'santos', 'tadeo',
  'teodoro', 'timoteo', 'ubaldo', 'vicente', 'vladimir', 'wilfredo', 'xavier', 'yago'
]);

/**
 * Automatically infers gender ('male' | 'female') from a full Spanish or international name.
 */
export function detectGender(fullName: string): 'male' | 'female' {
  if (!fullName || typeof fullName !== 'string') return 'male';

  const clean = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'male';

  const firstName = parts[0];
  const secondName = parts[1] || '';

  // Composite names check (e.g., "maria jose" -> female, "jose maria" -> male)
  if (firstName === 'maria' || (secondName && KNOWN_FEMALE_NAMES.has(secondName) && (firstName === 'ma' || firstName === 'ma.'))) {
    return 'female';
  }
  if (firstName === 'jose' && secondName === 'maria') {
    return 'male';
  }

  // Exact dictionary match for first name
  if (KNOWN_FEMALE_NAMES.has(firstName)) return 'female';
  if (KNOWN_MALE_NAMES.has(firstName)) return 'male';

  // Check second name if first name is indeterminate
  if (secondName) {
    if (KNOWN_FEMALE_NAMES.has(secondName)) return 'female';
    if (KNOWN_MALE_NAMES.has(secondName)) return 'male';
  }

  // Fallback heuristics: names ending in 'a' (except known male exceptions) are female in Spanish
  const maleEndingInA = new Set(['luca', 'luka', 'borja', 'joshua', 'nikita', 'mustafa']);
  if (firstName.endsWith('a') && !maleEndingInA.has(firstName)) {
    return 'female';
  }
  if (firstName.endsWith('eth') || firstName.endsWith('beth') || firstName.endsWith('zel')) {
    return 'female';
  }

  return 'male';
}

/**
 * Serializes built-in gender avatars into compact preset tokens ('preset:female' / 'preset:male')
 * for fast storage in localStorage and fast HTTP sync.
 */
export function serializeGymAvatar(avatarUrl?: string): string | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl === 'preset:female' || avatarUrl === 'gender:female' || avatarUrl === femaleClientBase64) {
    return 'gender:female';
  }
  if (avatarUrl === 'preset:male' || avatarUrl === 'gender:male' || avatarUrl === maleClientBase64) {
    return 'gender:male';
  }
  // Old gym room presets ('preset:0'..'preset:3') or oversized base64 strings (>600KB) are cleared so getGymAvatar resolves by gender
  if (avatarUrl.startsWith('preset:') || avatarUrl.length > 600000) {
    return undefined;
  }
  return avatarUrl;
}

/**
 * Returns the female client silhouette (left image) if the client is female,
 * or the male client illustration (right image) if the client is male.
 */
export function getGymAvatar(fullName: string, currentAvatarUrl?: string, gender?: 'male' | 'female'): string {
  // If explicit gender is provided and no custom photo overrides it
  if (gender === 'female' && (!currentAvatarUrl || currentAvatarUrl.startsWith('preset:') || currentAvatarUrl === maleClientBase64 || currentAvatarUrl === femaleClientBase64)) {
    return femaleClientBase64;
  }
  if (gender === 'male' && (!currentAvatarUrl || currentAvatarUrl.startsWith('preset:') || currentAvatarUrl === maleClientBase64 || currentAvatarUrl === femaleClientBase64)) {
    return maleClientBase64;
  }

  // Explicit gender preset tokens or current default avatar match
  if (currentAvatarUrl === 'preset:female' || currentAvatarUrl === 'gender:female' || currentAvatarUrl === femaleClientBase64) {
    return femaleClientBase64;
  }
  if (currentAvatarUrl === 'preset:male' || currentAvatarUrl === 'gender:male' || currentAvatarUrl === maleClientBase64) {
    return maleClientBase64;
  }

  // Detect previous default avatars (cached in local storage) to automatically upgrade to the new image
  if (currentAvatarUrl && (currentAvatarUrl.length === 81310 || currentAvatarUrl.length === 79644 || currentAvatarUrl.length === 100865)) {
    const effectiveGender = gender || detectGender(fullName);
    return effectiveGender === 'female' ? femaleClientBase64 : maleClientBase64;
  }

  // Check if currentAvatarUrl is empty, an old gym-facility preset ('preset:0'..'preset:3'), an old 1MB photo, or a placeholder
  const needsGenderAvatar =
    !currentAvatarUrl ||
    currentAvatarUrl.startsWith('preset:') ||
    currentAvatarUrl.length > 600000 ||
    currentAvatarUrl.includes('c2pa') ||
    currentAvatarUrl.includes('images.unsplash.com') ||
    currentAvatarUrl.includes('pravatar.cc') ||
    currentAvatarUrl.includes('dicebear.com') ||
    currentAvatarUrl.includes('photo-1534528741775-53994a69daeb') ||
    currentAvatarUrl.includes('rect width=') ||
    currentAvatarUrl.includes('fill=') ||
    currentAvatarUrl.includes('svg+xml') ||
    currentAvatarUrl.startsWith('./') ||
    currentAvatarUrl.startsWith('/') ||
    currentAvatarUrl.includes('avatars/male_gym') ||
    currentAvatarUrl.includes('avatars/female_gym') ||
    currentAvatarUrl.includes('avatars/gym_');

  if (!needsGenderAvatar && currentAvatarUrl) {
    return currentAvatarUrl;
  }

  const effectiveGender = gender || detectGender(fullName);
  return effectiveGender === 'female' ? femaleClientBase64 : maleClientBase64;
}

/**
 * Returns the offline gym avatar for a given gender ('male' | 'female')
 */
export function getOfflineGymSvgAvatar(gender: 'male' | 'female'): string {
  return gender === 'female' ? femaleClientBase64 : maleClientBase64;
}
