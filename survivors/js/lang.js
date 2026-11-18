"use strict";

/* TronkStudios · survivors/js/lang.js
   Tronk Survivors en inglés. Usa el mismo idioma que la web
   (localStorage «tronk-lang») y se puede cambiar en Ajustes.
   - L("texto en español") → el texto en el idioma elegido.
   - LT("plantilla", { valores }) → frases con datos.
   - translatePage() traduce los textos fijos del HTML.
   Scripts clásicos (ver docs/adr/0002). */

const LANG_KEY = "tronk-lang";

let LANG = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // sin almacenamiento: idioma del navegador
  }
  return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
})();

const EN = {
  "Toca una pieza para ver sus detalles": "Tap an item to see its details",
  "Rango máximo": "Maximum rank",
  "Por rango": "Per rank",
  "No quedan mejoras distintas para cambiar.": "There are no different upgrades left to reroll.",
  // Menú y pantallas
  "Cargando": "Loading",
  "Mover": "Move",
  "Introduce un código de 5 caracteres.": "Enter a 5-character room code.",
  "Mover personaje": "Move character",
  "Dibujando personajes…": "Drawing characters…",
  "Preparando la partida…": "Getting the run ready…",
  "Jugar": "Play",
  "Reto diario": "Daily challenge",
  "Jugar con amigos": "Play with friends",
  "Personajes": "Characters",
  "Cofre Tronk": "Tronk Chest",
  "Mejoras": "Upgrades",
  "Logros": "Achievements",
  "Ajustes": "Settings",
  "← TronkStudios": "← TronkStudios",
  "← Volver": "← Back",
  "¡Gratis!": "Free!",
  "¡Nuevo!": "New!",
  "16 personajes": "16 characters",
  "16 armas": "16 weapons",
  "7 jefes": "7 bosses",
  "Online": "Online",
  "Cambiar personaje": "Change character",
  "Elige el mapa": "Choose the map",
  "Hoy todos juegan con el mismo personaje, en el mismo mapa y con las mismas reglas. ¡A ver quién llega más lejos! El primer reto de cada día da 100 monedas.": "Today everyone plays with the same character, on the same map and with the same rules. Let's see who gets furthest! The first challenge each day gives 100 coins.",
  "Jugar el reto de hoy": "Play today's challenge",
  "Clasificación de hoy": "Today's leaderboard",
  "Música": "Music",
  "Efectos de sonido": "Sound effects",
  "Idioma": "Language",
  "Números de daño": "Damage numbers",
  "Temblor de pantalla": "Screen shake",
  "Se paga con las monedas que ganas jugando. Nada de dinero real.": "Paid with the coins you earn playing. No real money.",
  "Probabilidades": "Odds",
  "Los personajes repetidos suben de estrella (+5 % de daño y vida cada una, hasta 5). Con 5 estrellas, se cambian por monedas.": "Duplicate characters gain a star (+5% damage and health each, up to 5). At 5 stars, they turn into coins.",
  "¡Genial!": "Awesome!",
  "Se quedan para siempre en todas las partidas.": "They stay forever in every run.",
  "Elige una mejora": "Choose an upgrade",
  "Esperando a los demás…": "Waiting for the others…",
  "Pausa": "Paused",
  "Seguir": "Resume",
  "Terminar partida": "End run",
  "Otra vez": "Again",
  "Menú": "Menu",
  "¡VICTORIA!": "VICTORY!",
  "¡Has caído!": "You fell!",
  "Tiempo": "Time",
  "Nivel": "Level",
  "Enemigos": "Enemies",
  "Jefes": "Bosses",
  "Monedas ganadas": "Coins earned",
  "Puntos": "Points",
  "WASD o flechas para moverte · los ataques son automáticos · Esc pausa": "WASD or arrows to move · attacks are automatic · Esc to pause",
  "¡A jugar!": "Let's play!",
  "Elegir": "Choose",
  "Ir al cofre": "Go to the chest",
  "Personaje sin conseguir": "Character not unlocked",
  "Consíguelo en el Cofre Tronk con las monedas que ganas jugando.": "Get it from the Tronk Chest with the coins you earn playing.",
  "Al máximo": "Maxed",
  "¡NUEVO!": "NEW!",
  "Bocadillo": "Sandwich",
  "Recupera 40 de vida": "Restores 40 health",
  "Bolsa de monedas": "Bag of coins",
  "+25 monedas": "+25 coins",
  "¡Que vienen!": "Here they come!",
  "¡JEFE!": "BOSS!",
  "¡Cofre! +40 monedas": "Chest! +40 coins",
  "¡Imán! Todas las gemas vienen a ti": "Magnet! All gems fly to you",
  "¡Has caído! Un compañero puede levantarte si se queda a tu lado.": "You fell! A teammate can revive you by standing next to you.",
  "¡El Maestro Ninja llama a su clan!": "The Ninja Master calls his clan!",
  "¡Esquivado!": "Dodged!",
  "Aguanta 25 minutos y derrota al jefe final.": "Survive 25 minutes and defeat the final boss.",
  "Bloqueado": "Locked",
  "Todavía no hay nadie. ¡Sé el primero!": "Nobody yet. Be the first!",
  "Inicia sesión en TronkStudios para salir en la clasificación.": "Log in to TronkStudios to appear on the leaderboard.",
  "¡Evolución disponible! Coge un cofre": "Evolution ready! Grab a chest",
  "Ventaja": "Perk",
  "Reglas de hoy": "Today's rules",
  "Rareza": "Rarity",
  "Bosque": "Forest",
  // Rarezas
  "Común": "Common",
  "Raro": "Rare",
  "Épico": "Epic",
  "Legendario": "Legendary",
  "de Tronk Fight": "from Tronk Fight",
  // Ventajas
  "+10 % de velocidad": "+10% speed",
  "+10 % de área": "+10% area",
  "+20 % de vida": "+20% health",
  "+25 % de imán": "+25% magnet",
  "+1 de armadura": "+1 armor",
  "+30 % de vida, −8 % de velocidad": "+30% health, −8% speed",
  "+10 % de daño": "+10% damage",
  "Recupera vida poco a poco": "Slowly regenerates health",
  "Ataca un 10 % más a menudo": "Attacks 10% more often",
  "+12 % de daño": "+12% damage",
  "+20 % de velocidad": "+20% speed",
  "+20 % de experiencia": "+20% experience",
  "+20 % de daño, +10 % de vida": "+20% damage, +10% health",
  "+15 % de daño, ataca un 8 % más a menudo": "+15% damage, attacks 8% more often",
  "+1 proyectil en todas las armas": "+1 projectile on every weapon",
  "+25 % de monedas, +10 % de área": "+25% coins, +10% area",
  // Descripciones de personajes
  "El de siempre. Rápido y con su espada, el primero en apuntarse a cualquier lío.": "The usual guy. Fast, sword in hand, first to jump into any mess.",
  "Lleva la gorra al revés y los bolsillos llenos de petardos. No le dejéis cerca de un mechero.": "Backwards cap and pockets full of firecrackers. Keep him away from lighters.",
  "Su colonia es tan fuerte que los zombis se mueren otra vez. Ella dice que huele a fresa.": "Her perfume is so strong zombies die all over again. She says it smells like strawberry.",
  "El 10 del recreo. Sus balones rebotan de cabeza en cabeza y nunca pierde ninguno.": "The playground's number 10. His balls bounce from head to head and he never loses one.",
  "Melena, barba, ballesta y cero prisa. Apunta solo, dispara solo y casi nunca falla.": "Long hair, beard, crossbow and zero hurry. Aims by himself, shoots by himself, rarely misses.",
  "Lento pero imparable. Cada mazazo hace temblar el suelo y a los zombis de alrededor.": "Slow but unstoppable. Every hammer blow shakes the ground and every zombie around.",
  "Lanza el hacha, la hacha vuelve. A veces le da en la cabeza, pero eso no lo cuenta.": "He throws the axe, the axe comes back. Sometimes it hits his head, but he won't tell.",
  "Siempre tiene frío, incluso en agosto. Congela todo lo que se le acerca.": "Always cold, even in August. Freezes everything that comes close.",
  "Lo calcula todo antes de atacar. Su lanza llega más lejos que nadie.": "Calculates everything before attacking. His spear reaches further than anyone's.",
  "Se quitó la guadaña y se puso los guantes. Sus combos de puñetazos mandan a los zombis a volar.": "He dropped the scythe and put on gloves. His punch combos send zombies flying.",
  "Expulsado del clan ninja por llegar tarde. Ahora lucha contra ellos, y tira kunais a toda velocidad.": "Kicked out of the ninja clan for being late. Now he fights them, throwing kunais at full speed.",
  "Mira las estrellas y las estrellas le hacen caso: llueven meteoritos donde ella señala.": "She looks at the stars and the stars listen: meteors rain wherever she points.",
  "No necesita armas ni camiseta. Cada puñetazo suelta una onda que tumba filas enteras de zombis.": "Needs no weapons and no shirt. Every punch sends a shockwave that knocks down whole rows of zombies.",
  "El rey de la melena. Su tridente lanza rayos que saltan de enemigo en enemigo.": "King of the mane. His trident shoots lightning that jumps from enemy to enemy.",
  "Viene del año 3026 con un dron láser. Dice que en el futuro los zombis son peores.": "Came from the year 3026 with a laser drone. Says zombies are worse in the future.",
  "Llegó del desierto montada en un tornado. Con su báculo del viento, ahora los tornados la siguen a ella.": "She came from the desert riding a tornado. With her wind staff, now tornadoes follow her.",
  // Armas
  "Espada": "Sword",
  "Ballesta": "Crossbow",
  "Mazo": "Hammer",
  "Lanza": "Spear",
  "Guantes de boxeo": "Boxing gloves",
  "Puñetazos": "Punches",
  "Hacha": "Axe",
  "Tridente": "Trident",
  "Petardos": "Firecrackers",
  "Colonia": "Perfume",
  "Balón": "Ball",
  "Copos": "Snowflakes",
  "Kunais": "Kunais",
  "Meteoritos": "Meteors",
  "Dron láser": "Laser drone",
  "Tornado": "Tornado",
  "Un tajo hacia donde miras. Desde el nivel 3, también por detrás.": "A slash where you're facing. From level 3, behind you too.",
  "Dispara virotes al enemigo más cercano.": "Shoots bolts at the nearest enemy.",
  "Golpea el suelo: una onda empuja y daña a todos los de alrededor.": "Smashes the ground: a shockwave pushes and hurts everyone around.",
  "Una estocada larga que atraviesa a todos los de la línea.": "A long thrust that pierces everyone in line.",
  "Combos de puñetazos al enemigo más cercano. El último golpe empuja muy fuerte.": "Punch combos at the nearest enemy. The last hit knocks back hard.",
  "Puñetazos tan fuertes que sueltan una onda hacia delante que atraviesa a todos.": "Punches so strong they release a forward shockwave that pierces everyone.",
  "Lanza un hacha que va y vuelve atravesando a todos.": "Throws an axe that goes and comes back, piercing everyone.",
  "Un rayo que salta de un enemigo a otro.": "A lightning bolt that jumps from enemy to enemy.",
  "Lanza petardos que explotan entre los enemigos.": "Throws firecrackers that explode among enemies.",
  "Una nube apestosa a tu alrededor que daña y frena a los enemigos.": "A stinky cloud around you that hurts and slows enemies.",
  "Un balón que rebota de enemigo en enemigo.": "A ball that bounces from enemy to enemy.",
  "Copos de hielo en todas direcciones que congelan a los enemigos.": "Ice shards in every direction that freeze enemies.",
  "Kunais muy rápidos hacia donde te mueves.": "Very fast kunais where you're moving.",
  "Caen meteoritos del cielo sobre los enemigos.": "Meteors fall from the sky onto enemies.",
  "Un dron te sigue y dispara un láser que lo atraviesa todo.": "A drone follows you and fires a laser that pierces everything.",
  "Tornados que van de un lado a otro arrastrando a los enemigos.": "Tornadoes that wander around dragging enemies.",
  // Objetos
  "Corazón": "Heart",
  "Zapatillas": "Sneakers",
  "Imán": "Magnet",
  "Pesas": "Weights",
  "Reloj": "Clock",
  "Escudo": "Shield",
  "Tiritas": "Band-aids",
  "Lupa": "Magnifier",
  "Trébol": "Clover",
  "Libro": "Book",
  "Fotocopiadora": "Photocopier",
  "+20 % de vida máxima": "+20% max health",
  "+30 % de radio para recoger cosas": "+30% pickup radius",
  "Las armas se recargan un 8 % antes": "Weapons recharge 8% faster",
  "+1 de armadura (quita daño de cada golpe)": "+1 armor (reduces damage from each hit)",
  "Recupera 0,3 de vida por segundo": "Restores 0.3 health per second",
  "+10 % de área de las armas": "+10% weapon area",
  "+20 % de monedas": "+20% coins",
  "+10 % de experiencia": "+10% experience",
  // Tienda
  "Vida": "Health",
  "Fuerza": "Strength",
  "Velocidad": "Speed",
  "Armadura": "Armor",
  "Avaricia": "Greed",
  "Estudio": "Study",
  "Segunda vida": "Second life",
  "+8 % de vida en cada partida": "+8% health every run",
  "+5 % de daño": "+5% damage",
  "+4 % de velocidad": "+4% speed",
  "+10 % de radio para recoger": "+10% pickup radius",
  "+10 % de monedas": "+10% coins",
  "+6 % de experiencia": "+6% experience",
  "Revives una vez por partida con la mitad de vida": "Revive once per run with half health",
  // Enemigos
  "Zombi Gigante": "Giant Zombie",
  "Antitronk Supremo": "Supreme Antitronk",
  "Maestro Ninja": "Ninja Master",
  "El Rey Zombi": "The Zombie King",
  // Mapas
  "Bosque de los Tronks": "Tronk Forest",
  "Árboles, lagos y zombis. Para empezar.": "Trees, lakes and zombies. A good start.",
  "Cementerio Maldito": "Cursed Graveyard",
  "Niebla, tumbas, esqueletos y fantasmas.": "Fog, graves, skeletons and ghosts.",
  "Playa Tronk": "Tronk Beach",
  "Arena, mar y mocos al sol.": "Sand, sea and slimes in the sun.",
  "Ciudad de Noche": "Night City",
  "Calles, farolas y Antitronks por todas partes.": "Streets, lampposts and Antitronks everywhere.",
  "Aguanta 5 minutos en cualquier mapa": "Survive 5 minutes on any map",
  "Derrota a 2 jefes en total": "Defeat 2 bosses in total",
  "Derrota al Rey Zombi una vez": "Defeat the Zombie King once",
  // Reglas del reto diario
  "Turbo": "Turbo",
  "Los enemigos van un 35 % más rápido": "Enemies are 35% faster",
  "De cristal": "Glass cannon",
  "Mitad de vida, pero +60 % de daño": "Half health, but +60% damage",
  "Lluvia de oro": "Gold rain",
  "Monedas triples": "Triple coins",
  "Horda": "Horde",
  "Salen un 60 % más de enemigos (y más experiencia)": "60% more enemies (and more experience)",
  "Gigantes": "Giants",
  "Enemigos con +70 % de vida que dan +70 % de experiencia": "Enemies with +70% health that give +70% experience",
  "Jefes con prisa": "Bosses in a hurry",
  "Los jefes salen mucho antes": "Bosses show up much earlier",
  "Zapatillas nuevas": "New sneakers",
  "Vas un 30 % más rápido": "You're 30% faster",
  "Superimán": "Super magnet",
  "Recoges cosas desde el triple de lejos": "Pick things up from three times further",
  // Logros
  "Primera sangre": "First blood",
  "Derrota a tu primer enemigo": "Defeat your first enemy",
  "Esto empieza": "Here we go",
  "Derrota a 100 enemigos en una partida": "Defeat 100 enemies in one run",
  "Imparable": "Unstoppable",
  "Derrota a 1.000 enemigos en una partida": "Defeat 1,000 enemies in one run",
  "Superviviente": "Survivor",
  "Aguanta 5 minutos": "Survive 5 minutes",
  "Cazajefes": "Boss hunter",
  "Derrota a un jefe": "Defeat a boss",
  "Rey de reyes": "King of kings",
  "Derrota al Rey Zombi": "Defeat the Zombie King",
  "Muy preparado": "Well prepared",
  "Llega a nivel 30 en una partida": "Reach level 30 in one run",
  "Evolución": "Evolution",
  "Evoluciona un arma": "Evolve a weapon",
  "Manazas": "Butterfingers",
  "Rompe 50 objetos en total": "Break 50 objects in total",
  "Sin camiseta": "Shirtless",
  "Derrota al Rey Zombi con Sunk": "Defeat the Zombie King with Sunk",
  "Coleccionista": "Collector",
  "Consigue 5 personajes": "Get 5 characters",
  "Todos los Tronks": "All the Tronks",
  "Consigue los 16 personajes": "Get all 16 characters",
  "¡Legendario!": "Legendary!",
  "Consigue un personaje legendario": "Get a legendary character",
  "Cinco estrellas": "Five stars",
  "Sube un personaje a 5 estrellas": "Get a character to 5 stars",
  "Cada día": "Every day",
  "Juega un reto diario": "Play a daily challenge",
  "Mejor con amigos": "Better with friends",
  "Juega una partida con amigos": "Play a run with friends",
  "Explorador": "Explorer",
  "Desbloquea los 4 mapas": "Unlock all 4 maps",
  "Forrado": "Loaded",
  "Junta 5.000 monedas a la vez": "Hold 5,000 coins at once",
  // Evoluciones
  "Barridos dorados enormes en todas direcciones.": "Huge golden sweeps in every direction.",
  "Ballesta Tormenta": "Storm Crossbow",
  "Una lluvia de virotes que no para.": "A never-ending rain of bolts.",
  "Martillo Sísmico": "Seismic Hammer",
  "Terremotos gigantes que lo tumban todo.": "Giant earthquakes that knock everything down.",
  "Lanza Celestial": "Celestial Spear",
  "Estocadas larguísimas en abanico.": "Very long thrusts in a fan.",
  "Guantes del Campeón": "Champion's Gloves",
  "Combos rapidísimos que mandan a volar.": "Super fast combos that send enemies flying.",
  "Puño del Titán": "Titan's Fist",
  "Ondas de choque gigantes.": "Giant shockwaves.",
  "Hachas Gemelas": "Twin Axes",
  "Muchas más hachas que vuelven.": "Many more returning axes.",
  "Tridente de Zeus": "Zeus' Trident",
  "Rayos que saltan sin parar.": "Lightning that never stops jumping.",
  "Traca Final": "Grand Finale",
  "Explosiones enormes por todas partes.": "Huge explosions everywhere.",
  "Perfume Mortal": "Deadly Perfume",
  "Una nube enorme que además te cura.": "A huge cloud that also heals you.",
  "Balón de Oro": "Golden Ball",
  "Balones que rebotan muchísimas veces.": "Balls that bounce many, many times.",
  "Ventisca": "Blizzard",
  "Una tormenta de hielo constante.": "A constant ice storm.",
  "Mil Kunais": "Thousand Kunais",
  "Una pared de kunais.": "A wall of kunais.",
  "Lluvia de Estrellas": "Starfall",
  "Caen meteoritos sin parar.": "Meteors fall nonstop.",
  "Enjambre de Drones": "Drone Swarm",
  "Más drones con láseres más largos.": "More drones with longer lasers.",
  "Huracán": "Hurricane",
  "Tornados enormes que arrastran a todos.": "Huge tornadoes that drag everyone in.",
  // Online
  "Crear sala": "Create room",
  "Unirse": "Join",
  "Código de la sala": "Room code",
  "Empezar partida": "Start run",
  "Salir de la sala": "Leave room",
  "Jugadores": "Players",
  "¡El Moco Rey se divide!": "The Snot King splits!",
  "¡El General pide refuerzos!": "The General calls for backup!",
  "El anfitrión decide si seguir en modo infinito": "The host decides whether to keep going in endless mode",
  "¡MODO INFINITO!": "ENDLESS MODE!",
  "Aguanta todo lo que puedas": "Survive as long as you can",
  "Primeras partidas: los enemigos pegan un 25 % menos.": "First games: enemies hit 25% softer.",
  "el botón redondo": "the round button",
  "Espacio": "Space",
  "Modo infinito": "Endless mode",
  "¡Toca!": "Tap!",
  "Efectos reducidos para que el juego vaya más fluido.": "Effects reduced so the game runs smoother.",
  "¡Fin del modo infinito!": "Endless mode over!",
  "Zombi": "Zombie",
  "Zombi corredor": "Runner zombie",
  "Murciélago": "Bat",
  "Zombi gordo": "Fat zombie",
  "Zombi con casco": "Helmet zombie",
  "Moco": "Snot",
  "Moquito": "Little snot",
  "Esqueleto": "Skeleton",
  "Zombi bomba": "Bomb zombie",
  "Fantasma": "Ghost",
  "Brujo antitronk": "Antitronk warlock",
  "Barril": "Barrel",
  "Caja": "Crate",
  "Jarrón": "Vase",
  "Brasero": "Brazier",
  "El Rey Esqueleto": "The Skeleton King",
  "El Moco Rey": "The Snot King",
  "El General Antitronk": "The Antitronk General",
  "Gana una partida en cualquier mapa": "Win a run on any map",
  "Gana una partida derrotando al jefe final": "Win a run by defeating the final boss",
  "Gana una partida con Sunk": "Win a run with Sunk",
  "Tajo Giratorio": "Spinning Slash",
  "Un barrido enorme a tu alrededor.": "A huge sweep all around you.",
  "Megapetardo": "Mega Firecracker",
  "Una explosión gigante a tu alrededor.": "A giant explosion around you.",
  "Perfume Curativo": "Healing Perfume",
  "Recuperas el 40 % de la vida y eres invencible 3 segundos.": "Restore 40% health and become invincible for 3 seconds.",
  "Chilena": "Bicycle Kick",
  "Lanza 12 balones en todas direcciones.": "Kicks 12 balls in every direction.",
  "Lluvia de Virotes": "Bolt Rain",
  "Dispara 24 virotes en círculo.": "Fires 24 bolts in a circle.",
  "Terremoto": "Earthquake",
  "Un mazazo que sacude a todos los de la pantalla.": "A hammer blow that shakes everyone on screen.",
  "Torbellino de Hachas": "Axe Whirlwind",
  "Lanza 8 hachas que vuelven.": "Throws 8 axes that come back.",
  "Congelación": "Deep Freeze",
  "Congela a todos los enemigos de la pantalla 4 segundos.": "Freezes every enemy on screen for 4 seconds.",
  "Carga con Lanza": "Spear Charge",
  "Embiste hacia delante atravesando a todos.": "Charges forward, piercing everyone.",
  "Ráfaga de Golpes": "Punch Flurry",
  "Una lluvia de puñetazos alrededor que manda a volar.": "A flurry of punches around you that sends enemies flying.",
  "Danza Ninja": "Ninja Dance",
  "Te teletransportas cortando a todos por el camino.": "Teleport forward, cutting everyone in your path.",
  "Caen 10 meteoritos sobre los enemigos.": "10 meteors fall on the enemies.",
  "Puñetazo Titánico": "Titanic Punch",
  "Un puñetazo al suelo que lanza una onda enorme.": "A punch to the ground that sends out a huge shockwave.",
  "Tormenta": "Storm",
  "Caen rayos sobre los 14 enemigos más cercanos.": "Lightning strikes the 14 nearest enemies.",
  "Ataque Orbital": "Orbital Strike",
  "Un láser gigante desde el espacio.": "A giant laser from space.",
  "4 tornados salen hacia fuera arrastrándolo todo.": "4 tornadoes spin outwards, dragging everything along.",
  "Derrota a {n} enemigos": "Defeat {n} enemies",
  "Derrota a {n} jefes": "Defeat {n} bosses",
  "Juega {n} partidas": "Play {n} runs",
  "Rompe {n} barriles, cajas o jarrones": "Break {n} barrels, crates or vases",
  "Aguanta {n} minutos en una partida": "Survive {n} minutes in one run",
  "Llega a nivel {n} en una partida": "Reach level {n} in one run",
  "Gana {n} partida": "Win {n} run",
  "Juega {n} partidas con amigos": "Play {n} runs with friends",
  "Juega {n} retos diarios": "Play {n} daily challenges",
  "Evoluciona {n} armas": "Evolve {n} weapons",
  "Juega {n} partidas fuera del bosque": "Play {n} runs outside the forest",
  "Usa la habilidad especial {n} veces": "Use your special ability {n} times",
  "Misiones": "Missions",
  "Modo infinito: los que más aguantan": "Endless mode: longest survivors",
  "Al ganar una partida puedes seguir jugando sin final.": "After winning a run you can keep playing with no end.",
  "Misiones y logros": "Missions and achievements",
  "Misiones de la semana": "This week's missions",
  "Calidad de los efectos": "Effects quality",
  "Automática": "Automatic",
  "Alta": "High",
  "Baja (para móviles lentos)": "Low (for slow phones)",
  "Consejos de la primera partida": "First-game tips",
  "WASD o flechas para moverte · los ataques son automáticos · Espacio: habilidad · Esc pausa": "WASD or arrows to move · attacks are automatic · Space: ability · Esc to pause",
  "Habilidad": "Ability",
  "¡Nivel 2!": "Level 2!",
  "Has derrotado al jefe final. ¿Sigues en modo infinito? Los enemigos no paran, cada minuto y medio sale un jefe más fuerte y tu tiempo cuenta para su propia clasificación.": "You defeated the final boss. Keep going in endless mode? Enemies never stop, a stronger boss appears every minute and a half, and your time counts for its own leaderboard.",
  "Seguir jugando": "Keep playing",
  "Terminar": "Finish",
  "Elegir mapa": "Choose map",
  "Conectando…": "Connecting…",
  "← Volver a TronkStudios": "← Back to TronkStudios",
  "No se puede conectar con el servidor ahora mismo.": "Can't reach the server right now.",
  "No se ha podido conectar. Inténtalo otra vez.": "Couldn't connect. Try again.",
  "Esperando a que el anfitrión empiece…": "Waiting for the host to start…",
  "Pásale este código a tus amigos (hasta 4 jugadores).": "Share this code with your friends (up to 4 players).",
  "No se ha encontrado la sala.": "Room not found.",
  "La sala está llena.": "The room is full.",
  "Se ha perdido la conexión con el anfitrión.": "Lost connection to the host.",
  "Cada uno juega con su personaje elegido y sus mejoras. Los jugadores se conectan directamente entre ellos.": "Everyone plays with their chosen character and upgrades. Players connect directly to each other."
};

// Frases con datos: {clave: [español, inglés]}
const TEMPLATES = {
  best: ["Mejor partida: {time} · {kills} enemigos · nivel {level}", "Best run: {time} · {kills} enemies · level {level}"],
  wins: [" · {n} victorias", " · {n} wins"],
  pity: ["Legendario seguro en {n} tiradas", "Guaranteed legendary in {n} pulls"],
  open1: ["Abrir 1", "Open 1"],
  open10: ["Abrir 10", "Open 10"],
  free: ["¡gratis!", "free!"],
  stars: ["★ {n} estrellas", "★ {n} stars"],
  plusCoins: ["+{n} monedas", "+{n} coins"],
  levelOf: ["{name} · nivel {lvl}", "{name} · level {lvl}"],
  dmg: ["Daño {a} → {b}", "Damage {a} → {b}"],
  more: ["+{n} más", "+{n} more"],
  jumps: ["+{n} saltos", "+{n} jumps"],
  areaUp: ["+{n} % de área", "+{n}% area"],
  pierceUp: ["atraviesa más", "pierces more"],
  faster: ["más rápido", "faster"],
  hudSub: ["{map} · {kills} derrotados · {coins} monedas", "{map} · {kills} defeated · {coins} coins"],
  loggedIn: ["Conectado como {name} · tu progreso se guarda en tu cuenta", "Logged in as {name} · your progress is saved to your account"],
  loggedOut: ["Inicia sesión en TronkStudios para guardar tu progreso y salir en la clasificación", "Log in to TronkStudios to save your progress and appear on the leaderboard"],
  drawing: ["Dibujando personajes… {n} %", "Drawing characters… {n}%"],
  achDone: ["¡Logro! {name} (+{n} monedas)", "Achievement! {name} (+{n} coins)"],
  achCount: ["{a} / {b}", "{a} / {b}"],
  mapUnlocked: ["¡Nuevo mapa: {name}!", "New map: {name}!"],
  dailyBonus: ["Primer reto de hoy: +100 monedas", "First challenge today: +100 coins"],
  evolve: ["¡{player}: {name}!", "{player}: {name}!"],
  chestEvo: ["{player}: ¡{from} evoluciona a {to}!", "{player}: {from} evolves into {to}!"],
  revived: ["¡{a} ha levantado a {b}!", "{a} revived {b}!"],
  secondLife: ["¡{name} ha usado su segunda vida!", "{name} used their second life!"],
  bossDown: ["¡Has derrotado a {name}!", "You defeated {name}!"],
  fallen: ["{name} (caído)", "{name} (down)"],
  weaponPerk: ["{weapon} · {perk}", "{weapon} · {perk}"],
  perk: ["Ventaja: {perk}", "Perk: {perk}"],
  rate: ["{name}: {n} %", "{name}: {n}%"],
  points: ["{n} puntos", "{n} points"],
  players: ["Jugadores ({n}/4)", "Players ({n}/4)"],
  missionDone: ["¡Misión cumplida! {name} (+{n} monedas)", "Mission complete! {name} (+{n} coins)"],
  weekLeft: ["· quedan {n} días", "· {n} days left"],
  levelTitle: ["¡Nivel {n}!", "Level {n}!"],
  tipMoveTouch: ["Usa el joystick de la izquierda para moverte. Atacas automáticamente; toca el botón de la derecha para la habilidad.", "Use the left stick to move. Attacks are automatic; tap the right button to use your ability."],
  tipMove: ["Muévete con WASD o las flechas (en el móvil, arrastra el dedo). Tu personaje ataca solo.", "Move with WASD or the arrow keys (on mobile, drag your finger). Your character attacks on their own."],
  tipGems: ["Recoge las gemas azules: dan experiencia para subir de nivel y elegir mejoras.", "Pick up the blue gems: they give experience to level up and choose upgrades."],
  tipProps: ["Rompe barriles, cajas y jarrones: sueltan jensalada, monedas, imanes y a veces cofres.", "Break barrels, crates and vases: they drop jensalada, coins, magnets and sometimes chests."],
  tipAbility: ["Cuando el círculo de abajo a la derecha brille, pulsa {key} para usar tu habilidad especial.", "When the circle at the bottom right glows, press {key} to use your special ability."],
  tipRanged: ["¡Cuidado con los Antitronks! Disparan desde lejos: no te quedes quieto.", "Watch out for the Antitronks! They shoot from afar: keep moving."]
};

function L(text) {
  if (LANG === "es" || text == null) return text;
  return EN[text] || text;
}

function LT(key, vars = {}) {
  const t = TEMPLATES[key];
  let out = t ? t[LANG === "en" ? 1 : 0] : key;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
  return out;
}

function setLang(lang) {
  LANG = lang === "en" ? "en" : "es";
  try {
    localStorage.setItem(LANG_KEY, LANG);
  } catch {
    // solo en esta visita
  }
  document.documentElement.lang = LANG;
}

// Traduce los textos fijos del HTML (guarda el original para volver al español)
function translatePage(root = document.body) {
  document.documentElement.lang = LANG;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement && node.parentElement.closest("script,style")) continue;
    if (node.__es === undefined) {
      const text = node.nodeValue.trim();
      if (!text || !(text in EN)) continue;
      node.__es = node.nodeValue;
    }
    const original = node.__es;
    const key = original.trim();
    node.nodeValue = LANG === "en" ? original.replace(key, EN[key]) : original;
  }
  for (const el of root.querySelectorAll("[aria-label]")) {
    if (el.__esLabel === undefined) el.__esLabel = el.getAttribute("aria-label");
    el.setAttribute("aria-label", L(el.__esLabel));
  }
}

Object.assign(EN, {
  "19 personajes": "19 characters", "19 armas": "19 weapons", "Consigue los 19 personajes": "Get all 19 characters",
  "Fase": "Phase", "Final": "Final", "Supervivencia final": "Final survival", "Fin de supervivencia": "Survival over",
  "Fases superadas": "Phases cleared", "Contra el jefe final": "Against the final boss",
  "¡JEFE FINAL!": "FINAL BOSS!", "¡NUEVA FASE!": "NEW PHASE!",
  "Aguanta hasta el minuto 25 y sobrevive a las fases del jefe final.": "Reach minute 25 and survive the final boss's phases.",
  "Supervivencia: los que más aguantan": "Survival: the longest runs",
  "Los enemigos se fortalecen sin parar. Al minuto 25 llega el jefe final: supera sus fases y aguanta todo lo que puedas.": "Enemies keep growing stronger. At minute 25 the final boss arrives: clear its phases and survive as long as you can.",
  "Supera la primera fase de cualquier jefe final": "Clear the first phase of any final boss",
  "Supera la primera fase del jefe final": "Clear the final boss's first phase",
  "Supera la primera fase del jefe final con Sunk": "Clear the final boss's first phase with Sunk",
  "Supera la primera fase de {n} jefe final": "Clear the first phase of {n} final boss",
  "Discos magnéticos": "Magnetic discs", "Viales de ácido": "Acid vials", "Lanzallamas": "Flamethrower",
  "Discos que orbitan a tu alrededor y golpean al contacto.": "Discs orbit you and deal contact damage.",
  "Lanza viales que dejan charcos dañinos y ralentizan a los enemigos.": "Throws vials that leave damaging pools and slow enemies.",
  "Una ráfaga de fuego en cono hacia el enemigo más cercano.": "A cone of fire aimed at the nearest enemy.",
  "Ingeniera de chatarra con una antena torcida. Sus discos magnéticos orbitan a su alrededor y cortan todo lo que se acerca.": "A scrap engineer with a crooked antenna. Her magnetic discs orbit her and slice anything that gets close.",
  "Alquimista del pantano, sombrero de hongo y mochila de frascos. Donde cae un vial queda un charco de ácido.": "A swamp alchemist with a mushroom hat and a bag of vials. Each vial leaves a pool of acid.",
  "Antigua guardiana de una fundición. Lleva una máscara de hierro, depósitos a la espalda y un lanzallamas de fabricación propia.": "A former foundry guard wearing an iron mask, fuel tanks and a homemade flamethrower.",
  "+12 % de área": "+12% area", "Recupera 0,35 de vida por segundo": "Regenerates 0.35 health per second", "+1 de armadura, +8 % de daño": "+1 armor, +8% damage",
  "Corona Magnética": "Magnetic Crown", "Mar de Veneno": "Sea of Venom", "Aliento de la Forja": "Forge Breath",
  "Más discos, más grandes y más rápidos.": "More discs, bigger and faster.", "Charcos más extensos que duran mucho más.": "Larger pools that last much longer.", "Un abanico de fuego más ancho y potente.": "A wider, stronger fan of fire.",
  "Polaridad": "Polarity", "Jardín Cáustico": "Caustic Garden", "Sobrecarga": "Overload",
  "Atrae a los enemigos cercanos y desata una descarga magnética.": "Pulls nearby enemies in and unleashes a magnetic discharge.",
  "Crea seis charcos de ácido y recupera el 15 % de vida.": "Creates six acid pools and restores 15% health.",
  "Una corona de llamas quema a todos los de alrededor.": "A crown of flames burns everything around you."
});

Object.assign(EN, {
  "Ataques del personaje":"Character moves", "Ataque base":"Basic attack", "Técnica automática":"Automatic technique", "Habilidad activa":"Active ability",
  "Aprende y mejora tus técnicas al subir de nivel. Solo usas el arma de tu personaje.":"Learn and upgrade techniques as you level up. You only use your character's weapon."
});
for (const moves of Object.values(TS.TECHNIQUES)) for (const move of moves) { EN[move.name]=move.nameEn; EN[move.desc]=move.descEn; }

Object.assign(EN, {
  "SUPERVIVENCIA · COOPERATIVO":"SURVIVAL · CO-OP",
  "Domina tu arma. Resiste la horda.":"Master your weapon. Hold back the horde.",
  "TU SUPERVIVIENTE":"YOUR SURVIVOR", "MEJORA TU EQUIPO":"UPGRADE YOUR BUILD",
  "Tronk Survivors · 25 minutos hasta el jefe final":"Tronk Survivors · 25 minutes until the final boss",
  "Reducir movimiento y destellos":"Reduce motion and flashes",
  "Proyectiles de alto contraste":"High contrast enemy projectiles",
  "Distancia de cámara":"Camera distance", "Amplia":"Wide", "Equilibrada":"Balanced", "Cercana":"Close",
  "Cambiar opciones":"Reroll choices", "Necesario para evolucionar":"Needed for evolution",
  "Recarga":"Cooldown", "Potencia":"Power", "Evolución":"Evolution",
  "Sin espacio para la pasiva":"No room for this passive", "Recoge un cofre con ambos requisitos":"Meet both requirements, then pick up a chest",
  "Daño causado":"Damage dealt", "Daño recibido":"Damage taken", "Vida recuperada":"Health restored",
  "Élites":"Elites", "Cofres":"Chests", "Cofre":"Chest", "Revivir":"Revive",
  "Espera a tu compañero":"Wait for a teammate", "Agua · movimiento al 58 %":"Water · movement at 58%",
  "Jefe en":"Boss in", "¡Élite! Busca el halo dorado":"Elite! Look for the golden halo",
  "¡Élite derrotado!":"Elite defeated!", "Pantalla completa":"Fullscreen",
  "Pantalla completa no disponible":"Fullscreen unavailable"
});

EN["Premios del cofre"] = "Chest rewards";

Object.assign(EN,{
 "24 personajes":"24 characters","24 armas":"24 weapons",
 "Barras de vida enemigas":"Enemy health bars","Al recibir daño":"When damaged","Siempre":"Always","Ocultas":"Hidden",
 "Reanimación":"Reviving","Acerca un compañero":"Bring a teammate close","Desconectado":"Disconnected",
 "Desbloqueo":"Unlock","rangos":"ranks","Brecha":"Breach","Próxima técnica":"Next technique","Rangos de técnicas":"Technique ranks",
 "¡Brecha! Derrota a los cuatro élites turquesa":"Breach! Defeat the four teal elites",
 "¡Brecha cerrada! Cofre e imán":"Breach closed! Chest and magnet",
 "Reanima un 50 % más rápido":"Revives teammates 50% faster",
 "Báculo faro":"Beacon staff","Faro del Alba":"Dawn Beacon","Luz de auxilio":"Rescue Light",
 "Arco de exploradora":"Scout bow","Bobina Tesla":"Tesla coil","Abanico de acero":"Steel fan","Tambor de guerra":"War drum",
 "Arco del Horizonte":"Horizon Bow","Tormenta Tesla":"Tesla Storm","Mil Hojas":"Thousand Blades","Latido de la Resistencia":"Heartbeat of Resistance",
 "Lluvia de flechas":"Arrow Rain","Cortocircuito":"Short Circuit","Danza de acero":"Steel Dance","Ritmo de rescate":"Rescue Rhythm",
 "Emite un pulso de luz que golpea a los enemigos cercanos.":"Emits a pulse of light that hits nearby enemies.",
 "Cura un 25 % a los aliados cercanos y adelanta un segundo su reanimación.":"Heals nearby allies by 25% and advances their revival by one second.",
 "Ataca alrededor con tu propia arma.":"Attacks around you with your own weapon."
});
const moveKindsEn={pierce:"Piercing attack",guard:"Defensive circle",focus:"Focused attack",surge:"Ultimate technique"};
for(const ch of TS.CHARACTERS)for(const move of TS.TECHNIQUES[ch.id]){
 if(moveKindsEn[move.id])EN[move.name]=`${ch.name} · ${moveKindsEn[move.id]}`;
 EN[move.desc]=move.descEn;
}
Object.assign(EN,{"Tornado perforante":"Piercing Tornado","Muralla de viento":"Wind Wall","Ojo del huracán":"Eye of the Hurricane","Tormenta total":"Total Storm"});

Object.assign(EN,{
 "Mantén al compañero cerca":"Keep your teammate close","Un compañero debe acercarse":"A teammate must get close",
 "Un proyectil adicional":"One extra projectile","+10 % de velocidad, +5 % de recarga":"+10% speed, +5% cooldown reduction",
 "Guardiana de los caminos. Su báculo faro emite ondas de luz y ayuda a levantar a los compañeros caídos.":"A guardian of the roads. Her beacon staff emits light waves and helps revive fallen teammates.",
 "Exploradora del bosque. Su arco atraviesa las líneas enemigas y su lluvia de flechas despeja el camino.":"A forest scout. Her bow pierces enemy ranks and her arrow rain clears the way.",
 "Electricista de las barricadas. Carga una bobina portátil que encadena descargas entre los enemigos.":"A barricade electrician carrying a portable coil that chains discharges between enemies.",
 "Duelista de los tejados. Abre su abanico de acero para lanzar cuchillas y ejecutar barridos precisos.":"A rooftop duelist. Her steel fan launches blades and delivers precise sweeps.",
 "Percusionista de la resistencia. Su tambor de guerra emite ondas que golpean y apartan a la horda.":"A resistance percussionist. Her war drum sends out waves that hit and push back the horde.",
 "Dispara flechas que atraviesan enemigos.":"Fires arrows that pierce enemies.","Encadena descargas eléctricas entre enemigos.":"Chains electrical discharges between enemies.",
 "Lanza cuchillas de acero en abanico.":"Throws steel blades in a fan.","Lanza ondas de percusión alrededor de ti.":"Sends percussion waves around you.",
 "Dispara una corona de flechas perforantes.":"Fires a crown of piercing arrows.","Una descarga daña y ralentiza a los enemigos cercanos.":"A discharge damages and slows nearby enemies.",
 "Un barrido de cuchillas despeja el espacio a tu alrededor.":"A sweep of blades clears the space around you.","Aparta a los enemigos y protege un instante a los aliados cercanos.":"Pushes enemies back and briefly protects nearby allies."
});
for(const [id,names] of Object.entries({iria:["Arrow Volley","Arrow Circle"],boro:["Coil Burst","Electric Circle"],vega:["Steel Fan Volley","Blade Circle"],tala:["War Drum Roll","Percussion Circle"]})){
 TS.TECHNIQUES[id].slice(0,2).forEach((move,i)=>EN[move.name]=names[i]);
}

EN["Técnica definitiva"]="Ultimate technique";

EN["jensalada"]="jensalada";

Object.assign(EN,{
 "Impacto":"Impact","Dominio":"Dominion","Ojo del huracán":"Eye of the Hurricane","Vientos errantes":"Wandering Winds",
 "+45 % de daño, −15 % de área y recarga un 18 % más lenta.":"+45% damage, -15% area and 18% slower cooldown.",
 "+40 % de área, dos ataques más, −20 % de daño y recarga un 10 % más rápida.":"+40% area, two extra attacks, -20% damage and 10% faster cooldown.",
 "Un huracán potente que acompaña al personaje.":"A powerful hurricane that follows the character.","Más tornados, más amplios, que avanzan en línea a gran velocidad.":"More, wider tornadoes travelling quickly in a straight line.",
 "Elige tu recompensa":"Choose your reward","Cada jugador elige una recompensa":"Each player chooses one reward","Elige una recompensa para tu personaje":"Choose a reward for your character",
 "Suministros":"Supplies","Recupera 40 de vida, atrae las gemas y suma 20 monedas.":"Restore 40 health, attract gems and gain 20 coins.","Dos caminos de evolución":"Two evolution paths",
 "Guardián":"Guardian","Sanador de la horda":"Horde healer","Tirador de precisión":"Sharpshooter",
 "Carga":"Charge","Anillos con abertura":"Gapped rings","Refuerzos":"Reinforcements","Fuego dirigido":"Aimed fire","Emboscada":"Ambush","Charcos peligrosos":"Hazard pools",
 "Campamento":"Camp","Altar maldito":"Cursed altar","Farola de refugio":"Shelter lamp","Activo":"Active","Guardianes restantes":"Guards remaining","Mantente en el círculo":"Stay inside the circle",
 "¡Altar purificado! Recoge el cofre":"Altar cleansed! Collect the chest","Altar activado: derrota a sus guardianes":"Altar activated: defeat its guards","Refugio activo durante 20 segundos":"Shelter active for 20 seconds",
 "Corriente: puedes moverte contra ella":"Current: you can move against it","Descarga conductora":"Conductive discharge","Vórtice ígneo":"Fire vortex"
});

Object.assign(EN,{"Racha":"Streak","vida":"health","monedas":"coins"});

Object.assign(EN,{"Cura durante 20 s":"Heals for 20 s","Derrota a 3 guardianes y gana un cofre":"Defeat 3 guardians to earn a chest","Cura, revela y debilita enemigos":"Heals, reveals and weakens enemies","Probar sonidos":"Test sounds","Arco":"Bow","Monstruo":"Monster","Magia":"Magic","Escuchar":"Listen","Sube el volumen de efectos para probarlos.":"Turn up the effects volume to test them."});

Object.assign(EN,{
 "Últimos golpes":"Last hits","Próximos encuentros":"Upcoming encounters","Menú de partida":"Run menu","La partida cooperativa continúa mientras miras este menú.":"The co-op game keeps running while you view this menu.","Terminar partida para todos":"End run for everyone","En combate":"In combat","En":"In","Jefe final":"Final boss","Reanimaciones":"Revives","Mejor racha":"Best streak","Nuevo récord":"New record","Contacto":"Contact","Proyectil":"Projectile","Bombardeo":"Bombardment","Zona peligrosa":"Danger zone","Explosión":"Explosion","Enemigo":"Enemy",
 "Mantén distancia y busca una salida entre los enemigos.":"Keep your distance and look for a gap between enemies.","Sal de la línea marcada antes de la carga.":"Leave the marked line before the charge.","Muévete de lado para evitar los proyectiles.":"Move sideways to avoid projectiles.","Sal del área marcada antes de que se active.":"Leave the marked area before it activates.","Aléjate del enemigo cuando prepare la explosión.":"Move away when the enemy prepares its explosion."
});

Object.assign(EN,{"Senderos y campamentos que curan durante 20 segundos.":"Trails and camps that heal for 20 seconds.","Activa altares, derrota a sus guardianes y consigue cofres.":"Activate altars, defeat their guardians and earn chests.","Arena, mar transitable y corrientes que puedes contrarrestar.":"Sand, wadeable sea and currents you can counter.","Busca farolas para curarte, revelar fantasmas y anular escudos.":"Find lamps to heal, reveal ghosts and disable shields."});

Object.assign(EN,{
 "Define tu especialización":"Choose your specialization","Elige una ventaja con su coste. Solo para esta partida.":"Choose a benefit with a trade-off. Only for this run.","Especialización":"Specialization","Especializaciones":"Specializations","Próxima especialización":"Next specialization","Especialización disponible en tu próxima subida de nivel":"Specialization available on your next level-up","Estadísticas del equipo":"Build statistics","Movimiento":"Movement","Tiempo de recarga":"Cooldown time","Vida máxima":"Maximum health","Armadura":"Armor","Regeneración":"Regeneration","Alcance de recogida":"Pickup range","Experiencia":"Experience","Proyectiles adicionales":"Additional projectiles","Potencia por impacto":"Power per hit","Recarga del arma":"Weapon cooldown","Cantidad":"Count","Área del arma":"Weapon area",
 "Dominio del arma":"Weapon mastery","Cobertura":"Coverage","Paso ligero":"Light step","Ritmo de combate":"Combat rhythm","Guardia firme":"Steady guard","Recuperación":"Recovery","Sobrecarga ofensiva":"Offensive overload","Control del terreno":"Ground control","Última resistencia":"Last stand",
 "+16 puntos de potencia y −8 puntos de área.":"+16 power percentage points and −8 area percentage points.","+20 puntos de área y +6 puntos de tiempo de recarga.":"+20 area percentage points and +6 cooldown percentage points.","+15 puntos de movimiento y −10 de vida máxima.":"+15 movement percentage points and −10 maximum health.","−10 puntos de tiempo de recarga y −8 puntos de potencia.":"−10 cooldown percentage points and −8 power percentage points.","+1,5 de armadura y −8 puntos de movimiento.":"+1.5 armor and −8 movement percentage points.","Regenera 0,5 de vida por segundo y pierde 8 puntos de área.":"Regenerate 0.5 health per second and lose 8 area percentage points.","+22 puntos de potencia y −15 de vida máxima.":"+22 power percentage points and −15 maximum health.","+28 puntos de área y +8 puntos de tiempo de recarga.":"+28 area percentage points and +8 cooldown percentage points.","+20 de vida máxima y −10 puntos de potencia.":"+20 maximum health and −10 power percentage points."
});

for(const kit of Object.values(TS.DISTINCT_KITS))for(const [name,nameEn,desc,descEn] of Object.values(kit)){if(!EN[name])EN[name]=nameEn;EN[desc]=descEn;}
Object.assign(EN,{
 "Prisma de desvío":"Deflection prism","Las flechas, virotes, kunais y copos rebotan una vez hacia otro enemigo, con la mitad de potencia.":"Arrows, bolts, kunai and ice shards bounce once toward another enemy at half power.",
 "Botas de resonancia":"Resonance boots","Recorrer 160 pasos crea una onda cercana. Como máximo una cada 3 segundos.":"Traveling 160 steps creates a nearby shockwave. At most once every 3 seconds.",
 "Semilla de refugio":"Refuge seed","Recoger jensalada deja un círculo que cura 2 de vida por segundo durante 5 segundos. Un círculo por jugador.":"Picking up jensalada leaves a circle that heals 2 health per second for 5 seconds. One circle per player.",
 "Reliquia":"Relic","Reliquias de partida":"Run relics","Reliquia · solo esta partida":"Relic · this run only","En los cofres pares puede aparecer una reliquia. La evolución y su receta tienen prioridad.":"Even-numbered chests may offer a relic. Evolution and its recipe take priority.",
 "¡Pinza! Busca la abertura turquesa":"Pincer attack! Find the turquoise opening","Pinza de la horda":"Horde pincer"
});

Object.assign(EN,{
  "Activa concentrada": "Focused active",
  "Eco de la activa": "Active echo",
  "+35 % de daño y curación de la activa. Recarga un 20 % más lenta.": "+35% active damage and healing. Cooldown is 20% longer.",
  "Repite la activa un segundo después al 45 % de daño y curación. Recarga un 25 % más lenta.": "Repeats the active one second later at 45% damage and healing. Cooldown is 25% longer.",
  "Tornado viajero: avanza en la dirección apuntada, con +35 % de daño y recarga un 20 % más lenta.": "Travelling tornado: moves in the aimed direction, with +35% damage and a 20% longer cooldown.",
  "Ojo del vendaval: tornado fijo más amplio que atrae enemigos durante 4 segundos. Recarga un 25 % más lenta.": "Eye of the gale: a larger stationary tornado pulls enemies for 4 seconds. Cooldown is 25% longer.",
  "Nido de refuerzos": "Reinforcement nest",
  "Sepulcro inquieto": "Restless tomb",
  "Sepulcro inquieto: destrúyelo para impedir resurrecciones": "Restless tomb: destroy it to stop resurrections",
  "Nido descubierto: destrúyelo para cortar los refuerzos": "Nest discovered: destroy it to stop reinforcements",
  "¡Origen destruido! Cofre y refugio durante 10 segundos": "Source destroyed! Chest and refuge for 10 seconds",
  "Destruye el nido para cortar sus refuerzos y conseguir un cofre.": "Destroy the nest to stop its reinforcements and earn a chest.",
  "Destruye el sepulcro: los esqueletos cercanos pueden resucitar una vez.": "Destroy the tomb: nearby skeletons can resurrect once.",
  "¡Postura rota!": "Posture broken!",
  "¡Esquiva precisa!": "Precise dodge!",
  "¡Técnicas enlazadas!": "Linked techniques!",
  "Ver ataque": "Play attack",
  "Demostración de ataques": "Attack demonstration",
  "Ataque de demostración": "Demonstration attack",
  "Rendimiento por habilidad": "Skill performance",
  "Sin impactos registrados": "No hits recorded",
  "Daño": "Damage",
  "Curación": "Healing",
  "Control": "Control",
  "Comparación con tu partida anterior": "Comparison with your previous run",
  "Técnicas anteriores": "Previous techniques",
  "Técnicas actuales": "Current techniques",
  "Tu siguiente partida con este personaje y mapa tendrá una comparación.": "Your next run with this character and map will include a comparison.",
  "Últimas partidas comparables": "Recent comparable runs",
  "Detalles y comparación": "Details and comparison",
  "Esquivas precisas": "Precise dodges",
  "Volver a la sala online": "Return to online lobby",
  "Repetir configuración": "Replay setup",
  "Vuelve a crear o unirte a una sala para jugar con tus amigos.": "Create or join a lobby again to play with your friends.",
  "Mismo personaje, mapa y reglas. El mapa se genera de nuevo salvo en retos con semilla.": "Same character, map and rules. A new map is generated except in seeded challenges.",
  "Evoluciona tu habilidad activa": "Evolve your active ability"
});

Object.assign(EN,{"+35 % de daño si se enlazan en 3 segundos.":"+35% damage when linked within 3 seconds."});

Object.assign(EN,{"Tornado viajero":"Travelling tornado","Ojo del vendaval":"Eye of the gale"});

Object.assign(EN,{
  "Guardia del rey": "King's guard",
  "Corona de acero": "Steel crown",
  "Flecha perforadora": "Piercing arrow",
  "Salvas del bosque": "Forest volleys",
  "Carga comprimida": "Compressed charge",
  "Festival expansivo": "Expanding festival",
  "Perfume protector": "Protective perfume",
  "Jardín de aromas": "Aromatic garden",
  "Balones perforantes": "Piercing balls",
  "Rebote prolongado": "Lasting rebound",
  "Virotes veloces": "Swift bolts",
  "Cerco de virotes": "Bolt enclosure",
  "Martillo quebrantador": "Posture-breaking hammer",
  "Ondas expansivas": "Expanding waves",
  "Hachas de largo alcance": "Long-range axes",
  "Corona de hachas": "Axe crown",
  "Escarcha persistente": "Lasting frost",
  "Invierno extenso": "Wide winter",
  "Estocada protegida": "Protected thrust",
  "Eco de estocada": "Thrust echo",
  "Puños quebrantadores": "Posture-breaking fists",
  "Cerco de puños": "Fist enclosure",
  "Impactos inmediatos": "Immediate impacts",
  "Lluvia persistente": "Lasting rain",
  "Puño demoledor": "Demolishing fist",
  "Onda expansiva": "Expanding wave",
  "Descarga paralizante": "Slowing discharge",
  "Tormenta extensa": "Wide storm",
  "Paso protegido": "Protected step",
  "Eco de sombras": "Shadow echo",
  "Láser de precisión": "Precision laser",
  "Barrido de drones": "Drone sweep",
  "Auxilio concentrado": "Focused aid",
  "Luz compartida": "Shared light",
  "Discos de contención": "Containment discs",
  "Órbita extensa": "Wide orbit",
  "Ácido inmediato": "Immediate acid",
  "Jardín corrosivo": "Corrosive garden",
  "Llamas concentradas": "Focused flames",
  "Corona de fuego": "Fire crown",
  "Marea penetrante": "Piercing tide",
  "Marea extensa": "Wide tide",
  "Abanico perforante": "Piercing fan",
  "Brisa envolvente": "Enveloping breeze",
  "Pulso persistente": "Lasting pulse",
  "Cobertura extensa": "Wide coverage",
  "Bloquea un proyectil durante 1,5 segundos.": "Blocks one projectile for 1.5 seconds.",
  "Amplía un 20 % el alcance del eco.": "Increases echo range by 20%.",
  "Proyectiles un 20 % más rápidos y dos penetraciones adicionales.": "20% faster projectiles with two additional penetrations.",
  "Abre las trayectorias del eco y amplía su alcance.": "Widens echo trajectories and increases range.",
  "Explosión más concentrada.": "A more concentrated explosion.",
  "Amplía un 20 % el radio del eco.": "Increases echo radius by 20%.",
  "Acumula un 40 % más de postura con la activa.": "The active builds 40% more posture.",
  "Amplía un 20 % el alcance de las ondas del eco.": "Increases echo wave range by 20%.",
  "Las hachas viajan un 50 % más lejos antes de volver.": "Axes travel 50% farther before returning.",
  "Las hachas del eco duran un 30 % más.": "Echo axes last 30% longer.",
  "Balones más rápidos con dos penetraciones adicionales.": "Faster balls with two additional penetrations.",
  "Los balones del eco duran un 30 % más.": "Echo balls last 30% longer.",
  "Prolonga un 50 % las ralentizaciones de la activa.": "Active slows last 50% longer.",
  "Amplía un 20 % la zona de la activa y de su eco.": "Increases active and echo area by 20%.",
  "Reduce a la mitad el aviso de los meteoros.": "Halves the meteor warning time.",
  "Amplía un 20 % el radio de los impactos del eco.": "Increases echo impact radius by 20%.",
  "La activa también ralentiza un 35 % durante un segundo.": "The active also slows by 35% for one second.",
  "Amplía un 20 % el alcance de la activa y de su eco.": "Increases active and echo range by 20%.",
  "Láseres un 25 % más largos en un abanico estrecho.": "25% longer lasers in a narrow fan.",
  "Abanico de láseres más abierto.": "A wider laser fan.",
  "El ácido de la activa empieza a golpear inmediatamente.": "Active acid starts hitting immediately.",
  "Los charcos del eco duran un 30 % más.": "Echo pools last 30% longer.",
  "Llamaradas un 20 % más largas y estrechas.": "20% longer, narrower flames.",
  "Amplía un 20 % el alcance de las llamaradas del eco.": "Increases echo flame range by 20%.",
  "El perfume permite bloquear un proyectil durante 1,5 segundos.": "The perfume blocks one projectile for 1.5 seconds.",
  "El eco deja un refugio perfumado de cuatro segundos.": "The echo leaves a perfumed refuge for four seconds.",
  "Concentra la cura en el aliado más herido o adelanta su reanimación.": "Focuses healing on the most injured ally or advances their revival.",
  "Amplía un 20 % el alcance de ambas curaciones.": "Increases both healing ranges by 20%.",
  "Antena de refuerzos": "Reinforcement antenna",
  "Nido de coral": "Coral nest",
  "Rango": "Rank",
  "Rango del arma o técnica": "Weapon or technique rank",
  "Enlace disponible": "Link available",
  "Objetivo de la brújula": "Compass target",
  "Elegir objetivo de la brújula": "Choose compass target",
  "Automático": "Automatic",
  "Daño por segundo disponible": "Damage per available second",
  "Tiempo disponible": "Available time",
  "La comparación requiere las mismas estrellas, mejoras iniciales, equipo y reglas. Las partidas antiguas sin estos datos se conservan en el historial.": "Comparisons require matching stars, starting upgrades, team and rules. Older runs without this information remain in history.",
  "Señales de combate": "Combat signals",
  "◇ La barra dorada muestra la postura acumulada. ! indica interrupción. × y la barra rayada indican resistencia temporal. El rombo de color marca un objetivo de Iria. La concentración iluminada muestra los segundos restantes del enlace.": "◇ The gold bar shows accumulated posture. ! indicates stagger. × and the striped bar indicate temporary resistance. The colored diamond marks an Iria target. The highlighted focus technique shows seconds remaining on the link."
});

Object.assign(EN,{"La protección del perfume dura un segundo más.":"Perfume protection lasts one second longer."});

Object.assign(EN,{"Destruye el origen para cortar sus refuerzos y conseguir un cofre.":"Destroy the source to stop its reinforcements and earn a chest."});

Object.assign(EN,{"Amplía un 20 % la cobertura del eco.": "Increases echo coverage by 20%.", "Abre las trayectorias del eco.": "Widens echo trajectories.", "Reduce un 15 % el radio de la explosión.": "Reduces explosion radius by 15%.", "Las hachas del eco vuelven tras recorrer un 25 % menos de distancia.": "Echo axes return after travelling 25% less distance.", "La activa también ralentiza un 65 % durante 1,5 segundos.": "The active also slows by 65% for 1.5 seconds."});

Object.assign(EN,{"Volver al plantel":"Back to roster"});

Object.assign(EN,{"30 personajes": "30 characters", "30 armas": "30 weapons", "Historial": "Run history", "Buscar personaje": "Find character", "Nombre": "Name", "Disponibilidad": "Availability", "Todos": "All", "Todas": "All", "Conseguidos": "Unlocked", "Arma": "Weapon", "Personaje": "Character", "Mapa": "Map", "HUD discreto": "Compact HUD", "Anticipar cámara al caminar": "Look ahead while walking", "Ordenar rendimiento": "Sort performance", "Aplicaciones de control": "Control applications", "Configuración registrada": "Starting setup recorded", "Partida antigua: sin equivalencia de reglas": "Older run: different or unknown rules", "Todavía no hay partidas para este filtro.": "No runs match this filter yet.", "Ver todos": "Reveal all", "Tus personajes ya están guardados.": "Your characters have been saved.", "También se desbloquea jugando": "Also unlocked by playing", "partidas": "runs", "enemigos derrotados": "enemies defeated", "jefes derrotados": "bosses defeated", "segundos de supervivencia": "survival seconds", "Amplía el comportamiento de su arma propia.": "Expands the behavior of the native weapon."});
const newcomerEnglish=[["Boarding hook", "Boarding action", "A canal captain whose hook thrusts and pulls enemies out of formation.", "Hits an enemy and pulls it closer; bosses resist the pull."], ["Refracting prism", "Refracted constellation", "A light cartographer whose suspended prism links beams between targets.", "Projects beams that link nearby enemies."], ["Steel shears", "Hold the pattern", "A barricade tailor whose steel shears deliver two crossing cuts.", "Crosses two frontal cuts with the shears."], ["Refuge banner", "Hold the line", "The last plaza guardian whose banner sends defensive pulses.", "Emits nearby pulses and protects allies with the active ability."], ["Industrial tuning fork", "Breaking frequency", "A machine tuner whose industrial fork creates resonant shockwaves.", "Strikes the ground and releases resonant shockwaves."], ["Tracker boomerang", "Returning wind", "A dune tracker whose returning boomerang pierces enemy ranks.", "Flies forward and returns through enemies."]];
for(const [i,ch] of TS.NEW_ROSTER.entries()){
 const [weapon,active,description,weaponDescription]=newcomerEnglish[i];
 EN[ch.weaponName]=weapon;EN[ch.active]=active;EN[ch.desc]=description;EN[ch.weaponDesc]=weaponDescription;
 EN[TS.EVOLUTIONS[ch.weapon].name]=`${weapon} · Masterwork`;
 EN[TS.ACTIVE_IDENTITIES[ch.id][0]]=`${active} · Precision`;EN[TS.ACTIVE_IDENTITIES[ch.id][1]]=`${active} · Echo`;
 for(const move of TS.TECHNIQUES[ch.id]){EN[move.name]=move.nameEn.replace(ch.weaponName,weapon);EN[move.desc]=move.descEn.replace(ch.weaponName,weapon);}
}

Object.assign(EN,{"Premio":"Reward","Abriendo el cofre…":"Opening the chest…"});

Object.assign(EN,{"Impulso":"Dash","Impulso · Mayúsculas":"Dash · Shift","Mayúsculas":"Shift","Listo":"Ready","WASD o flechas · Mayúsculas impulso · Espacio habilidad · Esc pausa":"WASD or arrows · Shift dash · Space ability · Esc pause"});
TEMPLATES.tipDash=["Pulsa {key} para un impulso en tu dirección. Recarga en 6 segundos y no te hace invulnerable.","Press {key} to dash in your direction. It recharges in 6 seconds and does not make you invulnerable."];
