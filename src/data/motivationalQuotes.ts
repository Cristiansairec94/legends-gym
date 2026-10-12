// Colección de frases motivacionales de gimnasio para el acceso de socios
export const GYM_MOTIVATIONAL_QUOTES: string[] = [
  "¡Hoy se entrena como una leyenda! Haz que cada repetición cuente.",
  "El dolor que sientes hoy es la fuerza que tendrás mañana.",
  "La disciplina vence al talento cuando el talento no se disciplina.",
  "Tu único rival está frente al espejo. ¡Supérate hoy!",
  "No te detengas cuando estés cansado, deténte cuando hayas terminado.",
  "Cada gota de sudor te acerca un paso más a tu mejor versión.",
  "Las excusas no queman calorías ni construyen músculo. ¡A romperla!",
  "El éxito no se regala, se conquista en cada barra y cada mancuerna.",
  "El cuerpo logra lo que la mente cree. ¡Concéntrate y véncete!",
  "Un mal día se transforma en una gran victoria con una buena rutina.",
  "La motivación te hace empezar, pero la disciplina te hace imparable.",
  "Hoy es una nueva oportunidad para superar tus marcas personales.",
  "No cuentes los días, haz que cada serie y cada repetición cuenten.",
  "¡Entra con actitud, entrena con pasión y sal con orgullo!",
  "Si fuera fácil, todos lo harían. ¡Demuestra de qué estás hecho!",
  "Construye hoy el cuerpo y la salud que agradecerás toda la vida.",
  "Cada entrenamiento es una victoria sobre la pereza. ¡A dar el 100%!",
  "La constancia es la llave maestra de la grandeza física y mental.",
  "Menos quejas y más peso en la barra. ¡Hoy rompes tus límites!",
  "La gloria es para los que se presentan a entrenar sin importar el cansancio.",
  "Sé más fuerte que tus mejores excusas. ¡A entrenar duro!",
  "Tu esfuerzo de hoy es tu orgullo de mañana. ¡Vamos con todo!",
  "Entrena con el corazón, levanta con la mente y confía en el proceso.",
  "El verdadero entrenamiento empieza justo cuando tu mente pide parar.",
  "¡Bienvenido al templo de los resultados! Deja el alma en cada serie.",
  "No busques suerte, busca progreso. ¡A darlo todo hoy!",
  "La fuerza no viene de lo que puedes hacer, sino de superar lo que creías imposible."
];

/**
 * Retorna una frase motivacional aleatoria evitando repetir la previa consecutivamente
 */
export const getRandomMotivationalQuote = (previousQuote?: string): string => {
  const filtered = previousQuote
    ? GYM_MOTIVATIONAL_QUOTES.filter((q) => q !== previousQuote)
    : GYM_MOTIVATIONAL_QUOTES;
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] || GYM_MOTIVATIONAL_QUOTES[0];
};
