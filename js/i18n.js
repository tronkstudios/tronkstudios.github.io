"use strict";

/* TronkStudios · js/i18n.js
   Versión en inglés de la web.

   Cómo funciona: la web está escrita en español. Si el idioma es inglés,
   este archivo recorre la página y cambia cada texto (y los atributos
   placeholder, aria-label, title y alt) por su traducción de I18N_EN.
   Un MutationObserver traduce también lo que se añade después desde
   JavaScript (chat de soporte, perfiles, notificaciones...).

   - Para traducir un texto nuevo: añade "texto en español": "English"
     a I18N_EN. Si lleva números o nombres, añade una regla a I18N_PATTERNS.
   - Lo que escriben los usuarios (ideas, nombres, biografías) no se traduce.
   - El idioma se elige con el botón ES / EN de la cabecera y se recuerda.
     La primera vez se usa el idioma del navegador.

   Se carga SIN defer al final del <body>, antes que el resto de scripts,
   para que no se vea la web en español un instante. */

/* =========================================================
   IDIOMA ACTUAL
   ========================================================= */

const LANG_KEY = "tronk-lang";

const LANG = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);

    if (saved === "es" || saved === "en") {
      return saved;
    }
  } catch {
    // Sin localStorage se usa el idioma del navegador
  }

  return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
})();

/* Formato de fechas según el idioma */
function currentLocale() {
  return LANG === "en" ? "en-US" : "es-ES";
}

function setLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Si no se puede guardar, solo cambia en esta visita
  }

  window.location.reload();
}

/* =========================================================
   DICCIONARIO ESPAÑOL → INGLÉS
   ========================================================= */

const I18N_EN = {
  /* ---------- Cabecera y menú ---------- */
  "TronkStudios, volver arriba": "TronkStudios, back to top",
  "Juegos, creatividad y desarrollo": "Games, creativity and development",
  "Notificaciones": "Notifications",
  "Abrir menú": "Open menu",
  "Cerrar menú": "Close menu",
  "Navegación principal": "Main navigation",
  "En desarrollo": "In development",
  "Nuestros Juegos": "Our Games",
  "Minijuegos": "Minigames",
  "Comunidad": "Community",
  "Novedades": "News",
  "Sobre nosotros": "About us",
  "Soporte": "Support",
  "Cuenta": "Account",
  "Cambiar tema": "Change theme",
  "Oscuro": "Dark",
  "Claro": "Light",
  "Cambiar a modo claro": "Switch to light mode",
  "Cambiar a modo oscuro": "Switch to dark mode",
  "Cambiar idioma": "Change language",
  "TronkStudios | Videojuegos y Determinación": "TronkStudios | Video Games and Determination",

  /* ---------- Portada ---------- */
  "Estudio independiente de videojuegos": "Independent video game studio",
  "Videojuegos y": "Video games and",
  "determinación": "determination",
  "Creamos juegos originales, desde experiencias en Roblox hasta minijuegos que se juegan en el navegador. Descubre nuestros proyectos, juega y ayúdanos a decidir qué construimos después.":
    "We make original games, from Roblox experiences to minigames you can play in your browser. Discover our projects, play and help us decide what we build next.",
  "Explorar los juegos": "Explore the games",
  "Jugar minijuegos": "Play minigames",
  "Instalar app": "Install app",
  "TronkStudios en cifras": "TronkStudios in numbers",
  "juegos finalizados": "finished games",
  "juego finalizado": "finished game",
  "juegos en desarrollo": "games in development",
  "juego en desarrollo": "game in development",
  "Logo de TronkStudios": "TronkStudios logo",
  "Canal de YouTube de TronkStudios (se abre en otra pestaña)": "TronkStudios YouTube channel (opens in a new tab)",
  "Sigue nuestros avances en el canal de YouTube": "Follow our progress on our YouTube channel",
  "Ver canal": "Watch",

  /* ---------- Juegos en desarrollo ---------- */
  "Juegos en desarrollo": "Games in development",
  "Proyectos que estamos desarrollando actualmente.": "Projects we are currently working on.",
  "Ver detalles de Z Tronks": "See Z Tronks details",
  "Z Tronks - juego de zombis para Roblox": "Z Tronks - zombie game for Roblox",
  "Categoría:": "Category:",
  "Categoría": "Category",
  "Ver detalles de The Sundered Sky": "See The Sundered Sky details",
  "The Sundered Sky - RPG de aventuras en islas flotantes hechas de cubos": "The Sundered Sky - adventure RPG on floating islands made of cubes",
  "Juego": "Game",
  "Acción · Supervivencia · Cooperativo": "Action · Survival · Co-op",
  "RPG · Aventura · Fantasía": "RPG · Adventure · Fantasy",
  "Idea": "Idea",
  "Alfa": "Alpha",
  "Beta": "Beta",
  "Disponible": "Available",
  "Por confirmar": "To be confirmed",
  "Ver ficha completa": "See full details",
  "Ver tráiler": "Watch trailer",
  "Ver Trailer": "Watch trailer",
  "No hay tráiler disponible todavía": "No trailer available yet",
  "Imagen no disponible": "Image not available",
  "¡Sale mañana!": "Out tomorrow!",
  "¡Sale hoy!": "Out today!",
  "¡Ya disponible!": "Available now!",
  "Sin fecha todavía": "No date yet",
  "Arte principal": "Main art",
  "Más capturas pronto": "More screenshots soon",
  "Capturas y arte conceptual": "Screenshots and concept art",
  "Añadir a deseados": "Add to wishlist",
  "En tu lista de deseados": "On your wishlist",
  "Avísame cuando salga": "Notify me when it's out",
  "Te avisaremos cuando salga": "We'll let you know when it's out",
  "Género": "Genre",
  "Plataformas": "Platforms",
  "Equipo": "Team",
  "Estado": "Status",
  "Lanzamiento estimado": "Estimated release",
  "Cerrar": "Close",
  "Z Tronks es un juego de acción y supervivencia ambientado en un mundo devastado por un apocalipsis zombi. Los jugadores deberán explorar una ciudad abandonada, enfrentarse a diferentes tipos de zombis, completar misiones y conseguir experiencia y recursos para mejorar a su personaje.":
    "Z Tronks is an action and survival game set in a world devastated by a zombie apocalypse. Players must explore an abandoned city, face different kinds of zombies, complete missions and earn experience and resources to upgrade their character.",
  "Cada jugador podrá elegir entre distintas clases, como Gunner, Warrior, Rogue y Medic, cada una con sus propias armas, habilidades y estilos de combate. A medida que avances, podrás desbloquear nuevas habilidades, conseguir mejor equipamiento y enfrentarte a enemigos cada vez más peligrosos.":
    "Each player can choose between different classes, such as Gunner, Warrior, Rogue and Medic, each with their own weapons, abilities and fighting styles. As you progress, you'll unlock new abilities, get better gear and face ever more dangerous enemies.",
  "Forma un equipo con tus amigos, sobrevive al apocalipsis y conviértete en uno de los supervivientes más poderosos de Z Tronks.":
    "Team up with your friends, survive the apocalypse and become one of the most powerful survivors in Z Tronks.",
  "The Sundered Sky es un RPG de fantasía y aventuras en un mundo hecho de cubos. Hace siglos, un gran cataclismo conocido como la Ruptura partió el antiguo continente en pedazos, y hoy sus restos flotan como islas sobre un inmenso mar de nubes.":
    "The Sundered Sky is a fantasy adventure RPG in a world made of cubes. Centuries ago, a great cataclysm known as the Sundering broke the old continent into pieces, and today its remains float like islands over a vast sea of clouds.",
  "Junto a tus amigos viajarás en un barco volador por un archipiélago que se genera al azar en cada partida. Explora biomas muy distintos, descubre criaturas nunca vistas, visita ciudades de razas y facciones con sus propias ideas, y adéntrate en mazmorras llenas de tesoros. Elige tu clase, consigue armas y armaduras, fabrica equipo, doma mascotas y mejora tu barco para llegar cada vez más lejos.":
    "With your friends you'll sail a flying ship across an archipelago that is randomly generated every game. Explore very different biomes, discover never-before-seen creatures, visit cities of races and factions with their own ideas, and venture into dungeons full of treasure. Choose your class, find weapons and armor, craft gear, tame pets and upgrade your ship to travel ever further.",
  "Cada pueblo habla su propia lengua. Aprende sus palabras poco a poco para leer libros antiguos, desvelar los secretos de la Ruptura y enfrentarte a jefes legendarios. Un mundo de aventuras para todas las edades, pensado para disfrutarlo en compañía.":
    "Every people speaks its own language. Learn their words little by little to read ancient books, uncover the secrets of the Sundering and face legendary bosses. A world of adventure for all ages, made to be enjoyed together.",

  /* ---------- Nuestros juegos / Roblox / Minijuegos ---------- */
  "Descubre los juegos creados por TronkStudios.": "Discover the games made by TronkStudios.",
  "No hay nada todavía.": "Nothing here yet.",
  "Nuestros proyectos y experiencias en Roblox.": "Our Roblox projects and experiences.",
  "No hay experiencias disponibles todavía.": "No experiences available yet.",
  "Descubre nuestros minijuegos.": "Discover our minigames.",
  "Abrir Antitronks": "Open Antitronks",
  "Antitronks - minijuego de disparos": "Antitronks - shooting minigame",
  "Abrir Protect Mogos": "Open Protect Mogos",
  "Protect Mogos - minijuego de ninjas": "Protect Mogos - ninja minigame",
  "Abrir Stick Drill": "Open Stick Drill",
  "Stick Drill - minijuego de esquivar el taladro": "Stick Drill - dodge-the-drill minigame",
  "Abrir Tronk Fight": "Open Tronk Fight",
  "Tronk Fight - duelo de stickmans": "Tronk Fight - stickman duel",
  "Clasificación": "Leaderboard",
  "Elegir minijuego": "Choose minigame",
  "Tus récords se guardan en tu cuenta al acabar cada partida.": "Your records are saved to your account after each game.",
  "Inicia sesión para guardar tus récords y salir en la clasificación.": "Log in to save your records and appear on the leaderboard.",
  "No se pudo cargar la clasificación.": "Couldn't load the leaderboard.",
  "Nadie tiene récord todavía. ¡Sé el primero!": "No records yet. Be the first!",
  "Ver perfil": "View profile",
  "puntos": "points",
  "victorias": "wins",

  /* ---------- Comunidad ---------- */
  "Consulta las ideas de la comunidad, vota tus favoritas y propón las tuyas.": "Browse the community's ideas, vote for your favorites and suggest your own.",
  "Sugerir una idea": "Suggest an idea",
  "Únete a la comunidad.": "Join the community.",
  "Crea una cuenta gratis para proponer ideas y votar las que más te gusten.": "Create a free account to suggest ideas and vote for the ones you like most.",
  "Crear cuenta": "Create account",
  "Encuestas": "Polls",
  "Abierta": "Open",
  "Cerrada": "Closed",
  "· Puedes cambiar tu voto": "· You can change your vote",
  "Inicia sesión para votar en las encuestas.": "Log in to vote in polls.",
  "Todas": "All",
  "Mis sugerencias": "My suggestions",
  "Buscar sugerencias...": "Search suggestions...",
  "Buscar sugerencias": "Search suggestions",
  "Filtrar por categoría": "Filter by category",
  "Todas las categorías": "All categories",
  "Filtrar por estado": "Filter by status",
  "Todos los estados": "All statuses",
  "Pendiente": "Pending",
  "En estudio": "Under review",
  "Planeada": "Planned",
  "Hecha": "Done",
  "Descartada": "Rejected",
  "Ordenar sugerencias": "Sort suggestions",
  "Más recientes": "Newest",
  "Más votadas": "Most voted",
  "Cargando sugerencias...": "Loading suggestions...",
  "No hay sugerencias para mostrar.": "No suggestions to show.",
  "No se pudieron cargar las sugerencias.": "Couldn't load suggestions.",
  "Configura Supabase para mostrar las sugerencias.": "Set up Supabase to show suggestions.",
  "Sin conexión. Las sugerencias volverán cuando tengas internet.": "You're offline. Suggestions will be back when you have internet.",
  "Respuesta del equipo": "Team reply",
  "Sin categoría": "No category",
  "Quitar tu voto": "Remove your vote",
  "Votar esta sugerencia": "Vote for this suggestion",
  "Eliminar": "Delete",
  "No se pudo quitar": "Couldn't remove",
  "No se pudo votar": "Couldn't vote",
  "¿Seguro que quieres eliminar esta sugerencia?": "Are you sure you want to delete this suggestion?",
  "Inicia sesión o crea una cuenta para proponer ideas.": "Log in or create an account to suggest ideas.",
  "Crea tu cuenta para proponer ideas y votar.": "Create your account to suggest ideas and vote.",
  "Inicia sesión para votar las sugerencias.": "Log in to vote for suggestions.",
  "Comparte una idea para mejorar TronkStudios.": "Share an idea to improve TronkStudios.",
  "Escribe tu idea...": "Write your idea...",
  "Enviar idea": "Send idea",
  "Las sugerencias todavía no están configuradas porque falta conectar Supabase.": "Suggestions aren't set up yet because Supabase isn't connected.",
  "Necesitas iniciar sesión para enviar una sugerencia.": "You need to log in to send a suggestion.",
  "Completa todos los campos.": "Fill in all the fields.",
  "Enviando sugerencia...": "Sending suggestion...",
  "No se pudo enviar la sugerencia.": "Couldn't send the suggestion.",
  "¡Sugerencia enviada correctamente!": "Suggestion sent!",
  "Ha ocurrido un error al enviar la sugerencia.": "Something went wrong while sending the suggestion.",
  "Aplicación": "App",

  /* ---------- Notificaciones ---------- */
  "No tienes notificaciones todavía.": "You don't have any notifications yet.",
  "ahora": "now",
  "Tu idea ahora está: Pendiente": "Your idea is now: Pending",
  "Tu idea ahora está: En estudio": "Your idea is now: Under review",
  "Tu idea ahora está: Planeada": "Your idea is now: Planned",
  "Tu idea ahora está: Hecha": "Your idea is now: Done",
  "Tu idea ahora está: Descartada": "Your idea is now: Rejected",
  "El equipo ha respondido a tu idea": "The team has replied to your idea",
  "Pediste que te avisáramos cuando saliera.": "You asked us to let you know when it came out.",
  "Ver ficha": "See details",
  "Cerrar aviso": "Close notice",

  /* ---------- Diario de desarrollo ---------- */
  "Diario de desarrollo": "Development diary",
  "Las últimas novedades de nuestros juegos y de la web.": "The latest news about our games and the website.",
  "Ocultar diario": "Hide diary",
  "Mostrar diario": "Show diary",
  "Mostrar más": "Show more",
  "Ver y escribir comentarios": "See and write comments",
  "Cargando comentarios...": "Loading comments...",
  "No se pudieron cargar los comentarios.": "Comments couldn't be loaded.",
  "Todavía no hay comentarios. ¡Sé el primero en opinar!": "No comments yet. Be the first to share your opinion!",
  "Borrar comentario": "Delete comment",
  "¿Borrar este comentario?": "Delete this comment?",
  "Inicia sesión para dejar tu opinión.": "Log in to share your opinion.",
  "Inicia sesión para comentar las ideas de la comunidad.": "Log in to comment on the community's ideas.",
  "Escribe tu opinión...": "Write your opinion...",
  "Tu comentario": "Your comment",
  "Comentar": "Comment",
  "El Juego Miente": "The Game Lies",
  "EL JUEGO MIENTE": "THE GAME LIES",
  "Abrir El Juego Miente": "Open The Game Lies",
  "Cerrar El Juego Miente": "Close The Game Lies",
  "El Juego Miente - minijuego de reacción con colores": "The Game Lies - colour reaction minigame",
  "OBEDECE A LA PALABRA": "OBEY THE WORD",
  "OBEDECE AL COLOR": "OBEY THE COLOUR",
  "NI UNO NI OTRO": "NEITHER ONE",
  "¡NO PULSES NADA!": "DON'T PRESS ANYTHING!",
  "ROJO": "RED",
  "AZUL": "BLUE",
  "VERDE": "GREEN",
  "AMARILLO": "YELLOW",
  "¡CAMBIO DE REGLA!": "RULE CHANGE!",
  "¡SE ACABÓ EL TIEMPO!": "TIME'S UP!",
  "¡TE HE DICHO QUE NO!": "I SAID DON'T!",
  "¡TE HA ENGAÑADO!": "IT FOOLED YOU!",
  "¡BIEN AGUANTADO!": "WELL RESISTED!",
  "Aciertos": "Correct",
  "Obedece a la regla… aunque el juego intente engañarte.": "Obey the rule… even if the game tries to fool you.",
  "Arriba sale la regla y en el centro una palabra de color. «Obedece a la palabra»: pulsa el color que dice. «Obedece al color»: pulsa el color en que está escrita. La regla cambia… y el juego miente cada vez más. Teclas 1-4 o toca los botones.": "The rule is at the top and a colour word in the middle. “Obey the word”: press the colour it says. “Obey the colour”: press the colour it's written in. The rule changes… and the game lies more and more. Keys 1-4 or tap the buttons.",
  "El Juego Miente: no te fíes de nada.": "The Game Lies: don't trust anything.",
  "Lee bien la regla antes de pulsar.": "Read the rule carefully before pressing.",
  "El Juego Miente: arriba sale una regla y en el centro una palabra de color escrita en otro color.": "The Game Lies: a rule appears at the top and a colour word in the middle, written in a different colour.",
  "«Obedece a la palabra»: pulsa el color que dice. «Obedece al color»: pulsa el color en que está escrita. «Ni uno ni otro»: pulsa otro distinto. Si sale «¡No pulses nada!», espera. Teclas 1-4 o toca los botones. Tienes 3 vidas.": "“Obey the word”: press the colour it says. “Obey the colour”: press the colour it's written in. “Neither one”: press a different one. If “Don't press anything!” appears, wait. Keys 1-4 or tap the buttons. You have 3 lives.",
  "Retar a un amigo": "Challenge a friend",
  "¡Enlace copiado! Pégalo a tu amigo": "Link copied! Paste it to your friend",
  "Aceptar reto": "Accept challenge",
  "Reto de un amigo": "Challenge from a friend",
  "Constante": "Consistent",
  "Entrar a la web 7 días seguidos": "Visit the website 7 days in a row",
  "Imparable": "Unstoppable",
  "Entrar a la web 30 días seguidos": "Visit the website 30 days in a row",
  "Espera unos segundos antes de volver a comentar.": "Wait a few seconds before commenting again.",
  "No se pudo enviar. Inténtalo de nuevo.": "Couldn't send it. Try again.",

  "Todas las sugerencias": "All suggestions",
  "Filtrar novedades": "Filter news",
  "Desarrollo": "Development",
  "Actualización": "Update",
  "Anuncio": "Announcement",
  "Ver entradas anteriores": "See older entries",
  "Encuestas, notificaciones y avatares nuevos": "Polls, notifications and new avatars",
  "Ahora puedes ver en qué estado está cada idea y lo que opina el equipo, votar en encuestas, recibir notificaciones y elegir uno de los 12 avatares dibujados para tu perfil. Además, la web estrena iconos propios.":
    "You can now see the status of each idea and what the team thinks, vote in polls, get notifications and choose one of 12 hand-drawn avatars for your profile. The website also gets its own icons.",
  "Perfiles, lista de deseados y clasificación": "Profiles, wishlist and leaderboard",
  "Con tu cuenta ya tienes perfil con avatar e insignias, puedes guardar juegos en tu lista de deseados, pedir que te avisemos cuando salgan y competir en la clasificación de los minijuegos.":
    "Your account now comes with a profile with an avatar and badges. You can save games to your wishlist, ask us to notify you when they come out and compete on the minigame leaderboard.",
  "Nueva portada y diario de desarrollo": "New homepage and development diary",
  "La web estrena portada con fondo animado, fichas de juego más completas, un apartado de comunidad renovado, la sección «Sobre TronkStudios» y este diario para contar cada novedad.":
    "The website gets a new homepage with an animated background, more complete game pages, a revamped community area, the “About TronkStudios” section and this diary to share every update.",
  "Ahora puedes quitar tu voto": "You can now remove your vote",
  "En Comunidad, si ya has votado una idea, al pulsar otra vez «Votar» se retira tu voto. También cambiamos el orden de la página: los juegos en desarrollo van primero.":
    "In Community, if you've already voted for an idea, pressing “Vote” again removes your vote. We also changed the page order: games in development come first.",
  "The Sundered Sky entra en desarrollo": "The Sundered Sky enters development",
  "Nuevo proyecto: un RPG de fantasía en un mundo de islas flotantes hechas de cubos, que se recorre en barco volador con amigos. Ya tiene su ficha en «Juegos en desarrollo».":
    "New project: a fantasy RPG in a world of floating islands made of cubes, explored by flying ship with friends. It already has its page in “Games in development”.",
  "Tronk Fight a dos jugadores": "Two-player Tronk Fight",
  "Tronk Fight ya se puede jugar contra un amigo en el mismo teclado o en el mismo móvil, con un mando para cada uno. En móvil ocupa toda la pantalla y los controles no tapan a los luchadores.":
    "Tronk Fight can now be played against a friend on the same keyboard or phone, with a controller for each player. On phones it goes full screen and the controls don't cover the fighters.",
  "Nuevo minijuego: Tronk Fight": "New minigame: Tronk Fight",
  "Un duelo de stickmans con 7 luchadores, cada uno con su arma y su ataque especial, parrys, esquivas y un bot con 3 dificultades. Equilibrado con miles de combates simulados.":
    "A stickman duel with 7 fighters, each with their own weapon and special attack, parries, dodges and a bot with 3 difficulty levels. Balanced with thousands of simulated fights.",
  "Tráiler de Z Tronks": "Z Tronks trailer",
  "Publicamos el primer tráiler de Z Tronks, que se puede ver en su tarjeta y en su ficha.": "We released the first Z Tronks trailer, which you can watch on its card and its page.",
  "Ordenamos el código de la web": "We tidied up the website's code",
  "Dividimos un archivo de 8.000 líneas en 11 piezas, documentamos las decisiones importantes y el soporte empezó a enviar una respuesta automática a quien nos escribe.":
    "We split an 8,000-line file into 11 pieces, documented the important decisions, and support started sending an automatic reply to anyone who writes to us.",
  "Stick Drill en el móvil": "Stick Drill on mobile",
  "Stick Drill se puede jugar en el móvil con dos joysticks táctiles, a dos jugadores en la misma pantalla o contra el bot.":
    "Stick Drill can be played on mobile with two touch joysticks, with two players on the same screen or against the bot.",
  "Soporte de verdad": "Real support",
  "Conectamos el soporte a un servidor propio: el chat con Tronker y el formulario de correo funcionan sin dejar ninguna clave secreta a la vista.":
    "We connected support to our own server: the Tronker chat and the email form work without exposing any secret keys.",
  "Nace la web de TronkStudios": "The TronkStudios website is born",
  "Primera versión de nuestra web, hecha en un repositorio aparte (TronkWeb) y unida después a la actual.":
    "The first version of our website, built in a separate repository (TronkWeb) and later merged into the current one.",

  /* ---------- Sobre TronkStudios ---------- */
  "Sobre TronkStudios": "About TronkStudios",
  "Quiénes somos, qué juegos queremos crear y cómo trabajamos.": "Who we are, what games we want to make and how we work.",
  "Somos un grupo de desarrolladores que disfrutan haciendo juegos originales y divertidos para que la gente se lo pase bien. Nos esmeramos al máximo en lo que hacemos.":
    "We're a group of developers who love making original, fun games for people to enjoy. We put our all into what we do.",
  "Qué es el estudio": "What the studio is",
  "TronkStudios es un estudio independiente de videojuegos. Somos un equipo pequeño que diseña, programa y publica sus propios juegos, de la primera idea al lanzamiento.":
    "TronkStudios is an independent video game studio. We're a small team that designs, programs and publishes our own games, from the first idea to launch.",
  "Qué juegos creamos": "What games we make",
  "Juegos de todo tipo: desde aventuras con modo historia hasta juegos sencillos para pasar un buen rato, inspirados en las sugerencias de nuestra comunidad.":
    "All kinds of games: from story-driven adventures to simple games to have a good time, inspired by our community's suggestions.",
  "Qué nos diferencia": "What makes us different",
  "Escuchamos a quien juega: las ideas de la comunidad se votan aquí mismo y guían lo que hacemos. Y contamos el desarrollo en abierto, con nuestro diario y el código de la web en GitHub.":
    "We listen to players: the community votes on ideas right here and they guide what we do. And we develop in the open, with our diary and the website's code on GitHub.",
  "Nuestros objetivos": "Our goals",
  "Crear juegos que la gente disfrute y con los que viva buenas experiencias.": "Make games people enjoy and that give them great experiences.",
  "Construir una comunidad sana.": "Build a healthy community.",
  "Cumplir nuestras promesas.": "Keep our promises.",
  "Tecnologías que usamos": "Technologies we use",
  "Tecnologías": "Technologies",
  "HTML, CSS y JavaScript": "HTML, CSS and JavaScript",
  "Más información": "More information",

  /* ---------- Cómo lo hicimos ---------- */
  "Cómo lo hicimos": "How we made it",
  "El camino desde la primera idea hasta la web que tenemos hoy. Pulsa la flecha para ir avanzando.":
    "The journey from the first idea to the website we have today. Press the arrow to move forward.",
  "Septiembre de 2026": "September 2026",
  "La idea": "The idea",
  "Queríamos un sitio propio donde enseñar nuestros juegos. Empezamos con una primera web en un repositorio aparte, TronkWeb, hecha a mano con HTML, CSS y JavaScript, sin frameworks, y la publicamos gratis en GitHub Pages.":
    "We wanted our own place to show our games. We started with a first website in a separate repository, TronkWeb, handmade with HTML, CSS and JavaScript, with no frameworks, and published it for free on GitHub Pages.",
  "25 y 26 de septiembre": "September 25 and 26",
  "Los primeros minijuegos": "The first minigames",
  "Para que la web no fuera solo un escaparate, añadimos minijuegos que se juegan en el propio navegador, como Stick Drill, y fuimos ajustando el equilibrio partida a partida.":
    "So the website wasn't just a showcase, we added minigames you play right in the browser, like Stick Drill, and kept fine-tuning the balance game after game.",
  "Problema": "Problem",
  "Solución": "Solution",
  "Queríamos música y efectos sin llenar la web de archivos de audio pesados.": "We wanted music and sound effects without filling the website with heavy audio files.",
  "Todo el sonido se genera en el momento con la Web Audio API, así que la web no pesa ni un solo archivo de audio más.":
    "All the sound is generated on the fly with the Web Audio API, so the website doesn't carry a single extra audio file.",
  "26 de septiembre": "September 26",
  "Una sola web": "One single website",
  "Unimos TronkWeb a este repositorio y le dimos su dirección y su nombre definitivos: tronkstudios.github.io.":
    "We merged TronkWeb into this repository and gave it its final name and address: tronkstudios.github.io.",
  "28 de septiembre": "September 28",
  "Imágenes que no cargaban": "Images that wouldn't load",
  "Al publicarla, algunas tarjetas salían con un hueco roto. También preparamos la vista previa grande que se ve al compartir el enlace o en Google.":
    "When we published it, some cards showed a broken image. We also set up the large preview you see when sharing the link or on Google.",
  "En nuestro ordenador las imágenes se veían, pero en GitHub Pages no.": "The images showed up on our computer, but not on GitHub Pages.",
  "GitHub Pages distingue mayúsculas: «Antitronks.png» no es «antitronks.png». Pusimos todos los nombres en minúsculas y, si una imagen falla, sale el nombre del juego en su lugar.":
    "GitHub Pages is case-sensitive: “Antitronks.png” is not “antitronks.png”. We made every file name lowercase and, if an image fails, the game's name appears instead.",
  "Conectamos el soporte a un servidor propio, un Cloudflare Worker, para que el formulario de correo funcionara de verdad.":
    "We connected support to our own server, a Cloudflare Worker, so the email form would really work.",
  "Enviar correos necesita una clave secreta, y todo lo que subimos a GitHub Pages lo puede leer cualquiera.":
    "Sending emails needs a secret key, and anyone can read everything we upload to GitHub Pages.",
  "El Worker guarda las claves y es el único que envía los correos. En el código público de la web no hay ni una sola clave secreta.":
    "The Worker keeps the keys and is the only one that sends emails. There isn't a single secret key in the website's public code.",
  "29 de septiembre": "September 29",
  "Móvil y seguridad": "Mobile and security",
  "Stick Drill pasó a poder jugarse en el móvil con dos joysticks táctiles, mejoramos las contraseñas, añadimos el banner del canal de YouTube y reforzamos la seguridad de la web.":
    "Stick Drill became playable on mobile with two touch joysticks, we improved passwords, added the YouTube channel banner and strengthened the website's security.",
  "5 de octubre": "October 5",
  "Ordenar la casa": "Tidying up",
  "El código había crecido hasta un único archivo de 8.000 líneas. Lo dividimos en 11 piezas, escribimos la documentación, el soporte empezó a contestar automáticamente y añadimos una protección contra bots.":
    "The code had grown into a single 8,000-line file. We split it into 11 pieces, wrote the documentation, support started replying automatically and we added bot protection.",
  "5 y 6 de octubre": "October 5 and 6",
  "Tronk Fight y nuevos proyectos": "Tronk Fight and new projects",
  "Llegó Tronk Fight, un juego de lucha con 7 luchadores, contra el bot o a dos jugadores, también en el móvil. Publicamos el tráiler de Z Tronks y presentamos The Sundered Sky.":
    "Tronk Fight arrived: a fighting game with 7 fighters, against the bot or two players, also on mobile. We released the Z Tronks trailer and announced The Sundered Sky.",
  "15 de octubre": "October 15",
  "Una web que de verdad nos sirve": "A website that really works for us",
  "Portada nueva, fichas completas de los juegos, diario de desarrollo, perfiles con avatares, lista de deseados, clasificación de los minijuegos y una comunidad con encuestas y panel del equipo. Por fin, la web que queríamos al empezar.":
    "A new homepage, full game pages, a development diary, profiles with avatars, a wishlist, minigame leaderboards and a community with polls and a team panel. Finally, the website we wanted from the start.",
  "Paso anterior": "Previous step",
  "Siguiente": "Next",
  "Volver a empezar": "Start over",
  "Volver al primer paso": "Back to the first step",
  "Ver el siguiente paso": "See the next step",

  /* ---------- YouTube y Roblox ---------- */
  "Últimos vídeos": "Latest videos",
  "Jugando ahora": "Playing now",
  "Visitas": "Visits",
  "Favoritos": "Favorites",
  "Me gusta": "Likes",
  "Jugar en Roblox": "Play on Roblox",
  "En directo": "Live",

  /* ---------- Pie y app ---------- */
  "Ver el CHANGELOG": "View the CHANGELOG",
  "Llega la v6 de la web": "Version 6 of the website is here",
  "La web se adapta a cualquier pantalla, del móvil más pequeño a un monitor 4K, se puede instalar como una app, funciona sin conexión y ya está en inglés.":
    "The website adapts to any screen, from the smallest phone to a 4K monitor, can be installed as an app, works offline and is now available in English.",
  "Sin conexión: puedes seguir jugando a los minijuegos.": "You're offline: you can keep playing the minigames.",
  "¿Necesitas ayuda? Soporte": "Need help? Support",
  "Repositorio de TronkStudios en GitHub (se abre en otra pestaña)": "TronkStudios repository on GitHub (opens in a new tab)",

  /* ---------- Cuenta ---------- */
  "Tu cuenta": "Your account",
  "Inicia sesión para participar en la comunidad.": "Log in to take part in the community.",
  "Correo electrónico": "Email",
  "Contraseña": "Password",
  "Iniciar sesión": "Log in",
  "¿Olvidaste tu contraseña?": "Forgot your password?",
  "¿No tienes cuenta?": "Don't have an account?",
  "Crea una cuenta para publicar sugerencias.": "Create an account to post suggestions.",
  "Nombre": "Name",
  "¿Ya tienes cuenta?": "Already have an account?",
  "Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.": "Enter your account email and we'll send you a link to choose a new password.",
  "Enviar enlace": "Send link",
  "Volver a iniciar sesión": "Back to log in",
  "Elige tu nueva contraseña.": "Choose your new password.",
  "Nueva contraseña": "New password",
  "Repite la contraseña": "Repeat the password",
  "Guardar contraseña": "Save password",
  "Cancelar": "Cancel",
  "Usuario": "User",
  "correo": "email",
  "Ver mi perfil": "View my profile",
  "Panel del equipo": "Team panel",
  "Cambiar contraseña": "Change password",
  "Cerrar sesión": "Log out",
  "Sin correo": "No email",
  "Ya casi está: elige tu nueva contraseña.": "Almost there: choose your new password.",
  "Escribe la contraseña nueva que quieres usar.": "Enter the new password you want to use.",
  "La cuenta todavía no está configurada. Primero hay que conectar Supabase.": "Accounts aren't set up yet. Supabase needs to be connected first.",
  "Introduce tu correo y contraseña.": "Enter your email and password.",
  "Iniciando sesión...": "Logging in...",
  "No se pudo iniciar sesión.": "Couldn't log in.",
  "Has iniciado sesión correctamente.": "You're logged in.",
  "Ha ocurrido un error al iniciar sesión.": "Something went wrong while logging in.",
  "Creando cuenta...": "Creating account...",
  "No se pudo crear la cuenta.": "Couldn't create the account.",
  "Cuenta creada correctamente.": "Account created.",
  "Ha ocurrido un error al crear la cuenta.": "Something went wrong while creating the account.",
  "Has pedido demasiados enlaces seguidos. Espera un minuto y vuelve a intentarlo.": "You've requested too many links in a row. Wait a minute and try again.",
  "La contraseña nueva tiene que ser distinta de la anterior.": "The new password must be different from the old one.",
  "La contraseña necesita al menos 6 caracteres.": "The password needs at least 6 characters.",
  "El enlace ha caducado. Pide uno nuevo desde «¿Olvidaste tu contraseña?».": "The link has expired. Request a new one from “Forgot your password?”.",
  "Ha ocurrido un error. Inténtalo de nuevo.": "Something went wrong. Please try again.",
  "Escribe el correo de tu cuenta.": "Enter your account email.",
  "Enviando enlace...": "Sending link...",
  "Si hay una cuenta con ese correo, te llegará un enlace en unos minutos. Mira también en Spam.": "If there's an account with that email, you'll get a link in a few minutes. Check your spam folder too.",
  "No se ha podido enviar el enlace. Inténtalo de nuevo.": "Couldn't send the link. Please try again.",
  "Las dos contraseñas no coinciden.": "The two passwords don't match.",
  "Guardando contraseña...": "Saving password...",
  "Contraseña cambiada correctamente.": "Password changed.",
  "No se ha podido cambiar la contraseña. Inténtalo de nuevo.": "Couldn't change the password. Please try again.",
  "No se pudo cerrar sesión.": "Couldn't log out.",
  "Sesión cerrada correctamente.": "You're logged out.",
  "Ha ocurrido un error al cerrar sesión.": "Something went wrong while logging out.",
  "¡Cuenta verificada! Ya puedes participar en la comunidad.": "Account verified! You can now take part in the community.",
  "¡Revisa tu correo!": "Check your email!",
  "Te hemos enviado un correo de verificación a": "We've sent a verification email to",
  ". Confirma tu cuenta haciendo clic en el enlace antes de iniciar sesión.": ". Confirm your account by clicking the link before logging in.",
  "Confirma tu cuenta haciendo clic en el enlace antes de iniciar sesión.": "Confirm your account by clicking the link before logging in.",
  "Correo enviado": "Email sent",

  /* ---------- Perfil ---------- */
  "Editar perfil": "Edit profile",
  "idea": "idea",
  "ideas": "ideas",
  "votos recibidos": "votes received",
  "deseado": "wishlisted",
  "deseados": "wishlisted",
  "Insignias": "Badges",
  "Todavía no tienes insignias.": "You don't have any badges yet.",
  "Todavía no tiene insignias.": "No badges yet.",
  "Lista de deseados": "Wishlist",
  "Aún no tienes juegos. Abre la ficha de un juego y pulsa «Añadir a deseados».": "No games yet. Open a game's page and press “Add to wishlist”.",
  "Aún no tiene juegos en su lista.": "No games on their list yet.",
  "Récords": "Records",
  "Avatar": "Avatar",
  "Sobre ti (máximo 160 caracteres)": "About you (max. 160 characters)",
  "Guardar": "Save",
  "Guardando...": "Saving...",
  "El nombre debe tener al menos 2 caracteres.": "The name must have at least 2 characters.",
  "No se pudo guardar el perfil. Inténtalo de nuevo.": "Couldn't save the profile. Please try again.",
  "Cargando perfil...": "Loading profile...",
  "No se pudo cargar este perfil.": "Couldn't load this profile.",
  "Inicia sesión para guardar juegos en tu lista de deseados.": "Log in to save games to your wishlist.",
  "Inicia sesión para que te avisemos cuando salga el juego.": "Log in so we can let you know when the game comes out.",
  "Zombi": "Zombie",
  "Caballero": "Knight",
  "Mago": "Wizard",
  "Astronauta": "Astronaut",
  "Zorro": "Fox",
  "Fantasma": "Ghost",
  "Pirata": "Pirate",
  "Fundador": "Founder",
  "Primera idea": "First idea",
  "Proponer una idea en Comunidad": "Suggest an idea in Community",
  "Mente creativa": "Creative mind",
  "Proponer 5 ideas": "Suggest 5 ideas",
  "Idea popular": "Popular idea",
  "Que una de tus ideas llegue a 10 votos": "Have one of your ideas reach 10 votes",
  "Votante": "Voter",
  "Votar una idea de la comunidad": "Vote for a community idea",
  "Fan": "Fan",
  "Añadir un juego a tu lista de deseados": "Add a game to your wishlist",
  "Atento": "Watchful",
  "Pedir aviso del lanzamiento de un juego": "Ask to be notified about a game's release",
  "Jugador": "Player",
  "Guardar un récord en un minijuego": "Save a record in a minigame",
  "Todoterreno": "All-rounder",
  "Tener récord en 4 minijuegos": "Have a record in 4 minigames",
  "Luchador": "Fighter",
  "Ganar 10 combates de Tronk Fight al bot": "Win 10 Tronk Fight matches against the bot",

  /* ---------- Panel del equipo (pestañas) ---------- */
  "Secciones del panel": "Panel sections",
  "Ideas": "Ideas",
  "Diario": "Diary",
  "Lanzamientos": "Releases",
  "Avisos": "Notices",

  /* ---------- Minijuegos ---------- */
  "Silenciar": "Mute",
  "Activar sonido": "Unmute",
  "JUGAR": "PLAY",
  "Cerrar Antitronks": "Close Antitronks",
  "Apunta con el ratón y haz clic para disparar a los Antitronks. Gira la cámara con A (izquierda) y D (derecha).":
    "Aim with the mouse and click to shoot the Antitronks. Turn the camera with A (left) and D (right).",
  "Apunta con el ratón y haz clic para disparar a los Antitronks. Gira la cámara con A (izquierda) y D (derecha). ¡No dispares a los civiles (manos arriba)!":
    "Aim with the mouse and click to shoot the Antitronks. Turn the camera with A (left) and D (right). Don't shoot civilians (hands up)!",
  "GAME OVER": "GAME OVER",
  "ANTITRONK ELIMINADO": "ANTITRONK DOWN",
  "¡A LA CABEZA! +2": "HEADSHOT! +2",
  "¡DISPARO A LA CABEZA!": "HEADSHOT!",
  "¡CIVIL!": "CIVILIAN!",
  "¡HAS DISPARADO A UN CIVIL!": "YOU SHOT A CIVILIAN!",
  "¡TE HAN DISPARADO!": "YOU'VE BEEN SHOT!",
  "¡OTRA VEZ!": "AGAIN!",
  "¡NUEVO RÉCORD!": "NEW RECORD!",
  "Cerrar Protect Mogos": "Close Protect Mogos",
  "Haz clic en los ninjas antes de que lleguen al castillo del rey.": "Click the ninjas before they reach the king's castle.",
  "Haz clic en los ninjas antes de que lleguen al castillo del rey. Cinta roja: 1 clic. Cinta dorada: 2 clics. Cinta morada: 2 clics, ¡pero con el primero da una voltereta hacia delante y se acerca al castillo!":
    "Click the ninjas before they reach the king's castle. Red headband: 1 click. Gold headband: 2 clicks. Purple headband: 2 clicks, but the first one makes it somersault forward towards the castle!",
  "¡UN NINJA HA LLEGADO AL CASTILLO!": "A NINJA REACHED THE CASTLE!",
  "¡VOLTERETA!": "SOMERSAULT!",
  "Cerrar Stick Drill": "Close Stick Drill",
  "J1: VIVO": "P1: ALIVE",
  "BOT: VIVO": "BOT: ALIVE",
  "J2: VIVO": "P2: ALIVE",
  "Esquiva el taladro que rebota por las paredes. El que caiga primero pierde.": "Dodge the drill bouncing off the walls. Whoever falls first loses.",
  "Esquiva el taladro que rebota por las paredes. El que caiga primero pierde. Jugador 1 (azul): W A S D. Jugador 2 (rojo): flechas.":
    "Dodge the drill bouncing off the walls. Whoever falls first loses. Player 1 (blue): W A S D. Player 2 (red): arrow keys.",
  "Esquiva el taladro que rebota por las paredes. El que caiga primero pierde. Mueve a tu stickman con el joystick: J1 (azul) a la izquierda, J2 (rojo) a la derecha.":
    "Dodge the drill bouncing off the walls. Whoever falls first loses. Move your stickman with the joystick: P1 (blue) on the left, P2 (red) on the right.",
  "CONTRA EL BOT": "VS THE BOT",
  "2 JUGADORES": "2 PLAYERS",
  "J2: flechas": "P2: arrow keys",
  "J1: joystick izquierdo": "P1: left joystick",
  "J2: joystick derecho": "P2: right joystick",
  "¡CUIDADO! ¡OTRO TALADRO!": "WATCH OUT! ANOTHER DRILL!",
  "¡EMPATE!": "IT'S A DRAW!",
  "¡GANA EL BOT!": "THE BOT WINS!",
  "JUGADOR 1": "PLAYER 1",
  "JUGADOR 2": "PLAYER 2",

  /* ---------- Tronk Fight ---------- */
  "Cerrar Tronk Fight": "Close Tronk Fight",
  "Combate de Tronk Fight": "Tronk Fight match",
  "Siete luchadores, un solo duelo.": "Seven fighters, one duel.",
  "Contra el bot": "Vs the bot",
  "Dos jugadores": "Two players",
  "Controles": "Controls",
  "Un juego de TronkStudios": "A TronkStudios game",
  "Elige a tu luchador": "Choose your fighter",
  "Volver": "Back",
  "Tú": "You",
  "Dificultad del bot": "Bot difficulty",
  "Fácil": "Easy",
  "Normal": "Normal",
  "Difícil": "Hard",
  "Elegir": "Choose",
  "Al azar": "Random",
  "Luchadores": "Fighters",
  "Elige escenario": "Choose a stage",
  "Escenarios": "Stages",
  "¡A luchar!": "Fight!",
  "Teclado": "Keyboard",
  "Moverse": "Move",
  "o flechas": "or arrow keys",
  "Saltar": "Jump",
  "Atacar": "Attack",
  "Bloquear": "Block",
  "(mantener)": "(hold)",
  "Esquivar": "Dodge",
  "Especial": "Special",
  "Pausa": "Pause",
  "Móvil": "Mobile",
  "Joystick izquierdo": "Left joystick",
  "Joystick hacia arriba": "Joystick up",
  "Botón rosa grande": "Big pink button",
  "Botón azul (mantener)": "Blue button (hold)",
  "Botón Esquivar + dirección": "Dodge button + direction",
  "Botón dorado cuando brilla": "Gold button when it glows",
  "Jugador 1": "Player 1",
  "Jugador 2": "Player 2",
  "moverse,": "move,",
  "saltar,": "jump,",
  "atacar,": "attack,",
  "bloquear,": "block,",
  "esquivar,": "dodge,",
  "especial": "special",
  "Flechas para moverse y saltar,": "Arrow keys to move and jump,",
  "Mayús": "Shift",
  "derecha especial (o teclado numérico:": "right special (or numeric keypad:",
  "Móvil o tablet": "Phone or tablet",
  "Cada jugador tiene su mando en su mitad de la pantalla": "Each player has their controller on their half of the screen",
  "Parry:": "Parry:",
  "pulsa bloquear justo antes de que te golpeen. El rival queda aturdido y tú ganas especial. Si mantienes el bloqueo pulsado no hay parry: hay que acertar el momento.":
    "press block right before you're hit. Your opponent is stunned and you gain special. If you hold block there's no parry: you have to time it.",
  "te hace invulnerable un instante. La barra de especial se llena al dar y recibir golpes.":
    "makes you invulnerable for a moment. The special bar fills up when you land and take hits.",
  "Entendido": "Got it",
  "Seguir": "Resume",
  "Reiniciar combate": "Restart match",
  "Cambiar luchadores": "Change fighters",
  "Salir al menú": "Exit to menu",
  "Música": "Music",
  "Sangre": "Blood",
  "Controles táctiles": "Touch controls",
  "Pantalla completa": "Full screen",
  "Revancha": "Rematch",
  "Menú": "Menu",
  "Joystick del jugador 1": "Player 1 joystick",
  "Ataque especial del jugador 1": "Player 1 special attack",
  "Esquivar del jugador 1": "Player 1 dodge",
  "Bloquear del jugador 1": "Player 1 block",
  "Atacar del jugador 1": "Player 1 attack",
  "Joystick del jugador 2": "Player 2 joystick",
  "Ataque especial del jugador 2": "Player 2 special attack",
  "Esquivar del jugador 2": "Player 2 dodge",
  "Bloquear del jugador 2": "Player 2 block",
  "Atacar del jugador 2": "Player 2 attack",
  "Gira el móvil: Tronk Fight se juega en horizontal.": "Rotate your phone: Tronk Fight is played in landscape.",
  "Seguir igualmente": "Continue anyway",
  "Espada": "Sword",
  "Tajo relámpago": "Lightning slash",
  "Cruza media pantalla de un tajo. Ideal para castigar desde lejos.": "Crosses half the screen in one slash. Great for punishing from afar.",
  "Ballesta": "Crossbow",
  "Si el rival se pega, da un culatazo.": "If the opponent gets close, it strikes with the stock.",
  "Triple virote": "Triple bolt",
  "Dispara tres virotes en abanico: difícil de esquivar saltando.": "Fires three bolts in a fan: hard to dodge by jumping.",
  "Mazo": "Hammer",
  "Aguanta golpes rápidos mientras prepara el mazazo.": "Shrugs off quick hits while winding up the smash.",
  "Terremoto": "Earthquake",
  "Golpea el suelo y lanza ondas a los dos lados. Solo se evita saltando.": "Strikes the ground and sends shockwaves both ways. Only jumping avoids it.",
  "Lanza": "Spear",
  "Lanza arrojadiza": "Thrown spear",
  "Lanza su arma a toda velocidad. Atraviesa los virotes.": "Throws the weapon at full speed. It goes through bolts.",
  "Guadaña": "Scythe",
  "Siega giratoria": "Spinning reap",
  "Gira con la guadaña y golpea tres veces a los dos lados, atrayendo al rival.": "Spins with the scythe and hits three times on both sides, pulling the opponent in.",
  "Hacha": "Axe",
  "Aguanta golpes rápidos mientras prepara el hachazo.": "Shrugs off quick hits while winding up the chop.",
  "Hachazo aéreo": "Aerial chop",
  "Salta y cae con un hachazo que rompe la guardia.": "Jumps and lands with a guard-breaking chop.",
  "Tridente": "Trident",
  "Tridente eléctrico": "Electric trident",
  "Descarga eléctrica que deja al rival paralizado un momento.": "An electric shock that paralyzes the opponent for a moment.",
  "Ciudad": "City",
  "Garaje": "Garage",
  "Bolera": "Bowling alley",
  "Cine": "Cinema",
  "Estación de tren": "Train station",
  "Salidas": "Departures",
  "¡Parry!": "Parry!",
  "¡Guardia rota!": "Guard broken!",
  "¡Aguanta!": "Hang on!",
  "¡Contra!": "Counter!",
  "Ronda final": "Final round",
  "Ronda": "Round",
  "¡Tiempo!": "Time!",
  "¡Lucha!": "Fight!",
  "¡Perfecto!": "Perfect!",
  "¡Especial listo!": "Special ready!",
  "Jugador 1: elige luchador": "Player 1: choose a fighter",
  "Jugador 2: elige luchador": "Player 2: choose a fighter",
  "Elige a tu rival": "Choose your opponent",
  "Daño": "Damage",
  "Velocidad": "Speed",
  "Alcance": "Reach",
  "Movilidad": "Mobility",
  "Rondas": "Rounds",
  "Golpes": "Hits",
  "Parrys": "Parries",
  "Combo máximo": "Max combo",

  /* ---------- Soporte (menú, chat y formulario) ---------- */
  "Cerrar soporte": "Close support",
  "¿Cómo quieres que te ayudemos?": "How would you like us to help?",
  "Hablar con Tronker": "Talk to Tronker",
  "Nuestro asistente te ayuda al momento con juegos, errores, tu cuenta o la web.": "Our assistant helps you right away with games, bugs, your account or the website.",
  "Enviar un correo": "Send an email",
  "Escríbenos y te responderemos a tu correo electrónico.": "Write to us and we'll reply to your email.",
  "Volver a las opciones de soporte": "Back to support options",
  "Asistente de soporte": "Support assistant",
  "Nueva conversación": "New conversation",
  "Empezar una nueva conversación": "Start a new conversation",
  "Cerrar chat": "Close chat",
  "Elige una respuesta": "Choose an answer",
  "Elige una opción para continuar. La conversación no se guarda.": "Choose an option to continue. The conversation isn't saved.",
  "¿Prefieres escribirnos un correo?": "Prefer to send us an email?",
  "Te responderemos al correo que indiques.": "We'll reply to the email you give us.",
  "Cerrar formulario": "Close form",
  "Para poder responderte": "So we can reply to you",
  "Asunto": "Subject",
  "Categoría del problema": "Problem category",
  "Elige una categoría": "Choose a category",
  "Juegos": "Games",
  "Error técnico": "Technical error",
  "Otros": "Other",
  "Descripción del problema": "Problem description",
  "Descripción": "Description",
  "Cuéntanos qué ha pasado, en qué juego o sección y qué estabas haciendo.": "Tell us what happened, in which game or section and what you were doing.",
  "No rellenes este campo": "Don't fill in this field",
  "Enviar mensaje": "Send message",
  "Enviando...": "Sending...",
  "Tronker está escribiendo": "Tronker is typing",
  "Volver al menú": "Back to menu",
  "¡Hola! Soy Tronker, el asistente de soporte de TronkStudios.": "Hi! I'm Tronker, TronkStudios' support assistant.",
  "Elige la opción que describe tu problema.": "Choose the option that describes your problem.",
  "No puedo iniciar sesión": "I can't log in",
  "Olvidé o quiero cambiar mi contraseña": "I forgot or want to change my password",
  "No puedo crear una cuenta": "I can't create an account",
  "Un minijuego no carga o va mal": "A minigame won't load or isn't working",
  "Quiero reportar un fallo": "I want to report a bug",
  "Quiero enviar una sugerencia": "I want to send a suggestion",
  "Quiero borrar mi cuenta": "I want to delete my account",
  "Hablar con el equipo": "Talk to the team",
  "Vamos a arreglarlo. ¿Qué mensaje te sale al intentar entrar?": "Let's fix it. What message do you see when you try to log in?",
  "«Invalid login credentials»": "“Invalid login credentials”",
  "«Email not confirmed»": "“Email not confirmed”",
  "«Ha ocurrido un error al iniciar sesión»": "“Something went wrong while logging in”",
  "No pasa nada o se queda en «Iniciando sesión...»": "Nothing happens or it gets stuck on “Logging in...”",
  "Ese mensaje significa que el correo o la contraseña no coinciden. Prueba esto, en orden:": "That message means the email or password doesn't match. Try this, in order:",
  "1. Revisa que no tengas el bloqueo de mayúsculas activado.": "1. Make sure Caps Lock isn't on.",
  "2. Comprueba que el correo esté bien escrito, sin espacios al final.": "2. Check the email is spelled correctly, with no spaces at the end.",
  "3. Asegúrate de que usas el mismo correo con el que creaste la cuenta.": "3. Make sure you're using the same email you created the account with.",
  "4. Si nunca llegaste a crear la cuenta, créala primero.": "4. If you never actually created the account, create it first.",
  "¿Has podido entrar?": "Were you able to log in?",
  "Sí, ya entré": "Yes, I'm in",
  "No recuerdo la contraseña": "I don't remember the password",
  "Creo que no tengo cuenta": "I don't think I have an account",
  "Al crear la cuenta te enviamos un correo de confirmación. Tienes que pulsar el enlace de ese correo antes de poder entrar.":
    "When you created the account we sent you a confirmation email. You have to click the link in that email before you can log in.",
  "1. Busca en tu bandeja de entrada un correo de confirmación.": "1. Look in your inbox for a confirmation email.",
  "2. Mira también en Spam y en Promociones.": "2. Also check Spam and Promotions.",
  "3. Pulsa el enlace: te devolverá a esta web y ya podrás iniciar sesión.": "3. Click the link: it will bring you back to this website and you'll be able to log in.",
  "¿Lo has encontrado?": "Did you find it?",
  "Sí, ya está confirmada": "Yes, it's confirmed",
  "No me llega ningún correo": "I'm not getting any email",
  "Suele ser cosa del navegador. Prueba:": "It's usually the browser. Try this:",
  "1. Recarga la página con Ctrl + F5 (o Cmd + Mayús + R en Mac).": "1. Reload the page with Ctrl + F5 (or Cmd + Shift + R on Mac).",
  "2. Abre la web en una ventana de incógnito.": "2. Open the website in an incognito window.",
  "3. Desactiva un momento los bloqueadores de anuncios.": "3. Turn off ad blockers for a moment.",
  "4. Prueba con otro navegador (Chrome, Firefox o Edge).": "4. Try another browser (Chrome, Firefox or Edge).",
  "¿Ha funcionado?": "Did it work?",
  "Sí, ya funciona": "Yes, it works now",
  "No, sigue igual": "No, still the same",
  "Entonces puede que el servidor de cuentas esté teniendo problemas en este momento.": "Then the account server may be having problems right now.",
  "Espera unos 15 minutos y vuelve a intentarlo. Mientras tanto, los minijuegos se pueden jugar sin iniciar sesión.": "Wait about 15 minutes and try again. In the meantime, you can play the minigames without logging in.",
  "¿Quieres avisar al equipo igualmente?": "Do you want to let the team know anyway?",
  "Sí, avisar al equipo": "Yes, tell the team",
  "No, esperaré": "No, I'll wait",
  "¿Qué necesitas?": "What do you need?",
  "No recuerdo mi contraseña": "I don't remember my password",
  "Quiero cambiarla (sé la actual)": "I want to change it (I know the current one)",
  "Te ayudo a recuperarla:": "I'll help you recover it:",
  "1. Pulsa el botón de abajo y escribe el correo de tu cuenta.": "1. Press the button below and enter your account email.",
  "2. Te llegará un correo con un enlace (mira también en Spam).": "2. You'll get an email with a link (check Spam too).",
  "3. Pulsa el enlace: volverás a esta web y podrás elegir tu contraseña nueva.": "3. Click the link: you'll come back to this website and can choose your new password.",
  "Nunca te pediremos tu contraseña por correo ni por este chat.": "We'll never ask for your password by email or in this chat.",
  "Recuperar mi contraseña": "Recover my password",
  "No me llega el correo": "I'm not getting the email",
  "El enlace no funciona": "The link doesn't work",
  "Ya la he cambiado": "I've already changed it",
  "Para cambiarla necesitas haber iniciado sesión.": "You need to be logged in to change it.",
  "Pulsa el botón de abajo, escribe la contraseña nueva dos veces y pulsa «Guardar contraseña». También lo encontrarás en «Cuenta» → «Cambiar contraseña».":
    "Press the button below, enter the new password twice and press “Save password”. You'll also find it in “Account” → “Change password”.",
  "Cambiar mi contraseña": "Change my password",
  "Comprueba estas cosas:": "Check these things:",
  "• Que el correo es exactamente el de tu cuenta.": "• That the email is exactly your account's email.",
  "• La carpeta de Spam y la de Promociones.": "• Your Spam and Promotions folders.",
  "• Espera un par de minutos: pedirlo muchas veces seguidas lo bloquea un rato.": "• Wait a couple of minutes: requesting it many times in a row blocks it for a while.",
  "¿Ha llegado?": "Has it arrived?",
  "Sí, ya llegó": "Yes, it arrived",
  "No, sigue sin llegar": "No, still nothing",
  "Si al pulsar el enlace no te deja cambiarla, probablemente ha caducado o ya lo usaste.": "If the link won't let you change it, it has probably expired or you've already used it.",
  "Pide un enlace nuevo y ábrelo en el mismo navegador donde lo pediste.": "Request a new link and open it in the same browser where you requested it.",
  "Pedir un enlace nuevo": "Request a new link",
  "Sigue sin funcionar": "Still not working",
  "¿Qué pasa al intentar crear la cuenta?": "What happens when you try to create the account?",
  "«User already registered»": "“User already registered”",
  "Me dice algo de la contraseña": "It says something about the password",
  "Me dice que revise mi correo": "It tells me to check my email",
  "No pasa nada o sale un error": "Nothing happens or I get an error",
  "Para crear una cuenta, pulsa «Cuenta» arriba del todo y luego «Crear cuenta».": "To create an account, press “Account” at the very top and then “Create account”.",
  "Después tendrás que confirmar tu correo con el enlace que te enviaremos.": "Then you'll need to confirm your email with the link we send you.",
  "Abrir la ventana de Cuenta": "Open the Account window",
  "Tengo otro problema": "I have another problem",
  "Eso significa que ya existe una cuenta con ese correo. Prueba a iniciar sesión con él.": "That means there's already an account with that email. Try logging in with it.",
  "¿Qué quieres hacer?": "What would you like to do?",
  "Ya lo he resuelto": "I've solved it",
  "La contraseña necesita al menos 6 caracteres. Te recomendamos mezclar letras y números.": "The password needs at least 6 characters. We recommend mixing letters and numbers.",
  "¿Ya te deja?": "Does it work now?",
  "Sí, cuenta creada": "Yes, account created",
  "No, sigue sin dejarme": "No, it still won't let me",
  "¿Qué minijuego te da problemas?": "Which minigame is giving you trouble?",
  "Todos": "All of them",
  "¿Qué le pasa exactamente?": "What exactly is wrong?",
  "No carga o se queda en blanco/negro": "It won't load or stays white/black",
  "Va lento o a tirones": "It's slow or choppy",
  "Los controles no responden": "The controls don't respond",
  "No hay sonido": "There's no sound",
  "Se ha borrado mi récord": "My record was deleted",
  "Prueba esto:": "Try this:",
  "1. Recarga la página con Ctrl + F5.": "1. Reload the page with Ctrl + F5.",
  "2. Asegúrate de que tu navegador está actualizado.": "2. Make sure your browser is up to date.",
  "3. Desactiva un momento las extensiones o bloqueadores.": "3. Turn off extensions or blockers for a moment.",
  "4. Si estás en el móvil, prueba en un ordenador.": "4. If you're on a phone, try on a computer.",
  "¿Ya carga?": "Does it load now?",
  "No, sigue sin cargar": "No, it still won't load",
  "Para que vaya más fluido:": "To make it run smoother:",
  "1. Cierra otras pestañas y programas abiertos.": "1. Close other open tabs and programs.",
  "2. Si usas un portátil, enchúfalo al cargador.": "2. If you're on a laptop, plug it into the charger.",
  "3. En Chrome, activa «Usar aceleración de hardware» en Configuración > Sistema.": "3. In Chrome, turn on “Use hardware acceleration” in Settings > System.",
  "¿Va mejor?": "Is it better?",
  "Sí, mucho mejor": "Yes, much better",
  "Haz clic una vez dentro del juego antes de empezar, para que las teclas le lleguen al juego y no a la página.": "Click once inside the game before starting, so the keys go to the game and not the page.",
  "En Stick Drill, el jugador 1 usa W A S D y el jugador 2 las flechas. En móvil o tablet se juega con los joysticks de los lados.": "In Stick Drill, player 1 uses W A S D and player 2 the arrow keys. On a phone or tablet you play with the joysticks on the sides.",
  "¿Ya responde?": "Does it respond now?",
  "No": "No",
  "Sí": "Yes",
  "Cada minijuego tiene un botón de altavoz arriba, junto a la ×. Si ves el altavoz tachado, púlsalo para volver a activar el sonido.": "Each minigame has a speaker button at the top, next to the ×. If you see a crossed-out speaker, press it to turn the sound back on.",
  "Comprueba también que el volumen del dispositivo está subido y que la pestaña no está silenciada.": "Also check that your device's volume is up and the tab isn't muted.",
  "¿Ya se oye?": "Can you hear it now?",
  "Sin iniciar sesión, los récords se guardan solo en tu navegador. Por eso se pierden si:": "Without logging in, records are only saved in your browser. That's why they're lost if:",
  "• Juegas en otro navegador o en otro dispositivo.": "• You play in another browser or on another device.",
  "• Juegas en una ventana de incógnito.": "• You play in an incognito window.",
  "• Borras los datos o las cookies del navegador.": "• You clear your browser data or cookies.",
  "Si inicias sesión, tus récords se guardan también en tu cuenta: los verás en tu perfil y en la clasificación de Minijuegos, desde cualquier dispositivo.":
    "If you log in, your records are also saved to your account: you'll see them on your profile and on the Minigames leaderboard, from any device.",
  "No era nada de eso": "It was none of that",
  "Gracias por avisar. Envía un correo al equipo con la categoría «Error técnico» y cuenta:": "Thanks for letting us know. Send the team an email with the category “Technical error” and tell us:",
  "• Qué juego o parte de la web falla.": "• Which game or part of the website is failing.",
  "• Qué estabas haciendo cuando pasó.": "• What you were doing when it happened.",
  "• Qué navegador y dispositivo usas.": "• Which browser and device you use.",
  "Escribir al equipo": "Write to the team",
  "¡Nos encanta recibir ideas! Puedes publicarla en la sección Comunidad con el botón «Sugerir una idea».": "We love getting ideas! You can post yours in the Community section with the “Suggest an idea” button.",
  "Para publicar necesitas haber iniciado sesión.": "You need to be logged in to post.",
  "Sugerir una idea ahora": "Suggest an idea now",
  "Borrar la cuenta elimina también tus sugerencias, tu perfil, tu lista de deseados y tus récords, y no se puede deshacer.": "Deleting your account also deletes your suggestions, profile, wishlist and records, and it can't be undone.",
  "¿Seguro que quieres seguir?": "Are you sure you want to continue?",
  "Sí, quiero borrarla": "Yes, I want to delete it",
  "No, mejor no": "No, better not",
  "Envía un correo al equipo con la categoría «Cuenta», desde el mismo correo de tu cuenta y con el asunto «Borrar cuenta». El equipo la eliminará y te avisará.":
    "Send the team an email with the category “Account”, from your account's email and with the subject “Delete account”. The team will delete it and let you know.",
  "Te paso con el equipo. Rellena el formulario de correo contando tu problema y lo que ya has probado aquí, así te responderán más rápido.":
    "I'll pass you to the team. Fill in the email form describing your problem and what you've already tried here, so they can reply faster.",
  "¡Genial, me alegro de que esté solucionado! ¿Puedo ayudarte con algo más?": "Great, I'm glad it's sorted! Can I help you with anything else?",
  "Sí, otra cosa": "Yes, something else",
  "No, eso es todo": "No, that's all",
  "De acuerdo. ¿Puedo ayudarte con algo más?": "Okay. Can I help you with anything else?",
  "¡Gracias por jugar a los juegos de TronkStudios! Si vuelves a tener problemas, Tronker estará aquí.": "Thanks for playing TronkStudios games! If you run into problems again, Tronker will be here.",
  "Cerrar el chat": "Close the chat",
  "Usar mi aplicación de correo": "Use my email app",
  "El envío automático todavía no está activado. Al pulsar «Enviar mensaje» se abrirá tu aplicación de correo con el mensaje preparado, y tendrás que enviarlo tú desde allí.":
    "Automatic sending isn't enabled yet. When you press “Send message”, your email app will open with the message ready, and you'll need to send it from there.",
  "Correo electrónico: escribe una dirección válida.": "Email: enter a valid address.",
  "Categoría: elige una de la lista.": "Category: choose one from the list.",
  "Se ha abierto tu aplicación de correo": "Your email app has opened",
  "El mensaje todavía NO se ha enviado: revísalo y pulsa «Enviar» en tu aplicación de correo.": "The message has NOT been sent yet: review it and press “Send” in your email app.",
  "Has enviado demasiados mensajes seguidos. Espera unos minutos antes de volver a intentarlo.": "You've sent too many messages in a row. Wait a few minutes before trying again.",
  "No se ha podido completar la verificación anti-bots. Márcala de nuevo y vuelve a enviar.": "The anti-bot check couldn't be completed. Tick it again and resend.",
  "Algún campo no es válido. Revisa el formulario y vuelve a intentarlo.": "Some field isn't valid. Check the form and try again.",
  "El servidor de correo no ha podido enviar el mensaje. Inténtalo más tarde o usa tu aplicación de correo.": "The mail server couldn't send the message. Try later or use your email app.",
  "Revisa el formulario": "Check the form",
  "Espera un momento": "Wait a moment",
  "Falta la verificación": "Verification missing",
  "Completa la verificación anti-bots antes de enviar.": "Complete the anti-bot check before sending.",
  "Mensaje enviado": "Message sent",
  "El servidor ha tardado demasiado en responder. Es posible que el mensaje no se haya enviado.": "The server took too long to respond. The message may not have been sent.",
  "No se ha podido enviar": "Couldn't send",

  /* ---------- Avatares nuevos ---------- */
  "Rey": "King",
  "Samurái": "Samurai",
  "Vikingo": "Viking",
  "Gato": "Cat",
  "Perro": "Dog",
  "Dragón": "Dragon",
  "Dinosaurio": "Dinosaur",
  "Vaquero": "Cowboy",
  "Vampiro": "Vampire",
  "Momia": "Mummy",
  "Rana": "Frog",
  "Pingüino": "Penguin",
  "Búho": "Owl",
  "Cíborg": "Cyborg",
  "Bruja": "Witch",
  "Tiburón": "Shark",
  "Calabaza": "Pumpkin",
  "OVNI": "UFO",

  /* ---------- Ficha de los retos ---------- */
  "Este reto no tiene descripción.": "This challenge has no description.",
  "Empezó": "Started",
  "Termina": "Ends",
  "Terminó": "Ended",
  "Tu aporte": "Your contribution",
  "Inicia sesión para que cuenten tus partidas": "Sign in so your games count",
  "Mejores contribuidores": "Top contributors",
  "Todavía nadie ha aportado. ¡Sé el primero!": "Nobody has contributed yet. Be the first!",
  "No se pudieron cargar los contribuidores.": "Couldn't load the contributors.",
  "Descripción (opcional): qué hay que hacer, premio, curiosidades...": "Description (optional): what to do, prizes, fun facts...",
  "Descripción del reto": "Challenge description",
  "Reto creado sin descripción: vuelve a ejecutar docs/supabase/retos.sql para poder añadirla.": "Challenge created without a description: run docs/supabase/retos.sql again to be able to add one.",

  /* ---------- Resultados de los minijuegos ---------- */
  "Puntos": "Points",
  "Récord": "Record",
  "Tu récord": "Your record",
  "Mejor racha": "Best streak",
  "Mejor racha (¡nueva!)": "Best streak (new!)",
  "Racha de la partida": "Game streak",
  " ¡NUEVO RÉCORD!": " NEW RECORD!",

  /* ---------- Mascota 3D ---------- */
  "Esta es la web de TronkStudios.": "This is the TronkStudios website.",
  "Más abajo tienes los juegos y los minijuegos.": "The games and minigames are further down.",
  "Estos son los juegos que estamos haciendo.": "These are the games we're making.",
  "Pulsa una tarjeta para ver la ficha completa.": "Tap a card to see the full page.",
  "Z Tronks: zombis, misiones y cuatro clases.": "Z Tronks: zombies, missions and four classes.",
  "Añádelo a deseados y te aviso cuando salga.": "Add it to your wishlist and I'll tell you when it's out.",
  "The Sundered Sky: islas flotantes y barcos voladores.": "The Sundered Sky: floating islands and flying ships.",
  "Todavía no tiene fecha, pero va avanzando.": "No date yet, but it's coming along.",
  "Aquí saldrán los juegos ya terminados.": "Finished games will show up here.",
  "De momento está vacío, pero no por mucho tiempo.": "It's empty for now, but not for long.",
  "Aquí verás los juegos de Roblox con jugadores en directo.": "Here you'll see our Roblox games with live players.",
  "Cuando salga Z Tronks, aparecerá aquí.": "When Z Tronks is out, it'll show up here.",
  "Todos se juegan aquí mismo, gratis.": "You can play all of them right here, for free.",
  "Con la sesión iniciada, tus récords salen en la clasificación.": "When you're signed in, your records show up on the leaderboard.",
  "Antitronks: ojo con los civiles.": "Antitronks: watch out for civilians.",
  "Disparar a la cabeza da el doble de puntos.": "Headshots give double points.",
  "Protect Mogos: que no lleguen al castillo.": "Protect Mogos: don't let them reach the castle.",
  "Cuanto más aguantas, más rápidos van.": "The longer you last, the faster they get.",
  "Stick Drill: esquiva el taladro.": "Stick Drill: dodge the drill.",
  "Se puede jugar contra un amigo en el mismo teclado.": "You can play against a friend on the same keyboard.",
  "Tronk Fight: siete luchadores para elegir.": "Tronk Fight: seven fighters to choose from.",
  "Llena la barra y usa el ataque especial.": "Fill the bar and use the special attack.",
  "Cada partida tuya suma a la barra del reto.": "Every game you play adds to the challenge bar.",
  "Si se supera el reto, os llega un aviso a todos.": "If the challenge is completed, everyone gets a notification.",
  "A ver quién va primero.": "Let's see who's first.",
  "Solo cuentan las partidas con la sesión iniciada.": "Only games played while signed in count.",
  "Aquí la comunidad propone ideas.": "This is where the community suggests ideas.",
  "Puedes votar las ideas que más te gusten.": "You can vote for the ideas you like most.",
  "Si te gusta esta idea, vótala.": "If you like this idea, vote for it.",
  "El equipo responde a las ideas por aquí.": "The team replies to ideas here.",
  "Vota en la encuesta, que el equipo la mira.": "Vote in the poll, the team reads it.",
  "Aquí el equipo cuenta en qué está trabajando.": "Here the team shares what it's working on.",
  "Estos son los últimos vídeos del canal.": "These are the latest videos from the channel.",
  "Los Shorts nuevos salen aquí solos.": "New Shorts show up here automatically.",
  "Aquí te contamos quiénes somos.": "Here we tell you who we are.",
  "Un poco más abajo está cómo empezó todo.": "A bit further down is how it all started.",
  "Pulsa la flecha para ver la siguiente parte.": "Press the arrow to see the next part.",
  "Si dibujas, haces música o programas, escríbenos.": "If you draw, make music or code, write to us.",
  "Elige lo tuyo y te sale el formulario.": "Pick what you do and the form will open.",
  "¿Qué pasa, Tronk?": "What's up, Tronk?",
  "¿Necesitas algo?": "Need anything?",
  "Púlsame si tienes dudas.": "Tap me if you have questions.",
  "Ups, me había dormido.": "Oops, I fell asleep.",
  "¡Vamos!": "Let's go!",
  "A ver qué tal.": "Let's see how it goes.",
  "¡Buena!": "Nice!",
  "¡Muy buena!": "Very nice!",
  "¡Bien ahí!": "Well done!",
  "¡Limpio!": "Clean!",
  "¡Vas fino!": "You're on fire!",
  "¡Menuda racha!": "What a streak!",
  "¡Imparable!": "Unstoppable!",
  "¡Por los pelos!": "That was close!",
  "¡Uf, casi!": "Phew, almost!",
  "¡Qué cerca!": "So close!",
  "¡Que era un civil!": "That was a civilian!",
  "Ese no, ese no.": "Not that one!",
  "¡Au!": "Ouch!",
  "Tranqui, sigue.": "Easy, keep going.",
  "¡Última vida!": "Last life!",
  "Cuidado, te queda una.": "Careful, one left.",
  "¡Especial!": "Special!",
  "¡Toma ya!": "Take that!",
  "¡Nuevo récord!": "New record!",
  "Buena partida.": "Good game.",
  "¿Otra?": "Another one?",
  "Casi.": "Almost.",
  "¡Victoria!": "Victory!",
  "¡Ganaste!": "You won!",
  "Casi. ¿Revancha?": "Almost. Rematch?",
  "La próxima.": "Next time.",
  "¡Ronda tuya!": "Your round!",
  "Venga, la siguiente.": "Come on, next one.",
  "Ocultar a Tronker": "Hide Tronker",
  "Mostrar a Tronker": "Show Tronker",

  /* ---------- Tronker con IA ---------- */
  "¿Cómo prefieres hablar conmigo?": "How would you like to talk to me?",
  "Escribiendo mis preguntas": "Typing my questions",
  "Eligiendo entre temas": "Choosing from topics",
  "¿Qué pasa, Tronk? Soy Tronker, el asistente de TronkStudios.": "What's up, Tronk? I'm Tronker, the TronkStudios assistant.",
  "¡Genial! Escríbeme abajo lo que quieras: dudas de la web, de los juegos o de tu cuenta, o cualquier otra pregunta (deberes, curiosidades, ideas...).": "Great! Type below whatever you want: questions about the website, the games or your account, or anything else (homework, fun facts, ideas...).",
  "¿De qué tema quieres hablar?": "Which topic would you like to talk about?",
  "Mi cuenta": "My account",
  "Juegos y minijuegos": "Games and minigames",
  "Perfil, retos y comunidad": "Profile, challenges and community",
  "La web y TronkStudios": "The website and TronkStudios",
  "Algo no funciona": "Something isn't working",
  "Prefiero escribir": "I'd rather type",
  "¿Qué necesitas con tu cuenta?": "What do you need with your account?",
  "Mi contraseña": "My password",
  "Crear una cuenta": "Create an account",
  "Borrar mi cuenta": "Delete my account",
  "¿Qué quieres saber?": "What would you like to know?",
  "Cómo se juega a los minijuegos": "How to play the minigames",
  "Un minijuego va mal": "A minigame isn't working well",
  "¿Sobre qué tienes dudas?": "What do you have questions about?",
  "Perfil, avatar e insignias": "Profile, avatar and badges",
  "Enviar una idea": "Send an idea",
  "Trabajar con vosotros": "Work with you",
  "Vamos a arreglarlo. ¿Qué falla?": "Let's fix it. What's wrong?",
  "No puedo entrar en mi cuenta": "I can't get into my account",
  "Otra cosa de la web": "Something else on the website",
  "Ver los temas": "See the topics",
  "¿Qué pasa, Tronk? ¿En qué te puedo ayudar? Escríbeme tu duda.": "What's up, Tronk? How can I help you? Type your question.",
  "Prefiero elegir temas": "I'd rather choose topics",
  "Volver a los temas": "Back to topics",
  "Escribe tu pregunta. La conversación no se guarda.": "Type your question. The conversation is not saved.",
  "No estoy seguro de haberte entendido. Ahora mismo estoy en modo de respuestas rápidas y solo entiendo preguntas sobre TronkStudios. Prueba con otras palabras, mira los temas o vuelve en un rato para preguntarme lo que quieras.": "I'm not sure I understood you. Right now I'm in quick-answer mode and only understand questions about TronkStudios. Try other words, look at the topics or come back in a while to ask me anything.",
  "¡Claro! ¿Sobre qué tienes dudas?": "Sure! What would you like to know about?",
  "Los juegos en desarrollo": "The games in development",
  "Los minijuegos y sus controles": "The minigames and their controls",
  "Mi perfil, avatar e insignias": "My profile, avatar and badges",
  "Los retos de la comunidad": "The community challenges",
  "Lista de deseados y avisos": "Wishlist and launch alerts",
  "Las notificaciones": "Notifications",
  "Instalar la web como app": "Install the website as an app",
  "Idioma, tema, sonidos y atajos": "Language, theme, sounds and shortcuts",
  "Quiero trabajar con vosotros": "I want to work with you",
  "¿Qué es TronkStudios?": "What is TronkStudios?",
  "Ahora mismo tenemos dos juegos en desarrollo. ¿Cuál te interesa?": "Right now we have two games in development. Which one are you interested in?",
  "Otra duda": "Another question",
  "Z Tronks es nuestro juego de Roblox de acción y supervivencia en un apocalipsis zombi: explora una ciudad abandonada, lucha contra zombis, completa misiones y mejora a tu personaje.": "Z Tronks is our Roblox action and survival game set in a zombie apocalypse: explore an abandoned city, fight zombies, complete missions and upgrade your character.",
  "Hay cuatro clases (Gunner, Warrior, Rogue y Medic) y se puede jugar en equipo con amigos.": "There are four classes (Gunner, Warrior, Rogue and Medic) and you can play as a team with friends.",
  "Todavía no tiene fecha. Si lo añades a tu lista de deseados y pulsas «Avisarme», te avisaremos cuando salga.": "It doesn't have a date yet. If you add it to your wishlist and press “Notify me”, we'll let you know when it's out.",
  "The Sundered Sky es un RPG de fantasía y aventuras para PC en un mundo de islas flotantes hechas de cubos, que se recorre en barco volador con amigos.": "The Sundered Sky is a fantasy adventure RPG for PC set in a world of floating islands made of cubes, explored by flying ship with friends.",
  "Todavía no tiene fecha de lanzamiento. Puedes añadirlo a tu lista de deseados para que te avisemos.": "It doesn't have a release date yet. You can add it to your wishlist so we can let you know.",
  "Ver su ficha": "See its page",
  "Hay cinco minijuegos gratis que se juegan aquí mismo, en el navegador. ¿De cuál quieres saber los controles?": "There are five free minigames you can play right here in the browser. Which one do you want the controls for?",
  "Tengo un problema con uno": "I have a problem with one",
  "Antitronks: dispara a los Antitronks sin dar a los civiles.": "Antitronks: shoot the Antitronks without hitting the civilians.",
  "Apunta con el ratón y haz clic para disparar. Gira la cámara con A y D. Tienes 3 vidas, y los disparos a la cabeza dan el doble de puntos.": "Aim with the mouse and click to shoot the Antitronks. Turn the camera with A and D. You have 3 lives, and headshots give double points.",
  "Jugar ahora": "Play now",
  "Tengo un problema con este": "I have a problem with this one",
  "Otro minijuego": "Another minigame",
  "Protect Mogos: protege el castillo del rey.": "Protect Mogos: protect the king's castle.",
  "Haz clic (o toca la pantalla) en los ninjas antes de que lleguen al castillo. Tienes 3 vidas.": "Click (or tap) the ninjas before they reach the castle. You have 3 lives.",
  "Stick Drill: esquiva el taladro que rebota por las paredes; pierde el que caiga primero.": "Stick Drill: dodge the drill bouncing off the walls; whoever falls first loses.",
  "Contra el bot o a 2 jugadores. Jugador 1: W A S D. Jugador 2: flechas. En el móvil se juega con los joysticks. Tu récord es el tiempo que aguantas.": "Against the bot or 2 players. Player 1: W A S D. Player 2: arrow keys. On mobile you play with the joysticks. Your record is how long you survive.",
  "Tronk Fight: duelo de stickmans con 7 luchadores, cada uno con su arma y su ataque especial.": "Tronk Fight: stickman duels with 7 fighters, each with their own weapon and special attack.",
  "Contra el bot (3 dificultades) o a 2 jugadores en el mismo teclado o móvil. Jugador 1: W A S D para moverse y J K L I para atacar. Jugador 2: flechas y , . - y Mayús derecha.": "Against the bot (3 difficulties) or 2 players on the same keyboard or phone. Player 1: W A S D to move and J K L I to attack. Player 2: arrow keys and , . - and right Shift.",
  "Con la sesión iniciada, pulsa «Cuenta» y luego «Mi perfil».": "While signed in, press “Account” and then “My profile”.",
  "Ahí puedes elegir tu avatar dibujado, cambiar tu nombre y escribir una biografía. También salen tus insignias, tus récords y tu lista de deseados.": "There you can pick your drawn avatar, change your name and write a bio. Your badges, records and wishlist are shown there too.",
  "Las insignias se consiguen haciendo cosas: proponer ideas, votar, guardar récords, ganar combates en Tronk Fight… Solo se ven las que ya tienes, y cuando consigues una nueva te avisamos.": "You earn badges by doing things: suggesting ideas, voting, saving records, winning Tronk Fight battles… Only the ones you have are shown, and we let you know when you get a new one.",
  "Abrir mi cuenta": "Open my account",
  "Los retos de la comunidad están en Minijuegos. Por ejemplo: «entre todos, derrotad 10.000 ninjas esta semana».": "Community challenges are in Minigames. For example: “together, defeat 10,000 ninjas this week”.",
  "Cada partida que juegas con la sesión iniciada suma a la barra. Ahí ves cuánto falta, cuánto has aportado tú y el tiempo que queda. Si se supera, todos los que han ayudado reciben un aviso.": "Every game you play while signed in adds to the bar. There you can see how much is left, how much you've contributed and the time remaining. If it's completed, everyone who helped gets a notification.",
  "Ir a Minijuegos": "Go to Minigames",
  "Abre la ficha de un juego (pulsando su tarjeta) y pulsa «Lista de deseados». Si además pulsas «Avisarme cuando salga», recibirás un aviso cuando se publique o si cambia su fecha.": "Open a game's page (by pressing its card) and press “Wishlist”. If you also press “Notify me when it's out”, you'll get a notification when it's released or if its date changes.",
  "Tu lista de deseados sale en tu perfil. Hace falta haber iniciado sesión.": "Your wishlist is shown on your profile. You need to be signed in.",
  "Ver los juegos": "See the games",
  "La campana de arriba te avisa cuando votan tu idea, cuando el equipo le cambia el estado o te responde, cuando alguien te supera un récord, cuando cambia la fecha de un juego de tu lista y cuando el equipo envía un aviso.": "The bell at the top lets you know when your idea gets votes, when the team changes its status or replies, when someone beats your record, when a game on your wishlist changes date and when the team sends an announcement.",
  "El número rojo son las que no has leído. Al abrir la campana se marcan como leídas.": "The red number shows the unread ones. Opening the bell marks them as read.",
  "Puedes instalar la web como una app con el botón «Instalar app» de la portada.": "You can install the website as an app with the “Install app” button on the home page.",
  "En iPhone: abre la web en Safari, pulsa Compartir y luego «Añadir a pantalla de inicio». Instalada, los minijuegos funcionan incluso sin internet.": "On iPhone: open the website in Safari, press Share and then “Add to Home Screen”. Once installed, the minigames work even without internet.",
  "Arriba a la derecha tienes los botones de tema (claro u oscuro), sonidos de la web (el altavoz) e idioma (ES / EN).": "At the top right you have the theme (light or dark), website sounds (the speaker) and language (ES / EN) buttons.",
  "En el ordenador también hay atajos de teclado: pulsa «?» para ver la lista. Por ejemplo, M te lleva a Minijuegos y S a Comunidad.": "On computers there are also keyboard shortcuts: press “?” to see the list. For example, M takes you to Minigames and S to Community.",
  "¡Nos encantaría! Buscamos gente para arte, música y sonido, programación y pruebas.": "We'd love that! We're looking for people for art, music and sound, programming and testing.",
  "Al final de «Sobre nosotros» está «Trabaja con nosotros»: elige lo tuyo y cuéntanos quién eres y qué sabes hacer. Si tienes un portfolio o vídeos, añade el enlace.": "At the end of “About us” there's “Work with us”: pick what you do and tell us who you are and what you can do. If you have a portfolio or videos, add the link.",
  "Ver «Trabaja con nosotros»": "See “Work with us”",
  "TronkStudios es un estudio independiente de videojuegos: un equipo pequeño que diseña, programa y publica sus propios juegos.": "TronkStudios is an independent video game studio: a small team that designs, programs and publishes its own games.",
  "Hacemos juegos de todo tipo, desde modo historia hasta juegos sencillos para pasar un rato, y muchas ideas salen de las sugerencias de la comunidad.": "We make all kinds of games, from story mode to simple games to pass the time, and many ideas come from community suggestions.",
  "Queremos crear juegos que hagan disfrutar a la gente, una comunidad sana y cumplir lo que prometemos.": "We want to make games people enjoy, build a healthy community and keep our promises.",
  "Ver «Sobre nosotros»": "See “About us”",
  "¡Hola! ¿En qué te puedo ayudar? Puedes escribirme tu duda o elegir una opción.": "Hi! How can I help you? You can type your question or pick an option.",
  "Tengo un problema": "I have a problem",
  "Tengo una duda sobre la web o los juegos": "I have a question about the website or the games",
  "Soy Tronker, el asistente de TronkStudios.": "I'm Tronker, the TronkStudios assistant.",
  "Te ayudo con la web, los juegos, los minijuegos y tu cuenta. Si algo necesita a una persona, te paso con el equipo.": "I help with the website, the games, the minigames and your account. If something needs a person, I'll put you in touch with the team.",
  "Tengo una duda": "I have a question",
  "¡De nada! ¿Puedo ayudarte con algo más?": "You're welcome! Can I help you with anything else?",
  "No estoy seguro de haberte entendido. Prueba a decirlo con otras palabras o elige una de estas opciones:": "I'm not sure I understood you. Try saying it in other words or pick one of these options:",
  "En línea · Respuestas rápidas": "Online · Quick answers",
  "Escribe tu pregunta...": "Type your question...",
  "Escribe tu pregunta para Tronker": "Type your question for Tronker",
  "Enviar pregunta": "Send question",
  "Escribe tu pregunta o elige una opción. La conversación no se guarda.": "Type your question or pick an option. The conversation is not saved.",
  "En línea · Responde con IA": "Online · Answers with AI",
  "Pregúntame lo que quieras sobre la web, los juegos o tu cuenta, o elige una opción.": "Ask me anything about the website, the games or your account, or pick an option.",
  "Vas muy rápido. Espera un minuto y vuelve a preguntarme.": "You're going too fast. Wait a minute and ask me again.",
  "Ahora mismo no puedo pensar respuestas. Elige una de estas opciones o escribe al equipo.": "I can't come up with answers right now. Pick one of these options or write to the team.",
  "No he sabido qué responder. ¿Puedes preguntarlo de otra forma?": "I didn't know what to answer. Can you ask it another way?",
  "Enviar un correo al equipo": "Email the team",

  /* ---------- Retos, atajos, sonidos y Trabaja con nosotros ---------- */
  "Retos de la comunidad": "Community challenges",
  "Cada partida suma. ¡Entre todos podemos!": "Every game counts. Together we can do it!",
  "Jugar": "Play",
  "¡Superado!": "Completed!",
  "Superado": "Completed",
  "No se consiguió": "Not reached",
  "Terminado": "Ended",
  "Inicia sesión para que tus partidas cuenten.": "Sign in so your games count.",
  "Juega una partida para ayudar.": "Play a game to help.",
  "Queda menos de 1 hora": "Less than 1 hour left",
  "Retos": "Challenges",
  "Nuevo reto": "New challenge",
  "Ej.: Entre todos, derrotad 10.000 ninjas esta semana": "E.g.: Together, defeat 10,000 ninjas this week",
  "Título del reto": "Challenge title",
  "Minijuego": "Minigame",
  "Objetivo": "Goal",
  "Duración (días)": "Duration (days)",
  "Crear reto": "Create challenge",
  "Reto creado. Ya sale en Minijuegos.": "Challenge created. It now shows in Minigames.",
  "Todavía no hay retos.": "No challenges yet.",
  "¿Eliminar este reto y todo su progreso?": "Delete this challenge and all its progress?",
  "Reto eliminado.": "Challenge deleted.",
  "Revisa el título, el objetivo y la duración (1 a 60 días).": "Check the title, goal and duration (1 to 60 days).",
  "Ejecuta docs/supabase/retos.sql en Supabase para usar los retos.": "Run docs/supabase/retos.sql in Supabase to use challenges.",
  "Antitronks (Antitronks derribados)": "Antitronks (Antitronks taken down)",
  "Protect Mogos (ninjas derrotados)": "Protect Mogos (ninjas defeated)",
  "Stick Drill (segundos aguantados)": "Stick Drill (seconds survived)",
  "Tronk Fight (victorias)": "Tronk Fight (wins)",
  "Sonidos de la web": "Website sounds",
  "Sonidos de la web: activados": "Website sounds: on",
  "Sonidos de la web: desactivados": "Website sounds: off",
  "Atajos de teclado": "Keyboard shortcuts",
  "Atajos de teclado (?)": "Keyboard shortcuts (?)",
  "Nuestros juegos": "Our games",
  "Sugerencias y comunidad": "Suggestions and community",
  "Volver al inicio": "Back to top",
  "Cambiar tema claro / oscuro": "Switch light / dark theme",
  "Ver estos atajos": "Show these shortcuts",
  "Salir de pantalla completa": "Exit full screen",
  "Trabaja con nosotros": "Work with us",
  "¿Dibujas, haces música, programas o te encanta probar juegos? Buscamos gente con ganas de crear juegos con nosotros. Elige lo tuyo y escríbenos.": "Do you draw, make music, code or love testing games? We're looking for people who want to make games with us. Pick what you do and write to us.",
  "Arte": "Art",
  "Personajes, escenarios, iconos y animaciones.": "Characters, scenery, icons and animations.",
  "Música y sonido": "Music and sound",
  "Bandas sonoras y efectos para los juegos.": "Soundtracks and sound effects for the games.",
  "Programación": "Programming",
  "Roblox (Luau), juegos web y herramientas.": "Roblox (Luau), web games and tools.",
  "Pruebas": "Testing",
  "Jugar antes que nadie y contarnos los fallos.": "Play before anyone else and tell us about bugs.",
  "Trabajar con nosotros": "Work with us",
  "Cuéntanos quién eres, qué sabes hacer y, si tienes, un enlace a tus trabajos (portfolio, YouTube, GitHub...).": "Tell us who you are, what you can do and, if you have one, a link to your work (portfolio, YouTube, GitHub...).",
};

/* =========================================================
   REGLAS PARA TEXTOS CON NÚMEROS O NOMBRES
   [expresión regular, función que devuelve el texto en inglés]
   ========================================================= */

const MONTHS_EN = {
  ene: "Jan", feb: "Feb", mar: "Mar", abr: "Apr", may: "May", jun: "Jun",
  jul: "Jul", ago: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dic: "Dec",

};

const plural = (n, one, many) => (Number(n) === 1 ? one : many);

const CHALLENGE_UNITS_EN = {
  "Antitronks derribados": "Antitronks taken down",
  "Antitronk derribado": "Antitronk taken down",
  "ninjas derrotados": "ninjas defeated",
  "ninja derrotado": "ninja defeated",
  "segundos aguantados": "seconds survived",
  "segundo aguantado": "second survived",
  "victorias": "wins",
  "victoria": "win",
  "aciertos": "correct answers",
  "acierto": "correct answer"
};

const DUEL_UNITS_EN = { puntos: "points", segundos: "seconds", aciertos: "correct answers" };

const I18N_PATTERNS = [
  [/^ACIERTOS: (\d+)$/, (_, n) => `CORRECT: ${n}`],
  [/^Botón (\d)$/, (_, n) => `Button ${n}`],
  [/^Reto de (.+): supera ([\d.]+) (puntos|segundos|aciertos)$/, (_, w, n, u) => `${w === "Tu amigo" ? "Your friend" : w}'s challenge: beat ${n} ${DUEL_UNITS_EN[u]}`],
  [/^¡Reto superado! Has ganado a (.+)$/, (_, w) => `Challenge complete! You beat ${w === "Tu amigo" ? "your friend" : w}`],
  [/^Te faltan ([\d.]+) (puntos|segundos|aciertos) para superar a (.+)$/, (_, n, u, w) => `${n} ${DUEL_UNITS_EN[u]} to go to beat ${w === "Tu amigo" ? "your friend" : w}`],
  [/^(.+) te reta en (.+)$/, (_, w, g) => `${w === "Un amigo" ? "A friend" : w} challenges you in ${g}`],
  [/^Supera sus ([\d.]+) (puntos|segundos|aciertos)$/, (_, n, u) => `Beat their ${n} ${DUEL_UNITS_EN[u]}`],
  [/^(\d+) días? seguidos$/, (_, n) => `${n}-day streak`],
  [/^¡Racha de (\d+) días seguidos!$/, (_, n) => `${n}-day streak!`],
  [/^Mejor racha: (\d+) días?$/, (_, n) => `Best streak: ${n} ${plural(n, "day", "days")}`],
  [/^(\d+) comentarios?$/, (_, n) => `${n} ${plural(n, "comment", "comments")}`],
  [/^(.+) ha comentado tu idea: «([\s\S]*)»$/, (_, who, text) => `${who} commented on your idea: “${text}”`],
  [/^Clasificación · (.+)$/, (_, g) => `Leaderboard · ${g}`],
  [/^(\d+) jugadores con récord$/, (_, n) => `${n} players with a record`],
  [/^1 jugador con récord$/, () => "1 player with a record"],
  [/^(\d+) sugerencias$/, (_, n) => `${n} suggestions`],
  [/^Ver el reto: (.+)$/, (_, x) => `See the challenge: ${x}`],
  [/^Jugar a (.+)$/, (_, x) => `Play ${x}`],
  [/^Y (\d+) personas? más ayudando$/, (_, n) => `And ${n} more ${plural(n, "person", "people")} helping`],
  [/^(.+) · faltan ([\d.,]+)$/, (_, a, n) => `${t(a)} · ${n} to go`],
  [/^RACHA ×(\d+)$/, (_, n) => `STREAK ×${n}`],
  [/^¡(\d+) segundos!$/, (_, n) => `${n} seconds!`],
  [/^¡Gana el jugador (\d)!$/, (_, n) => `Player ${n} wins!`],
  [/^Sale el (.+) \(fecha prevista, puede cambiar\)\. Si lo añades a tu lista de deseados y pulsas «Avisarme», te avisaremos cuando salga\.$/,
    (_, d) => `It comes out on ${t(d)} (planned date, it may change). If you add it to your wishlist and press “Notify me”, we'll let you know when it's out.`],
  [/^Quedan (\d+) días$/, (_, n) => `${n} days left`],
  [/^Quedan (\d+) horas?$/, (_, n) => `${n} ${plural(n, "hour", "hours")} left`],
  [/^(Antitronks derribados|Antitronk derribado|ninjas derrotados|ninja derrotado|segundos aguantados|segundo aguantado|victorias|victoria|aciertos|acierto) · (\d+)%$/,
    (_, u, n) => `${CHALLENGE_UNITS_EN[u]} · ${n}%`],
  [/^Tu aporte: ([\d.,]+) (.+)$/, (_, n, u) => `Your contribution: ${n} ${CHALLENGE_UNITS_EN[u] || u}`],
  [/^Ayudaste con ([\d.,]+) (.+)\. ¡Gracias!$/, (_, n, u) => `You helped with ${n} ${CHALLENGE_UNITS_EN[u] || u}. Thanks!`],
  [/^¡Nueva insignia: (.+)!$/, (_, b) => `New badge: ${I18N_EN[b] || b}!`],
  [/^Quiero ayudar: (.+)$/, (_, r) => `I want to help: ${I18N_EN[r] || r}`],
  [/^(.+) · (Quedan \d+ días|Quedan \d+ horas?|Queda menos de 1 hora|Superado|Terminado) · (.+)$/,
    (_, g, st, n) => `${g} · ${t(st)} · ${n}`],
  [/^(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) (\d{4})$/,
    (_, d, m, y) => `${MONTHS_EN[m]} ${d}, ${y}`],
  [/^¡Faltan (\d+) días!$/, (_, n) => `${n} days to go!`],
  [/^(\d+) personas?$/, (_, n) => `${n} ${plural(n, "person", "people")}`],
  [/^(\d+) personas? lo tienen? en su lista de deseados$/,
    (_, n) => `${n} ${plural(n, "person has", "people have")} it on their wishlist`],
  [/^(\d+) (idea|ideas) ·$/, (_, n) => `${n} ${plural(n, "idea", "ideas")} ·`],
  [/^(\d+) votos?$/, (_, n) => `${n} ${plural(n, "vote", "votes")}`],
  [/^(\d+) votos?( · Puedes cambiar tu voto)?$/,
    (_, n, change) => `${n} ${plural(n, "vote", "votes")}${change ? " · You can change your vote" : ""}`],
  [/^hace (\d+) min$/, (_, n) => `${n} min ago`],
  [/^hace (\d+) h$/, (_, n) => `${n} h ago`],
  [/^hace (\d+) días?$/, (_, n) => `${n} ${plural(n, "day", "days")} ago`],
  [/^(.+) · ([\d.,]+\s?[KMB]?) visualizaci(ón|ones)$/,
    (_, date, n, form) => `${date} · ${n} ${form === "ón" ? "view" : "views"}`],
  [/^Notificaciones: (\d+) sin leer$/, (_, n) => `Notifications: ${n} unread`],
  [/^Miembro desde (.+)$/, (_, date) => `Member since ${date}`],
  [/^Crear la cuenta en (\d+)$/, (_, y) => `Create your account in ${y}`],
  [/^Puesto (\d+)$/, (_, n) => `Position ${n}`],
  [/^¡(.+) ya ha salido!$/, (_, game) => `${game} is out now!`],
  [/^Tráiler de (.+)$/, (_, game) => `${game} trailer`],
  // «Ver …» solo si lo de después también tiene traducción
  [/^Ver (.+)$/, (_, what) => (t(what) !== what ? `View ${t(what)}` : undefined)],
  [/^(.+) \(se abre en otra pestaña\)$/, (_, what) => `${what} (opens in a new tab)`],
  [/^Tu idea ha llegado a (\d+) votos?$/, (_, n) => `Your idea has reached ${n} ${plural(n, "vote", "votes")}`],
  [/^(.+) ha superado tu récord en (.+)$/, (_, who, game) => `${who} beat your record in ${game}`],
  [/^(.+) sale el (\d{2})\/(\d{2})\/(\d{4})$/, (_, game, d, m, y) => `${game} comes out on ${m}/${d}/${y}`],
  [/^(.+) ya no tiene fecha de lanzamiento por ahora$/, (_, game) => `${game} no longer has a release date for now`],
  [/^(\d+(?:\.\d)?) (puntos|victorias|s)$/, (_, n, unit) => `${n} ${t(unit)}`],
  // Antitronks
  [/^PUNTOS: (\d+)$/, (_, n) => `SCORE: ${n}`],
  [/^VIDAS: (\d+)$/, (_, n) => `LIVES: ${n}`],
  [/^RÉCORD: (.+)$/, (_, n) => `RECORD: ${n}`],
  [/^Has conseguido (\d+) puntos?\. ¡Es tu mejor marca!$/, (_, n) => `You scored ${n} ${plural(n, "point", "points")}. That's your best ever!`],
  [/^Has conseguido (\d+) puntos?\. Tu récord es (\d+)\.$/, (_, n, r) => `You scored ${n} ${plural(n, "point", "points")}. Your record is ${r}.`],
  [/^(.+) Tu récord: (\d+) puntos\.$/, (_, intro, r) => `${t(intro)} Your record: ${r} points.`],
  [/^\+(\d+)$/, (_, n) => `+${n}`],
  // Stick Drill
  [/^TIEMPO: (.+)$/, (_, v) => `TIME: ${v}`],
  [/^(J1|J2): (.+) · (J2|BOT): (.+)\. Récord: (.+)\.$/,
    (_, a, ta, b, tb, r) => `${a.replace("J", "P")}: ${ta} · ${b.replace("J", "P")}: ${tb}. Record: ${r}.`],
  [/^(J1|J2|BOT): (VIVO|.+)$/, (_, who, v) => `${who.replace("J", "P")}: ${v === "VIVO" ? "ALIVE" : v}`],
  [/^(.+) Récord: (.+)\.$/, (_, intro, r) => `${t(intro)} Record: ${r}.`],
  [/^¡(JUGADOR 1|JUGADOR 2) GANA! Sigue aguantando para el récord$/, (_, p) => `${t(p)} WINS! Keep going for the record`],
  [/^¡GANA EL JUGADOR (\d)!$/, (_, n) => `PLAYER ${n} WINS!`],
  [/^(.+) ¡NUEVO RÉCORD!$/, (_, title) => `${t(title)} NEW RECORD!`],
  // Tronk Fight
  [/^Ronda (\d+)$/, (_, n) => `Round ${n}`],
  [/^Elegir a (.+)$/, (_, who) => `Choose ${who}`],
  [/^Luchar contra (.+)$/, (_, who) => `Fight ${who}`],
  [/^(.+) contra (.+)$/, (_, a, b) => `${a} vs ${b}`],
  [/^¡Gana (.+)! \(Jugador (\d)\)$/, (_, who, n) => `${who} wins! (Player ${n})`],
  [/^¡Gana (.+)!$/, (_, who) => `${who} wins!`],
  [/^Gana (.+)$/, (_, who) => `${who} wins`],
  [/^(\d+) golpes$/, (_, n) => `${n} hits`],
  [/^Arma: (.+)\.$/, (_, w) => `Weapon: ${t(w)}.`],
  // Soporte
  [/^(Nombre|Asunto|Descripción): entre (\d+) y (\d+) caracteres\.$/,
    (_, label, min, max) => `${t(label)}: between ${min} and ${max} characters.`],
  [/^Podrás enviar otro mensaje dentro de (\d+) segundos\.$/, (_, n) => `You can send another message in ${n} seconds.`],
  [/^Hemos recibido tu mensaje\. Te hemos enviado un correo de confirmación a (.+) y te responderemos allí lo antes posible\.$/,
    (_, email) => `We've received your message. We've sent a confirmation email to ${email} and will reply there as soon as possible.`],
  [/^Hemos recibido tu mensaje\. Te responderemos a (.+) lo antes posible\.$/,
    (_, email) => `We've received your message. We'll reply to ${email} as soon as possible.`],
  [/^Si no se ha abierto nada, escríbenos directamente a (.+)\.$/,
    (_, email) => `If nothing opened, write to us directly at ${email}.`]
];

/* =========================================================
   TRADUCTOR
   ========================================================= */

function translateKey(key) {
  if (Object.prototype.hasOwnProperty.call(I18N_EN, key)) {
    return I18N_EN[key];
  }

  for (const [pattern, build] of I18N_PATTERNS) {
    const match = key.match(pattern);
    const result = match ? build(...match) : undefined;

    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}

/* Devuelve el texto en el idioma actual (si no hay traducción, igual) */
function t(text) {
  if (LANG !== "en" || typeof text !== "string" || !text.trim()) {
    return text;
  }

  const key = text.replace(/\s+/g, " ").trim();
  let out = translateKey(key);

  // Textos de varias líneas (chat de soporte): línea a línea
  if (out === undefined && text.includes("\n")) {
    const lines = text.split("\n").map((line) => (line.trim() ? t(line) : line));
    const joined = lines.join("\n");
    return joined === text ? text : joined;
  }

  if (out === undefined) {
    return text;
  }

  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  return lead + out + trail;
}

/* =========================================================
   TRADUCIR LA PÁGINA
   ========================================================= */

const I18N_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"];

// Dentro de estos no se traduce (código o lo que escriben los usuarios)
const I18N_SKIP = "script, style, textarea, [data-no-translate]";

function translateElementAttributes(element) {
  if (element.closest("[data-no-translate]")) {
    return;
  }

  // Imágenes con versión en inglés (por ejemplo, la miniatura de un juego)
  const englishSrc = element.getAttribute("data-src-en");

  if (englishSrc && element.getAttribute("src") !== englishSrc) {
    element.setAttribute("src", englishSrc);
  }

  I18N_ATTRIBUTES.forEach((name) => {
    const value = element.getAttribute(name);

    if (value) {
      const translated = t(value);

      if (translated !== value) {
        element.setAttribute(name, translated);
      }
    }
  });
}

function translateTextNode(node) {
  const parent = node.parentElement;

  if (!parent || parent.closest(I18N_SKIP)) {
    return;
  }

  const translated = t(node.nodeValue);

  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(I18N_SKIP)) {
    return;
  }

  translateElementAttributes(root);
  root.querySelectorAll("*").forEach(translateElementAttributes);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    translateTextNode(node);
  }
}

function initializeI18n() {
  document.documentElement.lang = LANG;

  // Botón ES / EN de la cabecera
  const toggle = document.getElementById("lang-toggle");

  if (toggle) {
    toggle.dataset.noTranslate = "";
    toggle.querySelector(".lang-label").textContent = LANG === "en" ? "ES" : "EN";
    toggle.setAttribute(
      "aria-label",
      LANG === "en" ? "Ver la web en español" : "View the website in English"
    );
    toggle.title = toggle.getAttribute("aria-label");
    toggle.addEventListener("click", () => setLanguage(LANG === "en" ? "es" : "en"));
  }

  if (LANG !== "en") {
    return;
  }

  document.title = t(document.title);
  translateTree(document.body);

  // Lo que se añade o cambia después también se traduce
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        translateTextNode(mutation.target);
      } else if (mutation.type === "attributes") {
        translateElementAttributes(mutation.target);
      } else {
        mutation.addedNodes.forEach(translateTree);
      }
    });
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: I18N_ATTRIBUTES
  });

  // Textos dibujados en los minijuegos y ventanas del navegador
  ["fillText", "strokeText"].forEach((method) => {
    const original = CanvasRenderingContext2D.prototype[method];

    CanvasRenderingContext2D.prototype[method] = function (text, ...rest) {
      return original.call(this, typeof text === "string" ? t(text) : text, ...rest);
    };
  });

  const originalConfirm = window.confirm.bind(window);
  window.confirm = (message) => originalConfirm(t(String(message)));
}

initializeI18n();
