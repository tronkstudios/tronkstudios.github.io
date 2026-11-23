export const CHAPTERS = [
  {
    name: "Apagón",
    location: "Laboratorio de superficie",
    color: "#6adbf9",
    map: 0,
  },
  {
    name: "Bajo presión",
    location: "Anillo de servicios",
    color: "#73efb1",
    map: 1,
  },
  {
    name: "Último sello",
    location: "Cámara central",
    color: "#c6a6ff",
    map: 2,
  },
];

const medals = {
  intact: {
    title: "Sin fugas",
    text: "Termina con al menos 90 % de integridad.",
    test: (m) => m.hp >= 90,
  },
  reserve: {
    title: "Reserva de emergencia",
    text: "Termina con al menos 115 ATP sin gastar.",
    test: (m) => m.atp >= 115,
  },
  researcher: {
    title: "Prototipo validado",
    text: "Activa una especialización de nivel 3.",
    test: (m) => m.specialized >= 1,
  },
  stabilize: {
    title: "Operación pulso",
    text: "Activa dos pulsos tácticos.",
    test: (m) => m.pulses >= 2,
  },
  workshop: {
    title: "Banco de pruebas",
    text: "Termina con cuatro tipos de defensa instalados.",
    test: (m) => new Set(m.towers.map((t) => t.id)).size >= 4,
  },
  reserveLarge: {
    title: "Reserva del anillo",
    text: "Termina con al menos 220 ATP sin gastar.",
    test: (m) => m.atp >= 220,
  },
  doubleSpec: {
    title: "Equipo de élite",
    text: "Activa dos especializaciones de nivel 3.",
    test: (m) => m.specialized >= 2,
  },
  final: {
    title: "Cierre limpio",
    text: "Termina con 80 % de integridad y usa al menos un pulso.",
    test: (m) => m.hp >= 80 && m.pulses >= 1,
  },
};

export const MISSIONS = [
  {
    chapter: 0,
    name: "Ingreso",
    task: "Restaura la alimentación del vestíbulo.",
    speaker: "Mara · Operaciones",
    briefing:
      "La central ha dejado de responder. Todavía tenemos corriente en el vestíbulo. Si proteges este nodo, podré recuperar el enlace con el resto del laboratorio.",
    cue: "Empieza con dos torres que puedan cubrir el mismo giro del conducto.",
    transmission:
      "Ya leo las torres. El nodo está aguantando. Mantén despejado el último tramo.",
    end: "El enlace ha vuelto. El archivo de muestras sigue emitiendo una señal.",
    medal: medals.intact,
  },
  {
    chapter: 0,
    name: "Muestreo",
    task: "Recupera el registro del primer fallo.",
    speaker: "Ivo · Ingeniería",
    briefing:
      "El registro se quedó en una consola sin batería. Dale tiempo para completar la copia. La avería también ha invertido el sentido de los conductos.",
    cue: "Protege la consola en el primer giro vertical durante la oleada inicial. Cuatro enemigos que la alcancen cancelan la copia.",
    transmission:
      "Copia al cincuenta por ciento. Ya veo qué máquina se activó primero.",
    end: "Tenemos el registro. Algo está reabriendo las puertas después de cada cierre.",
    medal: medals.reserve,
    flip: true,
  },
  {
    chapter: 0,
    name: "Depósito",
    task: "Mantén el cajón de energía conectado.",
    speaker: "Ivo · Ingeniería",
    briefing:
      "Sin un repuesto no podemos cerrar manualmente los conductos. Lo tengo localizado en el depósito. Cubre su salida mientras lo saco.",
    cue: "Concentra el fuego en las dos curvas más juntas. Anticípate a los primeros escudos.",
    transmission:
      "La línea del depósito vuelve a dar tensión. Mantengo el repuesto en carga.",
    end: "Repuesto asegurado. Queda un custodio entre nosotros y el ascensor.",
    medal: medals.researcher,
    bend: 1.22,
  },
  {
    chapter: 0,
    name: "Conductos",
    task: "Abre el acceso al anillo de servicios.",
    speaker: "Mara · Operaciones",
    briefing:
      "El Custodio Ámbar bloquea el ascensor. Necesito el paso abierto para llevar el repuesto bajo tierra. Guarda un pulso para cuando levante su escudo.",
    cue: "El jefe llama refuerzos en su segunda fase. Reserva torres cerca del núcleo.",
    transmission:
      "La caja de seguridad está casi retirada. El Custodio empieza a moverse.",
    end: "Ascensor liberado. Bajamos al anillo. Allí la avería puede atacarnos por dos entradas.",
    medal: medals.stabilize,
    flip: true,
    bend: 0.88,
  },
  {
    chapter: 1,
    name: "Filtrado",
    task: "Reabre la estación de filtrado.",
    speaker: "Mara · Operaciones",
    briefing:
      "Aquí se bifurcan los conductos. La ruta violeta desemboca en el mismo núcleo. Si una entrada cae, la otra también queda expuesta.",
    cue: "Compara las entradas A y B en cada oleada. Una torre cerca de la unión puede alcanzar las dos.",
    transmission:
      "Estoy desviando los conductos al filtro. Comprueba ambos accesos en el siguiente parte.",
    end: "La estación vuelve a responder. El sensor de la cámara fría sigue por encima del límite.",
    medal: medals.workshop,
  },
  {
    chapter: 1,
    name: "Refrigeración",
    task: "Mantén los ventiladores en marcha.",
    speaker: "Ivo · Ingeniería",
    briefing:
      "Si apagamos los ventiladores, perderemos el acceso a la cámara central. Puedo mantenerlos desde aquí si los protectores no dejan avanzar a las oleadas.",
    cue: "Ivo puede cambiar el conducto B entre oleadas. El atajo reúne las dos rutas antes, pero los enemigos llegan más rápido al núcleo.",
    transmission:
      "Dos ventiladores operativos. Me falta el tercero. Conserva la energía para el relevo.",
    end: "Temperatura estable. Abro el paso a la cámara fría.",
    medal: medals.reserveLarge,
    bend: 0.86,
  },
  {
    chapter: 1,
    name: "Cámara fría",
    task: "Encauza el retorno de energía.",
    speaker: "Ivo · Ingeniería",
    briefing:
      "El retorno está dando saltos. Usa el pulso con los grupos más peligrosos mientras aíslo el circuito. Los refuerzos llegan rápido desde las dos entradas.",
    cue: "Usa el pulso sobre varios objetivos a la vez. Los abatidos ayudan a recargarlo.",
    transmission:
      "El retorno aguanta. Si ves escudos agrupados, es el momento del pulso.",
    end: "Retorno estable. El mecanismo de sellado ya tiene una línea limpia.",
    medal: medals.stabilize,
    flip: true,
  },
  {
    chapter: 1,
    name: "Sellado",
    task: "Asegura el puente hacia la cámara central.",
    speaker: "Mara · Operaciones",
    briefing:
      "El Centinela de la Galería ha tomado el puente. Primero intentará resistir el fuego; si le bajas la integridad, cargará hacia el núcleo.",
    cue: "El cierre de contención del puente retiene enemigos cercanos durante cuatro segundos. Puedes activarlo una vez por misión.",
    transmission:
      "Puente preparado. En cuanto el Centinela caiga, levanto el cierre de acceso.",
    end: "El puente está libre. Ivo lleva el repuesto y yo tomaré el mando del cierre.",
    medal: medals.doubleSpec,
    flip: true,
    bend: 1.18,
  },
  {
    chapter: 2,
    name: "Cámara central",
    task: "Aísla el núcleo antes del cierre.",
    speaker: "Mara · Operaciones",
    briefing:
      "La central lleva horas repitiendo las mismas órdenes. Hemos aislado la consola, pero todavía tenemos tráfico por los conductos. Protege el último punto de control.",
    cue: "Las entradas están separadas hasta muy tarde. Combina cobertura en cada rama y fuego cerca del núcleo.",
    transmission:
      "La consola acepta órdenes manuales. Necesito que aguante una oleada más.",
    end: "Tenemos el mando manual. Todo listo para desmontar el Núcleo Espejo.",
    medal: medals.workshop,
  },
  {
    chapter: 2,
    name: "Protocolo final",
    task: "Derrota al Núcleo Espejo y cierra el laboratorio.",
    speaker: "Ivo · Ingeniería",
    briefing:
      "El Espejo está sosteniendo el fallo desde dentro. Mara cerrará el complejo en cuanto lo derribes. Aquí se decide si el laboratorio vuelve a estar bajo nuestro control.",
    cue: "El Espejo anuncia refuerzos por A y después por B. Aprovecha el aviso para reforzar el próximo flanco.",
    transmission:
      "El cierre responde. Mara, espera mi señal. Que nadie baje el ritmo en el último tramo.",
    end: "Complejo sellado. El equipo ha salido y el laboratorio vuelve a estar bajo nuestro control.",
    medal: medals.final,
    flip: true,
    bend: 0.92,
  },
];

export function missionRoutes(points, mission, width, height) {
  return points.map(([x, y]) => [
    Math.round(width * (x / width) ** (mission.bend || 1)),
    mission.flip ? height - y : y,
  ]);
}
