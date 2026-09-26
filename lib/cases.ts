/**
 * Sistema único de casos clínicos (reemplaza lib/missions.ts y
 * lib/gameMissions.ts de la Fase 1). Todo el contenido jugable es data:
 * para agregar un paciente nuevo basta con sumar un caso aquí.
 *
 * Flujo de un caso:
 *   oferta (o llamada de emergencia) → ir con el paciente → examen
 *   (1-2 minijuegos) → diagnóstico: elegir 1 de 3 tratamientos →
 *   tratamiento (minijuego o aplicación) → estrellas y recompensa.
 */

export type ExamGame = 'thermometer' | 'stethoscope' | 'flashlight';
export type TreatGame = 'bandaid' | 'vaccine' | 'syrup';
export type CaseType = 'consulta' | 'emergencia' | 'campana' | 'visita';

export interface TreatmentOption {
  id: string;
  label: string;
  emoji: string;
}

export interface Finding {
  emoji: string;
  text: string;
}

export interface Case {
  id: string;
  title: string;
  type: CaseType;
  zone: string;
  /** Quién te pide ayuda (en emergencias no hay: llega por teléfono) */
  giverId?: string;
  patientId: string;
  minLevel: number;
  /** Casos que hay que completar antes */
  requires?: string[];
  giverDialogue: string;
  description: string;
  /** Minijuegos de examen, en orden */
  exam: ExamGame[];
  /** Lo que "descubres" con cada examen (mismo orden que exam; si no hay examen, observación directa) */
  findings: Finding[];
  treatment: {
    options: [TreatmentOption, TreatmentOption, TreatmentOption];
    correct: string;
    /** Pista amable cuando se elige mal */
    hint: string;
    game?: TreatGame;
    /** Dosis objetivo para el jarabe, en ml */
    dose?: number;
    /** Texto de la aplicación cuando no hay minijuego de tratamiento */
    applyText?: string;
  };
  thanks: string;
  reward: { coins: number; xp: number };
  /** Solo emergencias: segundos para llegar con el bonus */
  timeLimit?: number;
  /** Solo emergencias: recorrido de la ambulancia desde el hospital, puntos [x, z] */
  ambulanceRoute?: [number, number][];
  repeatable?: boolean;
}

const T = {
  syrupFever: { id: 'syrup-fever', label: 'Jarabe para la fiebre', emoji: '🍯' },
  syrupThroat: { id: 'syrup-throat', label: 'Jarabe para la garganta', emoji: '🍯' },
  bandaid: { id: 'bandaid', label: 'Limpiar y poner curita', emoji: '🩹' },
  vaccine: { id: 'vaccine', label: 'Vacuna', emoji: '💉' },
  inhaler: { id: 'inhaler', label: 'Inhalador', emoji: '🌬️' },
  sunCream: { id: 'sun-cream', label: 'Crema para el sol', emoji: '🧴' },
  iceCream: { id: 'ice-cream', label: 'Un helado', emoji: '🍦' },
  coat: { id: 'coat', label: 'Abrigarlo mucho', emoji: '🧥' },
  shade: { id: 'shade', label: 'Sombra y suero', emoji: '⛱️' },
  cast: { id: 'cast', label: 'Enyesar la pierna', emoji: '🦴' },
  rest: { id: 'rest', label: 'Solo descansar', emoji: '🛌' },
  massage: { id: 'massage', label: 'Masaje en la pancita', emoji: '👐' },
  itchCream: { id: 'itch-cream', label: 'Crema para la picazón', emoji: '🧴' },
  sting: { id: 'sting', label: 'Sacar el aguijón y poner hielo', emoji: '🧊' },
  iceWrap: { id: 'ice-wrap', label: 'Hielo y vendaje', emoji: '🧊' },
  newbornVaccine: { id: 'newborn-vaccine', label: 'Primera vacuna', emoji: '💉' },
  blanket: { id: 'blanket', label: 'Gorrito y mantita', emoji: '🧣' },
} satisfies Record<string, TreatmentOption>;

export const CASES: Case[] = [
  // ─── Historia: nivel 1 ───
  {
    id: 'mission-primer-paciente',
    title: 'Primer Paciente',
    type: 'consulta',
    zone: 'Hospital Sana',
    giverId: 'parent-1',
    patientId: 'baby-1',
    minLevel: 1,
    giverDialogue: 'Doctor, mi bebé Luciana está muy calientita desde anoche... ¿La puede revisar?',
    description: 'Tómale la temperatura a Luciana y decide cómo ayudarla.',
    exam: ['thermometer'],
    findings: [{ emoji: '🌡️', text: '38.6 °C — tiene fiebre' }],
    treatment: {
      options: [T.syrupFever, T.bandaid, T.sunCream],
      correct: 'syrup-fever',
      hint: 'Mmm... Luciana no tiene heridas ni se quemó con el sol. ¿Qué baja la fiebre?',
      game: 'syrup',
      dose: 5,
    },
    thanks: '¡Gracias doctor! Luciana ya está fresquita y sonriendo.',
    reward: { coins: 50, xp: 100 },
  },
  {
    id: 'mission-emergencia-parque',
    title: 'Rodilla Raspada',
    type: 'consulta',
    zone: 'Hospital Sana',
    giverId: 'baby-2',
    patientId: 'baby-2',
    minLevel: 1,
    giverDialogue: '¡Ay, me caí jugando y me raspé la rodilla! ¿Me ayudas?',
    description: 'Mira la herida de Mateo y cúrala.',
    exam: [],
    findings: [{ emoji: '👀', text: 'Raspón pequeño en la rodilla' }],
    treatment: {
      options: [T.vaccine, T.bandaid, T.syrupFever],
      correct: 'bandaid',
      hint: 'Una vacuna o un jarabe no tapan la herida. ¿Qué se pone en un raspón?',
      game: 'bandaid',
    },
    thanks: '¡Mi curita es de dinosaurio! ¡Gracias!',
    reward: { coins: 60, xp: 120 },
  },

  // ─── Historia: nivel 2 ───
  {
    id: 'mission-vacunacion',
    title: 'Hora de la Vacuna',
    type: 'campana',
    zone: 'Hospital Sana',
    giverId: 'parent-2',
    patientId: 'parent-2',
    minLevel: 2,
    requires: ['mission-primer-paciente'],
    giverDialogue: 'Doctor, a mi hijo le toca su vacuna. Primero revíselo, por favor.',
    description: 'Escucha su corazón y luego ponle la vacuna.',
    exam: ['stethoscope'],
    findings: [{ emoji: '❤️', text: 'Corazón fuerte y sano' }],
    treatment: {
      options: [T.rest, T.vaccine, T.iceCream],
      correct: 'vaccine',
      hint: '¡Está sano! Hoy vino por algo que lo protege de enfermarse...',
      game: 'vaccine',
    },
    thanks: '¡Ni lloró! Gracias doctor, ahora está protegido.',
    reward: { coins: 100, xp: 200 },
  },
  {
    id: 'case-tos-sofi',
    title: 'Tos en el Parque',
    type: 'visita',
    zone: 'Parque Central',
    giverId: 'kid-sofi',
    patientId: 'kid-sofi',
    minLevel: 2,
    requires: ['mission-emergencia-parque'],
    giverDialogue: '*cof cof* Doc, cuando corro me cuesta respirar y hago un silbidito...',
    description: 'Escucha los pulmones de Sofi con el estetoscopio.',
    exam: ['stethoscope'],
    findings: [{ emoji: '🫁', text: 'Silbidos al respirar — sus bronquios están apretados' }],
    treatment: {
      options: [T.inhaler, T.bandaid, T.vaccine],
      correct: 'inhaler',
      hint: 'Sofi necesita que el aire entre fácil a sus pulmones. ¿Qué la ayuda a respirar?',
      applyText: 'Sofi respira hondo con el inhalador... ¡fiuuu!',
    },
    thanks: '¡Ya puedo correr sin silbar! ¡Gracias doc!',
    reward: { coins: 90, xp: 200 },
  },

  // ─── Historia: nivel 3 ───
  {
    id: 'case-garganta-tomas',
    title: 'Garganta Roja',
    type: 'visita',
    zone: 'Escuela Arcoíris',
    giverId: 'kid-tomas',
    patientId: 'kid-tomas',
    minLevel: 3,
    requires: ['case-tos-sofi'],
    giverDialogue: 'Doctor... me duele mucho la garganta cuando trago. Y tengo un poquito de calor.',
    description: 'Revisa la garganta de Tomás con la linterna y tómale la temperatura.',
    exam: ['flashlight', 'thermometer'],
    findings: [
      { emoji: '🔦', text: 'Garganta roja con bichitos' },
      { emoji: '🌡️', text: '37.9 °C — un poco de fiebre' },
    ],
    treatment: {
      options: [T.iceCream, T.syrupThroat, T.cast],
      correct: 'syrup-throat',
      hint: 'Un helado se siente rico, ¡pero no cura! ¿Qué combate los bichitos de la garganta?',
      game: 'syrup',
      dose: 7.5,
    },
    thanks: '¡Ya puedo tragar sin que duela! Le voy a contar a toda la clase.',
    reward: { coins: 130, xp: 260 },
  },

  // ─── Hospital: Emergencias y Maternidad ───
  {
    id: 'case-tobillo-benja',
    title: 'Tobillo torcido',
    type: 'consulta',
    zone: 'Hospital Sana',
    giverId: 'kid-benja',
    patientId: 'kid-benja',
    minLevel: 2,
    giverDialogue: '¡Ay! Salté de la cama elástica y se me dobló el pie. Está hinchado...',
    description: 'Mira el tobillo de Benja en Emergencias y cúralo.',
    exam: [],
    findings: [{ emoji: '🦶', text: 'Tobillo hinchado: una torcedura, sin hueso roto' }],
    treatment: {
      options: [T.newbornVaccine, T.syrupThroat, T.iceWrap],
      correct: 'ice-wrap',
      hint: 'Un jarabe o una vacuna no bajan la hinchazón. ¿Qué se pone en una torcedura?',
      game: 'bandaid',
    },
    thanks: '¡Qué fresquito el hielo! Ya puedo pisar un poquito.',
    reward: { coins: 80, xp: 160 },
  },
  {
    id: 'case-chequeo-tomi',
    title: 'Primer chequeo de Tomi',
    type: 'consulta',
    zone: 'Maternidad',
    giverId: 'mother-paula',
    patientId: 'baby-tomi',
    minLevel: 2,
    giverDialogue: 'Doctor, ¡Tomi nació ayer! ¿Le hace su primer chequeo?',
    description: 'Escucha el corazón del recién nacido en Maternidad (piso 3).',
    exam: ['stethoscope'],
    findings: [{ emoji: '❤️', text: 'Corazoncito fuerte y respiración tranquila' }],
    treatment: {
      options: [T.iceCream, T.newbornVaccine, T.bandaid],
      correct: 'newborn-vaccine',
      hint: '¡Tomi está sanito! Los recién nacidos reciben algo que los protege desde el primer día.',
      game: 'vaccine',
    },
    thanks: '¡Gracias doctor! Tomi ya tiene su primera vacuna y durmió enseguida.',
    reward: { coins: 90, xp: 190 },
  },
  {
    id: 'case-frio-lia',
    title: 'Lía tiene frío',
    type: 'consulta',
    zone: 'Maternidad',
    giverId: 'mother-julia',
    patientId: 'baby-lia',
    minLevel: 3,
    requires: ['case-chequeo-tomi'],
    giverDialogue: 'Doctor, siento a Lía muy fría y tiembla un poquito...',
    description: 'Tómale la temperatura a la bebé Lía en Maternidad (piso 3).',
    exam: ['thermometer'],
    findings: [{ emoji: '🌡️', text: '35.9 °C — está un poquito fría' }],
    treatment: {
      options: [T.shade, T.blanket, T.sunCream],
      correct: 'blanket',
      hint: 'La sombra y el suero son para el calor. ¿Qué la calienta suavecito?',
      applyText: 'Gorrito de lana, mantita y un abrazo de mamá... ¡Lía ya está calentita!',
    },
    thanks: '¡Lía dejó de temblar y está sonriendo! Muchas gracias.',
    reward: { coins: 110, xp: 230 },
  },

  // ─── Historia: nivel 4 (Residencial Sol) ───
  {
    id: 'case-colicos-emma',
    title: 'Visita a domicilio: Cólicos',
    type: 'visita',
    zone: 'Residencial Sol',
    giverId: 'mother-elena',
    patientId: 'baby-emma',
    minLevel: 4,
    requires: ['case-garganta-tomas'],
    giverDialogue: 'Doctor, gracias por venir hasta el barrio. Emma llora mucho después de comer y encoge las piernitas...',
    description: 'Escucha la pancita de Emma con el estetoscopio.',
    exam: ['stethoscope'],
    findings: [{ emoji: '🫧', text: 'Pancita con burbujitas de gas: cólicos' }],
    treatment: {
      options: [T.vaccine, T.iceCream, T.massage],
      correct: 'massage',
      hint: 'Emma es muy chiquita para helados, y la vacuna no saca el gas. ¿Qué la alivia suavecito?',
      applyText: 'Masajitos en círculos en la pancita... ¡Emma suelta el gas y se ríe!',
    },
    thanks: '¡Emma se quedó dormidita y feliz! Muchas gracias, doctor.',
    reward: { coins: 140, xp: 280 },
  },
  {
    id: 'case-varicela-lucas',
    title: 'Puntitos que pican',
    type: 'visita',
    zone: 'Residencial Sol',
    giverId: 'kid-lucas',
    patientId: 'kid-lucas',
    minLevel: 4,
    requires: ['case-colicos-emma'],
    giverDialogue: 'Doc, me salieron puntitos rojos por todo el cuerpo y me pican muchísimo...',
    description: 'Tómale la temperatura a Lucas y mira sus puntitos.',
    exam: ['thermometer'],
    findings: [
      { emoji: '🌡️', text: '37.7 °C — un poquito de fiebre' },
      { emoji: '👀', text: 'Puntitos rojos con agüita: es varicela' },
    ],
    treatment: {
      options: [T.bandaid, T.itchCream, T.cast],
      correct: 'itch-cream',
      hint: '¡Son demasiados puntitos para ponerles curitas! ¿Qué calma la picazón?',
      applyText: 'Un poquito de crema fresquita en cada puntito... ¡ya no pica!',
    },
    thanks: '¡Ya no me pica! Me voy a quedar en casa hasta curarme, como dijiste.',
    reward: { coins: 150, xp: 300 },
  },

  // ─── Emergencias (llegan por teléfono desde nivel 2, repetibles) ───
  {
    id: 'emergency-calor-valentina',
    title: '¡Bebé con mucho calor!',
    type: 'emergencia',
    zone: 'Parque Central',
    patientId: 'baby-valentina',
    minLevel: 2,
    giverDialogue: '¡Doctor! La bebé Valentina estuvo mucho rato al sol en el parque y está muy colorada.',
    description: 'Corre al Parque Central antes de que se acabe el tiempo.',
    exam: ['thermometer'],
    findings: [{ emoji: '🌡️', text: '38.2 °C — golpe de calor' }],
    treatment: {
      options: [T.coat, T.shade, T.vaccine],
      correct: 'shade',
      hint: 'Si la abrigamos le dará más calor. ¿Qué la refresca e hidrata?',
      game: 'syrup',
      dose: 5,
    },
    thanks: '¡Valentina ya está fresquita a la sombra! ¡Gracias por llegar tan rápido!',
    reward: { coins: 80, xp: 180 },
    timeLimit: 50,
    ambulanceRoute: [[6, 16], [-36, 16], [-36, 21]],
    repeatable: true,
  },
  {
    id: 'emergency-columpio-diego',
    title: '¡Caída del columpio!',
    type: 'emergencia',
    zone: 'Parque Central',
    patientId: 'kid-diego',
    minLevel: 2,
    giverDialogue: '¡Doctor, Diego se cayó jugando en el parque y se lastimó el codo!',
    description: 'Llega rápido al Parque Central y revisa a Diego.',
    exam: ['flashlight'],
    findings: [{ emoji: '🔦', text: 'Raspón en el codo con tierrita, sin huesos rotos' }],
    treatment: {
      options: [T.cast, T.bandaid, T.syrupFever],
      correct: 'bandaid',
      hint: 'No hay huesos rotos, así que no hace falta yeso. ¿Qué se hace con un raspón?',
      game: 'bandaid',
    },
    thanks: '¡Soy un valiente! Gracias doc, ya me voy a jugar con cuidado.',
    reward: { coins: 80, xp: 180 },
    timeLimit: 55,
    ambulanceRoute: [[6, 16], [-44, 16], [-44, 21]],
    repeatable: true,
  },
  {
    id: 'emergency-abeja-martina',
    title: '¡Picadura de abeja!',
    type: 'emergencia',
    zone: 'Residencial Sol',
    patientId: 'kid-martina',
    minLevel: 4,
    giverDialogue: '¡Doctor! A Martina le picó una abeja en el jardín y está llorando.',
    description: 'Corre al Residencial Sol y ayuda a Martina.',
    exam: [],
    findings: [{ emoji: '🐝', text: 'Picadura en el brazo, con el aguijón todavía puesto' }],
    treatment: {
      options: [T.syrupFever, T.sting, T.vaccine],
      correct: 'sting',
      hint: 'Primero hay que quitar lo que dejó la abeja y bajar la hinchazón.',
      game: 'bandaid',
    },
    thanks: '¡Ya no duele! Voy a mirar a las abejas desde lejitos.',
    reward: { coins: 110, xp: 220 },
    timeLimit: 60,
    ambulanceRoute: [[6, 16], [-23, 16], [-23, -9], [-52, -9]],
    repeatable: true,
  },
  {
    id: 'emergency-escuela-tomas',
    title: '¡Mareo en la escuela!',
    type: 'emergencia',
    zone: 'Escuela Arcoíris',
    patientId: 'kid-tomas',
    minLevel: 3,
    giverDialogue: '¡Doctor! Tomás se mareó en el recreo después de correr mucho al sol.',
    description: 'Ve a la Escuela Arcoíris lo antes posible.',
    exam: ['stethoscope', 'thermometer'],
    findings: [
      { emoji: '❤️', text: 'Corazón acelerado de tanto correr' },
      { emoji: '🌡️', text: '37.8 °C — acalorado' },
    ],
    treatment: {
      options: [T.shade, T.cast, T.inhaler],
      correct: 'shade',
      hint: 'Sus pulmones y huesos están bien. Necesita refrescarse y tomar líquido.',
      applyText: 'Tomás descansa a la sombra y toma su suero... ¡glu glu!',
    },
    thanks: '¡Ya me siento mucho mejor! Gracias doctor.',
    reward: { coins: 90, xp: 200 },
    timeLimit: 45,
    ambulanceRoute: [[6, 16], [32, 16], [32, 20.5]],
    repeatable: true,
  },
];

export const CASE_BY_ID: Record<string, Case> = Object.fromEntries(CASES.map((c) => [c.id, c]));

export const isEmergency = (c: Case) => c.type === 'emergencia';

const FEMININE_ZONES = ['Escuela', 'Guardería', 'Playa', 'Colinas', 'Maternidad'];
/** "al Parque Central" / "a la Escuela Arcoíris" */
export function zoneTo(zone: string) {
  return FEMININE_ZONES.some((z) => zone.startsWith(z)) ? `a la ${zone}` : `al ${zone}`;
}
/** "en el Parque Central" / "en la Escuela Arcoíris" */
export function zoneIn(zone: string) {
  return FEMININE_ZONES.some((z) => zone.startsWith(z)) ? `en la ${zone}` : `en el ${zone}`;
}

/** Casos de historia disponibles para ofrecerse ahora mismo */
export function availableStoryCases(level: number, completed: string[]): Case[] {
  return CASES.filter(
    (c) =>
      !isEmergency(c) &&
      c.giverId &&
      level >= c.minLevel &&
      !completed.includes(c.id) &&
      (c.requires ?? []).every((r) => completed.includes(r)),
  );
}

export function emergencyPool(level: number): Case[] {
  return CASES.filter((c) => isEmergency(c) && level >= c.minLevel);
}

/** Estrellas finales del caso a partir de cómo se jugó */
export function scoreCase(opts: { exam: number[]; treat: number; wrongPicks: number; emergency?: { onTime: boolean } }) {
  const examAvg = opts.exam.length ? opts.exam.reduce((a, b) => a + b, 0) / opts.exam.length : 1;
  const firstTry = opts.wrongPicks === 0 ? 1 : opts.wrongPicks === 1 ? 0.45 : 0.2;
  let score = examAvg * 0.35 + opts.treat * 0.35 + firstTry * 0.3;
  if (opts.emergency && !opts.emergency.onTime) score *= 0.85;
  const stars: 1 | 2 | 3 = score >= 0.8 ? 3 : score >= 0.5 ? 2 : 1;
  return { score, stars };
}
