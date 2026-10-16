"use strict";

/* TronkStudios · js/tronker.js
   Sistema de frases de Tronker: entiende preguntas escritas SIN IA.
   Se usa cuando la IA del Worker no está disponible (por ejemplo, si
   se ha acabado el uso gratis del día).

   Cómo funciona: cada «intención» tiene frases de ejemplo y el paso
   del guion de js/support.js al que lleva. Se busca la intención cuyas
   frases se parecen más a lo escrito (aguanta faltas, tildes, plurales
   y sinónimos). Para enseñarle frases nuevas, añádelas aquí.
   Se carga como script clásico (ver docs/adr/0002). */

const TronkerPhrases = (() => {
  /* -------- Intenciones: paso del guion + frases de ejemplo -------- */
  const INTENTS = [
    { step: "saludo", phrases: ["hola", "buenas", "hey", "que tal", "buenos dias", "buenas tardes", "hello", "hi"] },
    { step: "gracias", phrases: ["gracias", "muchas gracias", "vale gracias", "genial gracias", "thanks", "thank you"] },
    { step: "despedida", phrases: ["adios", "hasta luego", "chao", "nos vemos", "eso es todo", "bye"] },
    { step: "quien", phrases: ["quien eres", "que eres", "eres una ia", "eres un robot", "como te llamas", "que puedes hacer", "who are you"] },

    { step: "login", phrases: ["no puedo iniciar sesion", "no puedo entrar", "no me deja entrar en mi cuenta", "no puedo acceder", "fallo al iniciar sesion", "no me deja loguearme", "cant log in", "login not working"] },
    { step: "login_pass", phrases: ["invalid login credentials", "credenciales incorrectas", "dice que la contrasena es incorrecta", "correo o contrasena incorrectos"] },
    { step: "login_confirm", phrases: ["email not confirmed", "no me llega el correo de confirmacion", "confirmar correo", "verificar mi cuenta", "no me llega el correo de verificacion", "como confirmo la cuenta"] },
    { step: "login_carga", phrases: ["se queda cargando iniciando sesion", "la web no carga", "no pasa nada al iniciar sesion", "error al iniciar sesion", "la pagina no funciona"] },
    { step: "pass_olvido", phrases: ["olvide mi contrasena", "he olvidado mi contrasena", "se me ha olvidado la contrasena", "me olvide de la contrasena", "no recuerdo la contrasena", "recuperar contrasena", "he perdido la contrasena", "no me acuerdo de la contrasena", "restablecer contrasena", "forgot password"] },
    { step: "pass_cambiar", phrases: ["cambiar la contrasena", "quiero cambiar mi contrasena", "poner otra contrasena", "change password"] },
    { step: "pass_nollega", phrases: ["no me llega el correo para recuperar la contrasena", "no recibo el correo de la contrasena"] },
    { step: "registro", phrases: ["no puedo crear una cuenta", "no me deja registrarme", "error al registrarme", "fallo al crear cuenta"] },
    { step: "registro_nueva", phrases: ["como me registro", "como creo una cuenta", "quiero hacerme una cuenta", "crear cuenta", "sign up", "create account"] },
    { step: "reg_usado", phrases: ["user already registered", "ya existe una cuenta con ese correo", "correo ya registrado"] },
    { step: "reg_pass", phrases: ["la contrasena es muy corta", "requisitos de la contrasena", "password should be at least"] },
    { step: "borrar", phrases: ["borrar mi cuenta", "eliminar mi cuenta", "quiero darme de baja", "quitar mi cuenta", "delete my account"] },

    { step: "juego", phrases: ["un minijuego no funciona", "el juego no va", "problema con un minijuego", "el minijuego falla"] },
    { step: "juego_nocarga", phrases: ["el juego no carga", "el minijuego no carga", "pantalla negra", "pantalla en blanco", "no se abre el minijuego", "game not loading"] },
    { step: "juego_lento", phrases: ["el juego va lento", "el minijuego va muy lento", "va lento", "va a tirones", "lag", "se traba el juego", "pocos fps", "va muy lento"] },
    { step: "juego_controles", phrases: ["los controles no funcionan", "los controles del minijuego no van", "no responden las teclas", "no me deja moverme", "el teclado no funciona en el juego", "no puedo disparar"] },
    { step: "juego_sonido", phrases: ["no hay sonido", "el minijuego no tiene sonido", "no se oye", "quitar el sonido", "silenciar la musica", "no suena el juego"] },
    { step: "juego_record", phrases: ["se ha borrado mi record", "perdi mi record", "no se guarda mi puntuacion", "donde esta mi record", "mi record no aparece"] },

    { step: "bug", phrases: ["reportar un fallo", "he encontrado un bug", "hay un error en la web", "algo no funciona bien", "report a bug"] },
    { step: "sugerencia", phrases: ["tengo una idea", "quiero sugerir algo", "enviar una sugerencia", "proponer una idea", "como sugiero un juego"] },
    { step: "humano", phrases: ["hablar con una persona", "hablar con el equipo", "contactar con vosotros", "quiero un humano", "enviar un correo", "email del equipo", "contact the team"] },

    { step: "info_juegos", phrases: ["que juegos teneis", "que juegos estais creando", "juegos en desarrollo", "proximos juegos"] },
    { step: "info_ztronks", phrases: ["que es z tronks", "cuando sale z tronks", "fecha de z tronks", "z tronks", "juego de zombis", "clases de z tronks", "cuando sale el juego de roblox", "when is z tronks out"] },
    { step: "info_sundered", phrases: ["que es the sundered sky", "sundered sky", "cuando sale the sundered sky", "juego de islas flotantes", "rpg de pc"] },
    { step: "info_minijuegos", phrases: ["que minijuegos hay", "como se juega", "controles de los minijuegos", "a que puedo jugar"] },
    { step: "info_antitronks", phrases: ["como se juega a antitronks", "controles de antitronks", "antitronks", "como disparo"] },
    { step: "info_mogos", phrases: ["como se juega a protect mogos", "protect mogos", "ninjas del castillo"] },
    { step: "info_stickdrill", phrases: ["como se juega a stick drill", "stick drill", "el taladro", "controles de stick drill"] },
    { step: "info_tronkfight", phrases: ["como se juega a tronk fight", "tronk fight", "controles de tronk fight", "luchadores", "ataque especial"] },
    { step: "info_perfil", phrases: ["como cambio mi avatar", "cambiar la foto de perfil", "cambiar mi nombre", "editar mi perfil", "como consigo insignias", "que son las insignias", "mi perfil", "change avatar"] },
    { step: "info_retos", phrases: ["que son los retos", "retos de la comunidad", "como funcionan los retos", "como ayudo en el reto", "la barra de los retos"] },
    { step: "info_deseados", phrases: ["lista de deseados", "anadir un juego a deseados", "anadir a mi lista de deseados", "deseados", "avisarme cuando salga", "como me avisais del lanzamiento", "wishlist"] },
    { step: "info_notificaciones", phrases: ["notificaciones", "donde veo las notificaciones", "la campana", "para que sirve la campana", "no me llegan notificaciones", "avisos"] },
    { step: "info_app", phrases: ["instalar la app", "descargar la app", "hay app para movil", "poner la web en el movil", "funciona sin internet", "jugar sin internet", "jugar sin conexion", "offline", "install app"] },
    { step: "info_ajustes", phrases: ["cambiar el idioma", "poner en ingles", "modo oscuro", "modo claro", "cambiar el tema", "quitar los sonidos de la web", "atajos de teclado", "english"] },
    { step: "info_trabajar", phrases: ["quiero trabajar con vosotros", "puedo ayudaros", "buscais gente", "quiero ser parte del equipo", "unirme al equipo", "soy artista", "hago musica y quiero ayudar", "puedo ayudar", "se programar"] },
    { step: "info_estudio", phrases: ["que es tronkstudios", "quienes sois", "quien crea los juegos", "cuantos sois en el equipo", "sobre vosotros"] }
  ];

  /* -------- Palabras que no aportan nada -------- */
  const STOPWORDS = new Set((
    "a al algo como con cual cuales de del el en es esta estan este esto ha han hay he la las le les lo los me mi mis " +
    "muy no nos o para pero por que se si sin su sus te ti tu tus un una uno unos y ya yo eso esa ese cuando donde " +
    "puedo puede quiero quieres hacer hace haciendo hago tengo tiene teneis estais cuanto cuantos cuanta the to is my i a an of and it do"
  ).split(" "));

  /* -------- Sinónimos: se cambian por una palabra común -------- */
  const SYNONYMS = {
    clave: "contrasena", password: "contrasena", pass: "contrasena", contra: "contrasena", contrasenas: "contrasena",
    login: "entrar", loguear: "entrar", loguearme: "entrar", logearme: "entrar", acceder: "entrar", iniciar: "entrar", log: "entrar",
    registrarme: "registro", registrar: "registro", registrarse: "registro", apuntarme: "registro",
    eliminar: "borrar", quitar: "borrar", delete: "borrar", baja: "borrar",
    minijuegos: "minijuego", juegos: "juego", game: "juego", games: "juego",
    foto: "avatar", imagen: "avatar", fotos: "avatar",
    mail: "correo", email: "correo", gmail: "correo", emails: "correo", correos: "correo",
    bug: "fallo", error: "fallo", errores: "fallo", fallos: "fallo", bugs: "fallo",
    lento: "lag", tirones: "lag", traba: "lag", fps: "lag",
    musica: "sonido", audio: "sonido", sonidos: "sonido", volumen: "sonido",
    zombis: "zombi", zombies: "zombi", zombie: "zombi",
    ingles: "idioma", english: "idioma", lenguaje: "idioma",
    descargar: "instalar", app: "instalar", aplicacion: "instalar"
  };

  /* -------- Utilidades -------- */
  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ñ/g, "n")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Raíz aproximada: quita plurales y algunas terminaciones
  function stem(word) {
    let w = SYNONYMS[word] || word;

    if (w.length > 5) {
      w = w.replace(/(aciones|acion|amente|mente|ando|iendo)$/, "");
    }

    if (w.length > 4) {
      w = w.replace(/(es|s)$/, "");
    }

    return SYNONYMS[w] || w;
  }

  function tokens(text) {
    return normalize(text)
      .split(" ")
      .filter((word) => word && !STOPWORDS.has(word))
      .map(stem)
      .filter((word) => word.length > 1);
  }

  // Distancia de edición pequeña, para aguantar faltas
  function closeEnough(a, b) {
    if (a === b) {
      return true;
    }

    if (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a))) {
      return true;
    }

    // Palabras cortas solo valen exactas («hora» no es «hola»)
    const shortest = Math.min(a.length, b.length);
    const maxEdits = shortest >= 8 ? 2 : shortest >= 5 ? 1 : 0;

    if (!maxEdits || Math.abs(a.length - b.length) > maxEdits) {
      return false;
    }

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let best = i;

      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
        best = Math.min(best, current[j]);
      }

      if (best > maxEdits) {
        return false;
      }

      previous = current;
    }

    return previous[b.length] <= maxEdits;
  }

  /* -------- Índice: cada frase de ejemplo en tokens, con peso -------- */
  const examples = [];
  const frequency = new Map();

  INTENTS.forEach((intent) => {
    intent.phrases.forEach((phrase) => {
      const list = [...new Set(tokens(phrase))];

      if (!list.length) {
        return;
      }

      examples.push({ step: intent.step, tokens: list });
      list.forEach((token) => frequency.set(token, (frequency.get(token) || 0) + 1));
    });
  });

  // Palabras raras pesan más que palabras que salen en muchas frases
  const weight = (token) => 1 + Math.log(1 + examples.length / (frequency.get(token) || 1));

  /* Devuelve el paso del guion que mejor encaja, o null si no lo sabe */
  function match(text) {
    const query = [...new Set(tokens(text))];

    if (!query.length) {
      return null;
    }

    let best = { step: null, score: 0 };

    examples.forEach((example) => {
      let shared = 0;

      example.tokens.forEach((token) => {
        if (query.includes(token)) {
          shared += weight(token);
        } else if (query.some((word) => closeEnough(word, token))) {
          // Parecida (falta de ortografía): cuenta un poco menos
          shared += weight(token) * 0.8;
        }
      });

      if (!shared) {
        return;
      }

      const exampleWeight = example.tokens.reduce((total, token) => total + weight(token), 0);
      const queryWeight = query.reduce((total, word) => total + weight(word), 0);
      const score = shared / Math.sqrt(exampleWeight * queryWeight);

      if (score > best.score) {
        best = { step: example.step, score };
      }
    });

    return best.score >= 0.42 ? best : null;
  }

  return { match, normalize, tokens };
})();

window.TronkerPhrases = TronkerPhrases;
