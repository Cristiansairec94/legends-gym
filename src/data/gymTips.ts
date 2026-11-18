export interface GymTip {
  id: string;
  category: 'pierna' | 'pecho' | 'espalda' | 'hombro' | 'brazos' | 'nutricion';
  categoryLabel: string;
  categoryIcon: string;
  title: string;
  tip: string;
  focus: string;
}

export const GYM_ROUTINE_TIPS: GymTip[] = [
  // PIERNA
  {
    id: 'tip-leg-1',
    category: 'pierna',
    categoryLabel: 'Pierna & Glúteo',
    categoryIcon: '🦵',
    title: 'Control Excéntrico en Sentadilla',
    tip: 'Baja controlado en 3 segundos y haz una pausa de 1 segundo en el fondo antes de subir. La tensión mecánica en el estiramiento profundo estimula hasta un 40% más de hipertrofia en cuádriceps.',
    focus: 'Cuádriceps y Glúteos'
  },
  {
    id: 'tip-leg-2',
    category: 'pierna',
    categoryLabel: 'Pierna & Glúteo',
    categoryIcon: '🦵',
    title: 'Frecuencia y Tensión en Femorales',
    tip: 'En el curl femoral tumbado, mantén la pelvis firmemente pegada al banco para evitar compensar con la zona lumbar. Flexiona la rodilla empujando con los talones y aprieta 1 segundo arriba.',
    focus: 'Isquiosurales / Femorales'
  },
  {
    id: 'tip-leg-3',
    category: 'pierna',
    categoryLabel: 'Pierna & Glúteo',
    categoryIcon: '🦵',
    title: 'Pausa en Estiramiento para Pantorrillas',
    tip: 'En elevación de talones, haz una pausa estricta de 2 segundos en el punto de máximo estiramiento abajo. Esto elimina el rebote elástico del tendón de Aquiles y obliga al sóleo y gemelos a crecer.',
    focus: 'Gemelos y Sóleo'
  },

  // PECHO
  {
    id: 'tip-chest-1',
    category: 'pecho',
    categoryLabel: 'Pecho (Pectoral)',
    categoryIcon: '🥋',
    title: 'Retracción Escapular en Press Plano',
    tip: 'Retrae y deprime tus escápulas (júntalas como apretando un lápiz entre ellas) antes de descolgar la barra. Protegerá al 100% tus manguitos rotadores y focalizará toda la tensión en las fibras del pecho.',
    focus: 'Pectoral Mayor'
  },
  {
    id: 'tip-chest-2',
    category: 'pecho',
    categoryLabel: 'Pecho (Pectoral)',
    categoryIcon: '🥋',
    title: 'Inclinación de 30° para Pectoral Superior',
    tip: 'En press inclinado con mancuernas, ajusta el banco a 30° (no a 45°). A 30° aíslas la porción clavicular del pectoral sin que el deltoides anterior te robe el estímulo.',
    focus: 'Pectoral Superior'
  },
  {
    id: 'tip-chest-3',
    category: 'pecho',
    categoryLabel: 'Pecho (Pectoral)',
    categoryIcon: '🥋',
    title: 'Junta Bíceps contra Bíceps en Cruces',
    tip: 'En cruces de polea o aperturas pec deck, no pienses en chocar las manos. Concéntrate en intentar juntar tus bíceps apretando tu propio pecho al frente.',
    focus: 'Aislamiento Pectoral'
  },

  // ESPALDA
  {
    id: 'tip-back-1',
    category: 'espalda',
    categoryLabel: 'Espalda & Dorsales',
    categoryIcon: '🦾',
    title: 'Tracción Guiada por los Codos',
    tip: 'En jalón al pecho y remos, no pienses en jalar con las manos; imagina que tus manos son simples ganchos y empuja tus codos con fuerza hacia tus caderas. Sentirás los dorsales ensancharse.',
    focus: 'Dorsal Ancho'
  },
  {
    id: 'tip-back-2',
    category: 'espalda',
    categoryLabel: 'Espalda & Dorsales',
    categoryIcon: '🦾',
    title: 'Pausa de Contracción en Remo con Barra',
    tip: 'En remo con barra o mancuerna, aguanta 1 segundo completo en la posición de máxima contracción escapular. La espalda media y romboides responden excepcionalmente bien a este pico de tensión.',
    focus: 'Espalda Media y Romboides'
  },
  {
    id: 'tip-back-3',
    category: 'espalda',
    categoryLabel: 'Espalda & Dorsales',
    categoryIcon: '🦾',
    title: 'Bisagra de Cadera en Peso Muerto Rumano',
    tip: 'En peso muerto rumano, inicia el movimiento empujando la cadera hacia atrás (como intentando tocar la pared con los glúteos), manteniendo la barra rozando los muslos y la columna neutra.',
    focus: 'Cadena Posterior y Erectores'
  },

  // HOMBROS
  {
    id: 'tip-shoulder-1',
    category: 'hombro',
    categoryLabel: 'Hombros 3D',
    categoryIcon: '⚡',
    title: 'Plano Escapular en Elevaciones Laterales',
    tip: 'En elevaciones laterales para hombro 3D, no lleves las mancuernas totalmente a los lados (180°). Llévalas 30° hacia adelante en el plano escapular e inclina el torso 15° al frente para un crecimiento limpio y sin pellizcos.',
    focus: 'Deltoide Lateral'
  },
  {
    id: 'tip-shoulder-2',
    category: 'hombro',
    categoryLabel: 'Hombros 3D',
    categoryIcon: '⚡',
    title: 'Rotación Externa en Face Pull',
    tip: 'Al jalar la cuerda hacia tu rostro, gira los pulgares hacia atrás y los codos arriba. Trabajarás el deltoide posterior y fortalecerás la postura de hombros de forma indestructible.',
    focus: 'Deltoide Posterior'
  },

  // BRAZOS
  {
    id: 'tip-arms-1',
    category: 'brazos',
    categoryLabel: 'Brazos (Bíceps & Tríceps)',
    categoryIcon: '💪',
    title: 'Supinación en la Cúspide del Bíceps',
    tip: 'En curl con mancuernas, rota activamente la muñeca hacia afuera en el tercio superior del recorrido para reclutar al máximo la cabeza corta y conseguir ese pico alto del bíceps.',
    focus: 'Bíceps Braquial'
  },
  {
    id: 'tip-arms-2',
    category: 'brazos',
    categoryLabel: 'Brazos (Bíceps & Tríceps)',
    categoryIcon: '💪',
    title: 'Estiramiento Bajo Carga en Tríceps',
    tip: 'En extensiones de tríceps sobre la cabeza (press francés o copa), la cabeza larga del tríceps trabaja en máximo estiramiento. Este ejercicio es el verdadero secreto para un brazo voluminoso.',
    focus: 'Cabeza Larga del Tríceps'
  },

  // NUTRICIÓN & RECUPERACIÓN
  {
    id: 'tip-nutrition-1',
    category: 'nutricion',
    categoryLabel: 'Nutrición & Rendimiento',
    categoryIcon: '🥗',
    title: 'Pre-Entreno de Hidratación y Sodio',
    tip: 'Toma 400-500ml de agua fresca con una pizca de sal mineral 30 minutos antes de entrenar. Mejorará el volumen de sangre intracelular, prevendrá calambres y te dará congestiones brutales.',
    focus: 'Bombeo Muscular y Potencia'
  },
  {
    id: 'tip-nutrition-2',
    category: 'nutricion',
    categoryLabel: 'Nutrición & Rendimiento',
    categoryIcon: '🥗',
    title: 'La Ventana de Sueño Anabólico',
    tip: 'El músculo no crece levantando pesas, se reconstruye mientras duermes en fase REM profunda. Prioriza 7 a 8 horas de sueño de calidad y 1.8g a 2g de proteína por kilo de peso al día.',
    focus: 'Recuperación Muscular'
  }
];

export const isClientBirthdayToday = (birthDateStr?: string): boolean => {
  if (!birthDateStr) return false;
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    const cleanStr = birthDateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length >= 3) {
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return month === currentMonth && day === currentDay;
    }
    const d = new Date(birthDateStr);
    return d.getMonth() + 1 === currentMonth && d.getDate() === currentDay;
  } catch {
    return false;
  }
};

export const getRandomTipForCategory = (category?: string): GymTip => {
  const filtered = category
    ? GYM_ROUTINE_TIPS.filter(t => t.category === category)
    : GYM_ROUTINE_TIPS;
  const list = filtered.length > 0 ? filtered : GYM_ROUTINE_TIPS;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};
