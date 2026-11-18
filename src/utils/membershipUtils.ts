/**
 * membershipUtils.ts
 * Utilidad unificada para fechas de inicio, vigencia y cálculo de alertas de vencimiento
 * Regla de negocio:
 * - Todas las mensualidades inician en la fecha actual (hora local del gimnasio).
 * - La alerta ("POR VENCER") se activa dependiendo del tipo de plan y la cercanía al día de vencimiento:
 *   - Pase por Día (1 día): ACTIVO el día de compra. Alerta ("POR VENCER") únicamente el día de vencimiento (0 días).
 *   - Mensualidad Regular (30 días): ACTIVA. Alerta en los últimos 3 días (≤ 3 días).
 *   - Planes Largos (Trimestral/Anual): ACTIVO. Alerta en los últimos 5 días (≤ 5 días).
 */

export interface MembershipStatusInfo {
  daysRemaining: number;
  isExpired: boolean;
  isExpiring: boolean;
  isActive: boolean;
  status: 'active' | 'expiring_soon' | 'expired' | 'frozen';
  statusLabel: 'ACTIVA' | 'POR VENCER' | 'VENCIDA' | 'CONGELADA';
}

/**
 * Obtiene la fecha local en formato YYYY-MM-DD sin desfasajes de zona horaria UTC.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la cantidad real de días del mes calendario (respetando 28/29 en febrero según año bisiesto).
 */
export function getDaysInCalendarMonth(month: number, year?: number | null): number {
  if (!Number.isFinite(month) || month < 1 || month > 12) return 31;
  // Si aún no hay año de 4 dígitos, 2000 (bisiesto) permite 29/02 hasta completar el año exacto
  const effectiveYear = year && year >= 1900 ? year : 2000;
  return new Date(effectiveYear, month, 0).getDate();
}

function isValidBirthYearPrefix(prefix: string, minYear: number, maxYear: number): boolean {
  if (!/^\d{1,4}$/.test(prefix)) return false;
  const factor = Math.pow(10, 4 - prefix.length);
  const low = parseInt(prefix, 10) * factor;
  const high = low + factor - 1;
  return high >= minYear && low <= maxYear;
}

/**
 * Sanitiza y restringe en tiempo real cualquier entrada de fecha DD/MM/AAAA:
 * - Día: 01..31 respetando los días reales del mes (28/29 feb, 30 abr/jun/sep/nov)
 * - Mes: estrictamente 01..12 (auto-acomoda dígitos 2..9 como 02..09 y bloquea > 12)
 * - Año: estrictamente [1900 .. año actual] sin permitir prefijos o fechas futuras inválidas
 */
export function sanitizeBirthDateInput(rawVal: string, prevVal: string = ''): string {
  if (!rawVal) return '';

  const today = new Date();
  const minYear = 1900;
  const maxYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const isDeleting = prevVal.length > 0 && rawVal.length < prevVal.length;

  // Pegado / entrada masiva completa con 3 segmentos (ej. "19/72/0009")
  if (!isDeleting && rawVal.length - prevVal.length > 2 && /[-/.\s]/.test(rawVal)) {
    const segs = rawVal.trim().split(/[-/.\s]+/).map(s => s.replace(/\D/g, ''));
    if (segs.length === 3 && segs[0].length > 0 && segs[1].length > 0 && segs[2].length > 0) {
      let yNum: number | null = null;
      let yStr = '';
      if (segs[2]) {
        const parsedY = parseInt(segs[2].slice(0, 4), 10);
        if (!isNaN(parsedY)) {
          yNum = Math.min(maxYear, Math.max(minYear, parsedY));
          yStr = String(yNum).padStart(4, '0');
        }
      }

      const rawM = parseInt(segs[1].slice(0, 2), 10);
      let mNum = !isNaN(rawM) ? Math.min(12, Math.max(1, rawM)) : 1;
      if (yNum === maxYear && mNum > todayMonth) {
        mNum = todayMonth;
      }

      const rawD = parseInt(segs[0].slice(0, 2), 10);
      let maxD = getDaysInCalendarMonth(mNum, yNum);
      if (yNum === maxYear && mNum === todayMonth) {
        maxD = Math.min(maxD, todayDay);
      }
      const dNum = !isNaN(rawD) ? Math.min(maxD, Math.max(1, rawD)) : 1;

      const dOut = String(dNum).padStart(2, '0');
      const mOut = String(mNum).padStart(2, '0');
      return yStr ? `${dOut}/${mOut}/${yStr}` : `${dOut}/${mOut}`;
    }
  }

  let effectiveRaw = rawVal.replace(/[^\d/]/g, '');
  // Si el usuario borró justo la diagonal auto-insertada ("19/" -> "19"), borra también el último dígito
  if (isDeleting && prevVal.endsWith('/') && rawVal === prevVal.slice(0, -1) && effectiveRaw.length > 0) {
    effectiveRaw = effectiveRaw.slice(0, -1);
  }

  const typedTrailingSlash = !isDeleting && rawVal.endsWith('/');
  const digits = effectiveRaw.replace(/\D/g, '');
  if (!digits) return '';

  let idx = 0;

  // 1. DÍA (01..31)
  let dayStr = '';
  const d1 = digits[idx];
  if (d1 >= '4') {
    dayStr = '0' + d1;
    idx += 1;
  } else {
    if (idx + 1 >= digits.length) {
      if (typedTrailingSlash && d1 !== '0') {
        dayStr = '0' + d1;
        idx += 1;
      } else {
        return d1;
      }
    } else {
      const d2 = digits[idx + 1];
      const dPair = parseInt(d1 + d2, 10);
      if (dPair === 0 || dPair > 31) {
        return d1;
      }
      dayStr = d1 + d2;
      idx += 2;
    }
  }

  if (idx >= digits.length) {
    return isDeleting ? dayStr : `${dayStr}/`;
  }

  // 2. MES (01..12)
  let monthStr = '';
  const m1 = digits[idx];
  if (m1 >= '2') {
    monthStr = '0' + m1;
    idx += 1;
  } else {
    if (idx + 1 >= digits.length) {
      if (typedTrailingSlash && m1 !== '0') {
        monthStr = '0' + m1;
        idx += 1;
      } else {
        return `${dayStr}/${m1}`;
      }
    } else {
      const m2 = digits[idx + 1];
      const mPair = parseInt(m1 + m2, 10);
      if (mPair === 0 || mPair > 12) {
        return `${dayStr}/${m1}`;
      }
      monthStr = m1 + m2;
      idx += 2;
    }
  }

  let monthNum = parseInt(monthStr, 10);
  let dayNum = Math.min(parseInt(dayStr, 10), getDaysInCalendarMonth(monthNum, null));
  dayStr = String(dayNum).padStart(2, '0');

  if (idx >= digits.length) {
    return isDeleting ? `${dayStr}/${monthStr}` : `${dayStr}/${monthStr}/`;
  }

  // 3. AÑO (1900 .. año actual)
  let yearStr = '';
  while (idx < digits.length && yearStr.length < 4) {
    const nextPrefix = yearStr + digits[idx];
    idx += 1;
    if (isValidBirthYearPrefix(nextPrefix, minYear, maxYear)) {
      yearStr = nextPrefix;
    }
  }

  if (yearStr.length === 4) {
    const yearNum = parseInt(yearStr, 10);
    if (yearNum === maxYear) {
      if (monthNum > todayMonth) {
        monthNum = todayMonth;
        monthStr = String(monthNum).padStart(2, '0');
      }
      let maxD = getDaysInCalendarMonth(monthNum, yearNum);
      if (monthNum === todayMonth) {
        maxD = Math.min(maxD, todayDay);
      }
      if (dayNum > maxD) {
        dayNum = maxD;
        dayStr = String(dayNum).padStart(2, '0');
      }
    } else {
      const exactMaxDay = getDaysInCalendarMonth(monthNum, yearNum);
      if (dayNum > exactMaxDay) {
        dayNum = exactMaxDay;
        dayStr = String(dayNum).padStart(2, '0');
      }
    }
  }

  return `${dayStr}/${monthStr}/${yearStr}`;
}

/**
 * Descompone cualquier formato de fecha de nacimiento (YYYY-MM-DD, DD/MM/AAAA, DD-MM-AAAA, DDMMYYYY, años de 2 dígitos)
 */
export function parseBirthDateParts(input: string): { year: number; month: number; day: number } | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();
  if (!clean) return null;

  const today = new Date();
  const curYear = today.getFullYear();
  const curMonth = today.getMonth() + 1;
  const curDay = today.getDate();

  let year = 0;
  let month = 0;
  let day = 0;

  // Separar por '/', '-', '.' o espacios
  const parts = clean.split(/[-/.\s]+/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    if (isNaN(p1) || isNaN(p2) || isNaN(p3)) return null;

    // Caso 1: YYYY-MM-DD (ej. 1998-05-15)
    if (parts[0].length === 4) {
      year = p1;
      month = p2;
      day = p3;
    }
    // Caso 2: DD/MM/AAAA o DD-MM-AA
    else if (parts[2].length === 4 || parts[2].length === 2) {
      day = p1;
      month = p2;
      year = p3;
      if (parts[2].length === 2) {
        const century = Math.floor(curYear / 100) * 100;
        year = (century + year <= curYear) ? (century + year) : (century - 100 + year);
      }
    } else {
      return null;
    }
  } else if (/^\d{8}$/.test(clean)) {
    // Caso 3: 8 dígitos continuos (DDMMYYYY) ej. 15051998
    day = parseInt(clean.slice(0, 2), 10);
    month = parseInt(clean.slice(2, 4), 10);
    year = parseInt(clean.slice(4, 8), 10);
  } else {
    return null;
  }

  if (year < 1900 || year > curYear) return null;
  if (month < 1 || month > 12) return null;
  const maxDayInMonth = getDaysInCalendarMonth(month, year);
  if (day < 1 || day > maxDayInMonth) return null;
  if (year === curYear && (month > curMonth || (month === curMonth && day > curDay))) {
    return null;
  }

  return { year, month, day };
}

/**
 * Calcula la edad exacta en años a partir de cualquier fecha escrita o seleccionada
 */
export function calculateAgeFromBirthDate(input: string): number | null {
  const parts = parseBirthDateParts(input);
  if (!parts) return null;

  const today = new Date();
  const cYear = today.getFullYear();
  const cMonth = today.getMonth() + 1;
  const cDay = today.getDate();

  let age = cYear - parts.year;
  if (cMonth < parts.month || (cMonth === parts.month && cDay < parts.day)) {
    age--;
  }

  if (age >= 0 && age <= 120) {
    return age;
  }
  return null;
}

/**
 * Convierte cualquier fecha válida a formato ISO YYYY-MM-DD para guardado en base de datos
 */
export function formatBirthDateToISO(input: string): string {
  const parts = parseBirthDateParts(input);
  if (!parts) return '';
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formatea a DD/MM/AAAA para visualización amigable en pantalla
 */
export function formatBirthDateToDisplay(input: string): string {
  const parts = parseBirthDateParts(input);
  if (!parts) return input;
  const d = String(parts.day).padStart(2, '0');
  const m = String(parts.month).padStart(2, '0');
  const y = String(parts.year).padStart(4, '0');
  return `${d}/${m}/${y}`;
}

/**
 * Parsea una fecha YYYY-MM-DD o timestamp ISO estrictamente en hora local (00:00:00) sin desfase UTC.
 */
export function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const parsed = new Date(clean);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

/**
 * Calcula los días calendario restantes entre hoy (00:00:00 local) y la fecha de fin (00:00:00 local).
 */
export function calculateDaysRemaining(endDateStr?: string, fromDate: Date = new Date()): number {
  const end = parseLocalDate(endDateStr);
  if (!end) return 0;

  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Genera startDate y endDate a partir del día actual y la duración en días.
 */
export function calculateMembershipDates(durationDays: number, fromDate: Date = new Date()) {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  return {
    startDate: getLocalDateString(start),
    endDate: getLocalDateString(end),
    daysRemaining: durationDays,
  };
}

/**
 * Evalúa el estado real y exacto de una membresía según su fecha de vencimiento y plan.
 */
export function getMembershipStatus(membership?: {
  planType?: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  status?: string;
}): MembershipStatusInfo {
  if (!membership) {
    return {
      daysRemaining: 0,
      isExpired: true,
      isExpiring: false,
      isActive: false,
      status: 'expired',
      statusLabel: 'VENCIDA',
    };
  }

  if (membership.status === 'frozen') {
    return {
      daysRemaining: membership.daysRemaining ?? 0,
      isExpired: false,
      isExpiring: false,
      isActive: false,
      status: 'frozen',
      statusLabel: 'CONGELADA',
    };
  }

  // Calcular días calendario reales restantes
  const days = membership.endDate ? calculateDaysRemaining(membership.endDate) : (membership.daysRemaining ?? 0);

  // Si ya venció (días < 0) o ya estaba marcada como expired
  if (days < 0 || (membership.status === 'expired' && days <= 0)) {
    return {
      daysRemaining: days,
      isExpired: true,
      isExpiring: false,
      isActive: false,
      status: 'expired',
      statusLabel: 'VENCIDA',
    };
  }

  // Umbral de alerta inteligente dependiendo del día de vencimiento y tipo de plan
  const planType = (membership.planType || '').toLowerCase();
  const planName = (membership.planName || '').toLowerCase();
  const isDaily = planType === 'daily' || planName.includes('día') || planName.includes('dia') || planName.includes('pass') || planName.includes('visita');
  const isWeekly = planType === 'weekly' || planName.includes('semana') || planName.includes('semanal');
  const isBiweekly = planType === 'biweekly' || planName.includes('quincena') || planName.includes('quincenal');
  const isLongPlan = planType === 'quarterly' || planType === 'annual' || planType === 'vip' || planName.includes('trimestral') || planName.includes('anual');

  let alertThreshold = 3; // Mensualidades estándar o grupales (30 días): alerta los últimos 3 días
  if (isDaily) {
    alertThreshold = 0; // Pase por Día: alerta ÚNICAMENTE el día de vencimiento (0 días restantes)
  } else if (isWeekly) {
    alertThreshold = 1; // Pase Semanal (7 días): alerta en su último día (≤ 1 día)
  } else if (isBiweekly) {
    alertThreshold = 2; // Pase Quincenal (15 días): alerta en sus últimos 2 días (≤ 2 días)
  } else if (isLongPlan) {
    alertThreshold = 5; // Planes trimestrales o anuales: alerta los últimos 5 días
  }

  const isExpiring = days <= alertThreshold;
  const isActive = !isExpiring;

  return {
    daysRemaining: days,
    isExpired: false,
    isExpiring,
    isActive,
    status: isExpiring ? 'expiring_soon' : 'active',
    statusLabel: isExpiring ? 'POR VENCER' : 'ACTIVA',
  };
}

export interface GroupCompanionDraft {
  fullName: string;
  gender: 'male' | 'female';
  genderManuallySelected?: boolean;
  birthDate: string;
  birthDateDisplay: string;
  age: number | string;
  phone: string;
  fingerprintEnrolled?: boolean;
  selectedFinger?: string;
}

export function getGroupPackageSize(planName?: string, planType?: string): number {
  const name = (planName || '').toLowerCase();
  const match = name.match(/\b([2-6])\s*personas?\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  if ((planType || '').toLowerCase() === 'group') {
    if (name.includes('4')) return 4;
    return 3;
  }
  return 1;
}

export function createEmptyGroupCompanion(): GroupCompanionDraft {
  return {
    fullName: '',
    gender: 'male',
    genderManuallySelected: false,
    birthDate: '',
    birthDateDisplay: '',
    age: '',
    phone: '',
    fingerprintEnrolled: false,
    selectedFinger: 'Índice Derecho',
  };
}

export function resizeGroupCompanions(
  current: GroupCompanionDraft[],
  requiredCompanions: number
): GroupCompanionDraft[] {
  if (requiredCompanions <= 0) return [];
  const next = current.slice(0, requiredCompanions);
  while (next.length < requiredCompanions) {
    next.push(createEmptyGroupCompanion());
  }
  return next;
}

export function isGroupCompanionComplete(companion: GroupCompanionDraft): boolean {
  if (!companion.fullName.trim()) return false;
  const hasValidBirth = Boolean(
    parseBirthDateParts(companion.birthDateDisplay || companion.birthDate)
  );
  const ageNum = Number(companion.age);
  return hasValidBirth || (!isNaN(ageNum) && ageNum >= 8 && ageNum <= 110);
}

/**
 * Determina si un cobro corresponde a un Pase de Visita ($50 / visitante del día)
 * y no a una membresía o compra de tienda.
 */
export function isVisitSale(sale: any): boolean {
  if (!sale || typeof sale !== 'object') return false;
  if (sale.saleType === 'visit') return true;
  if (sale.source === 'terminal_visit_authorized') return true;
  const id = String(sale.id || '').toUpperCase();
  const folio = String(sale.folio || '').toUpperCase();
  if (id.startsWith('SALE_VISIT') || id.startsWith('SALE-VISIT') || id.includes('_VISIT_')) return true;
  if (folio.startsWith('VIS-')) return true;
  const planName = String(sale.planName || '').toLowerCase();
  if (planName.includes('visita')) return true;
  const notes = String(sale.notes || '').toLowerCase();
  if (notes.includes('pase de visita')) return true;
  if (Array.isArray(sale.items)) {
    return sale.items.some((it: any) => {
      const prodId = String(it?.product?.id || it?.id || '').toLowerCase();
      const barcode = String(it?.product?.barcode || '').toUpperCase();
      const name = String(it?.product?.name || it?.name || '').toLowerCase();
      return (
        prodId === 'prod_visit_pass' ||
        prodId === 'item_visit_pass' ||
        barcode === 'VIS-001' ||
        name.includes('pase de visita')
      );
    });
  }
  return false;
}

/**
 * Determina si un cobro corresponde a una membresía/cuota (excluyendo pases de visita).
 */
export function isMembershipSale(sale: any): boolean {
  if (!sale || typeof sale !== 'object') return false;
  if (isVisitSale(sale)) return false;
  if (sale.saleType === 'membership') return true;
  const id = String(sale.id || '').toUpperCase();
  return id.startsWith('SALE-REG') || id.startsWith('PLAN-');
}

/**
 * Clasifica de forma unificada cualquier venta/cobro en 'visit', 'membership' o 'store'.
 */
export function resolveSaleType(sale: any): 'visit' | 'membership' | 'store' {
  if (isVisitSale(sale)) return 'visit';
  if (isMembershipSale(sale)) return 'membership';
  return 'store';
}
