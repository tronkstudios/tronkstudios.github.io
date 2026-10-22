"use strict";

/* TronkStudios · survivors/js/data.js
   Tronk Survivors: todos los datos del juego (personajes, armas, mejoras,
   enemigos, oleadas, tienda y cofre). Se cargan antes que los dibujos
   (sprites.js) y el motor (game.js). Scripts clásicos (ver docs/adr/0002). */

const TS = {};

/* ---------- RAREZAS (cofre) ---------- */
TS.RARITIES = {
  comun: { name: "Común", color: "#a7b0be", rate: 0.6 },
  raro: { name: "Raro", color: "#3b8bff", rate: 0.28 },
  epico: { name: "Épico", color: "#b05cff", rate: 0.1 },
  legendario: { name: "Legendario", color: "#ffc531", rate: 0.02 }
};
TS.RARITY_ORDER = ["comun", "raro", "epico", "legendario"];

/* ---------- PERSONAJES ----------
   Los 7 de Tronk Fight y 9 nuevos. skin: "light" (piel clara) o
   "dark" (morena); el color de Tronk Fight va en la ropa (shirt). «perk» son sus ventajas propias:
   speed, maxHp, might (daño), area, cooldown, magnet, armor, regen,
   growth (experiencia), greed (monedas) y amount (proyectiles). */
TS.CHARACTERS = [
  {
    id: "ranjay", name: "Ranjay", rarity: "comun", from: "Tronk Fight", weapon: "tajo",
    skin: "light", hair: "taper", hairColor: "#2b1a10", shirt: "#ff8a1f", pants: "#23232f",
    perk: { speed: 0.1 }, perkText: "+10 % de velocidad",
    desc: "El de siempre. Rápido y con su espada, el primero en apuntarse a cualquier lío."
  },
  {
    id: "bruno", name: "Bruno", rarity: "comun", from: "Nuevo", weapon: "petardo",
    skin: "light", hair: "capBack", hairColor: "#2a1a12", acc: "#d62828", shirt: "#f1c40f", pants: "#2d3047",
    perk: { area: 0.1 }, perkText: "+10 % de área",
    desc: "Lleva la gorra al revés y los bolsillos llenos de petardos. No le dejéis cerca de un mechero."
  },
  {
    id: "lia", name: "Lía", rarity: "comun", from: "Nuevo", weapon: "colonia",
    skin: "light", hair: "ponytail", hairColor: "#4a1d3a", acc: "#ffd23f", shirt: "#2ec4b6", pants: "#3a2d4a",
    perk: { maxHp: 0.2 }, perkText: "+20 % de vida",
    desc: "Su colonia es tan fuerte que los zombis se mueren otra vez. Ella dice que huele a fresa."
  },
  {
    id: "toto", name: "Toto", rarity: "comun", from: "Nuevo", weapon: "balon",
    skin: "light", hair: "afro", hairColor: "#1a1210", shirt: "#e63946", pants: "#f1f1f1",
    perk: { magnet: 0.25 }, perkText: "+25 % de imán",
    desc: "El 10 del recreo. Sus balones rebotan de cabeza en cabeza y nunca pierde ninguno."
  },
  {
    id: "omogos", name: "Omogos", rarity: "raro", from: "Tronk Fight", weapon: "virote",
    skin: "light", hair: "longCurly", hairColor: "#3a2618", beard: true, shirt: "#2549b8", pants: "#2a2630",
    perk: { armor: 1 }, perkText: "+1 de armadura",
    desc: "Melena, barba, ballesta y cero prisa. Apunta solo, dispara solo y casi nunca falla."
  },
  {
    id: "finillos", name: "Finillos", rarity: "raro", from: "Tronk Fight", weapon: "mazazo",
    skin: "dark", hair: "taperLong", hairColor: "#1a1210", shirt: "#c9a27c", pants: "#3b3226",
    perk: { maxHp: 0.3, speed: -0.08 }, perkText: "+30 % de vida, −8 % de velocidad",
    desc: "Lento pero imparable. Cada mazazo hace temblar el suelo y a los zombis de alrededor."
  },
  {
    id: "chambas", name: "Chambas", rarity: "raro", from: "Tronk Fight", weapon: "hacha",
    skin: "dark", hair: "spiky", hairColor: "#121212", shirt: "#3cc24f", pants: "#24242c",
    perk: { might: 0.1 }, perkText: "+10 % de daño",
    desc: "Lanza el hacha, la hacha vuelve. A veces le da en la cabeza, pero eso no lo cuenta."
  },
  {
    id: "frosti", name: "Frosti", rarity: "raro", from: "Nuevo", weapon: "copos",
    skin: "light", hair: "beanie", hairColor: "#c98f5a", acc: "#3a86ff", shirt: "#a8dadc", pants: "#1d3557",
    perk: { regen: 0.25 }, perkText: "Recupera vida poco a poco",
    desc: "Siempre tiene frío, incluso en agosto. Congela todo lo que se le acerca."
  },
  {
    id: "yant", name: "Yant", rarity: "epico", from: "Tronk Fight", weapon: "estocada",
    skin: "light", hair: "combover", hairColor: "#3b2a1c", glasses: true, shirt: "#7fd6ff", pants: "#2c3550",
    perk: { cooldown: 0.1 }, perkText: "Ataca un 10 % más a menudo",
    desc: "Lo calcula todo antes de atacar. Su lanza llega más lejos que nadie."
  },
  {
    id: "eledemak", name: "Eledemak", rarity: "epico", from: "Tronk Fight", weapon: "guantes",
    skin: "light", hair: "mullet", hairColor: "#2a130c", shirt: "#e8322f", pants: "#3a4a6a",
    perk: { might: 0.12 }, perkText: "+12 % de daño",
    desc: "Se quitó la guadaña y se puso los guantes. Sus combos de puñetazos mandan a los zombis a volar."
  },
  {
    id: "kaito", name: "Kaito", rarity: "epico", from: "Nuevo", weapon: "kunai",
    skin: "light", hair: "ninja", hairColor: "#0d0d12", acc: "#e63946", shirt: "#1b1b2f", pants: "#1b1b2f",
    perk: { speed: 0.2 }, perkText: "+20 % de velocidad",
    desc: "Expulsado del clan ninja por llegar tarde. Ahora lucha contra ellos, y tira kunais a toda velocidad."
  },
  {
    id: "nova", name: "Nova", rarity: "epico", from: "Nuevo", weapon: "meteoro",
    skin: "light", hair: "bob", hairColor: "#1e1b4b", acc: "#ffe066", shirt: "#22223b", pants: "#4a4e69",
    perk: { growth: 0.2 }, perkText: "+20 % de experiencia",
    desc: "Mira las estrellas y las estrellas le hacen caso: llueven meteoritos donde ella señala."
  },
  {
    id: "sunk", name: "Sunk", rarity: "legendario", from: "Nuevo", weapon: "punos",
    skin: "light", hair: "fluffy", hairColor: "#241812", stubble: true, shirtless: true, muscular: true, baggy: true,
    shirt: "#f0c8a0", pants: "#b9b6ad", shoes: "#141414",
    perk: { might: 0.2, maxHp: 0.1 }, perkText: "+20 % de daño, +10 % de vida",
    desc: "No necesita armas ni camiseta. Cada puñetazo suelta una onda que tumba filas enteras de zombis."
  },
  {
    id: "quizo", name: "Quizo", rarity: "legendario", from: "Tronk Fight", weapon: "rayo",
    skin: "light", hair: "mane", hairColor: "#5a3410", acc: "#6b2fa0", shirt: "#ffd23f", pants: "#2a1f3a",
    perk: { might: 0.15, cooldown: 0.08 }, perkText: "+15 % de daño, ataca un 8 % más a menudo",
    desc: "El rey de la melena. Su tridente lanza rayos que saltan de enemigo en enemigo."
  },
  {
    id: "zeta", name: "Zeta", rarity: "legendario", from: "Nuevo", weapon: "dron",
    skin: "light", hair: "helmet", hairColor: "#3d4451", acc: "#00e5ff", shirt: "#3d4451", pants: "#22262e",
    perk: { amount: 1 }, perkText: "+1 proyectil en todas las armas",
    desc: "Viene del año 3026 con un dron láser. Dice que en el futuro los zombis son peores."
  },
  {
    id: "duna", name: "Duna", rarity: "legendario", from: "Nuevo", weapon: "tornado",
    skin: "light", hair: "hood", hairColor: "#e9c46a", acc: "#b08a3e", shirt: "#e76f51", pants: "#6d4c41",
    perk: { greed: 0.25, area: 0.1 }, perkText: "+25 % de monedas, +10 % de área",
    desc: "Llegó del desierto montada en un tornado. Con su báculo del viento, ahora los tornados la siguen a ella."
  }
];
TS.STARTER = "ranjay";

/* ---------- ARMAS ----------
   Nivel 1 a 6. Cada nivel indica sus valores:
   dmg (daño), cd (recarga en fotogramas a 60 por segundo), count (cuántos),
   area (tamaño), pierce (enemigos que atraviesa), speed, dur (duración). */
TS.WEAPONS = {
  tajo: {
    name: "Espada", desc: "Un tajo hacia donde miras. Desde el nivel 3, también por detrás.",
    levels: [
      { dmg: 12, cd: 66, count: 1, area: 1 },
      { dmg: 16, cd: 62, count: 1, area: 1.1 },
      { dmg: 18, cd: 60, count: 2, area: 1.15 },
      { dmg: 23, cd: 56, count: 2, area: 1.25 },
      { dmg: 27, cd: 52, count: 2, area: 1.35 },
      { dmg: 34, cd: 46, count: 2, area: 1.5 }
    ]
  },
  virote: {
    name: "Ballesta", desc: "Dispara virotes al enemigo más cercano.",
    levels: [
      { dmg: 10, cd: 54, count: 1, pierce: 1, speed: 5 },
      { dmg: 12, cd: 52, count: 2, pierce: 1, speed: 5 },
      { dmg: 14, cd: 50, count: 2, pierce: 2, speed: 5.5 },
      { dmg: 16, cd: 46, count: 3, pierce: 2, speed: 5.5 },
      { dmg: 19, cd: 42, count: 3, pierce: 3, speed: 6 },
      { dmg: 23, cd: 38, count: 4, pierce: 3, speed: 6 }
    ]
  },
  mazazo: {
    name: "Mazo", desc: "Golpea el suelo: una onda empuja y daña a todos los de alrededor.",
    levels: [
      { dmg: 16, cd: 150, area: 1 },
      { dmg: 20, cd: 140, area: 1.1 },
      { dmg: 25, cd: 130, area: 1.2 },
      { dmg: 30, cd: 120, area: 1.3 },
      { dmg: 36, cd: 110, area: 1.45 },
      { dmg: 45, cd: 96, area: 1.6 }
    ]
  },
  estocada: {
    name: "Lanza", desc: "Una estocada larga que atraviesa a todos los de la línea.",
    levels: [
      { dmg: 14, cd: 70, count: 1, area: 1 },
      { dmg: 18, cd: 66, count: 1, area: 1.1 },
      { dmg: 21, cd: 62, count: 2, area: 1.15 },
      { dmg: 25, cd: 58, count: 2, area: 1.25 },
      { dmg: 29, cd: 54, count: 3, area: 1.3 },
      { dmg: 36, cd: 48, count: 3, area: 1.45 }
    ]
  },
  guantes: {
    name: "Guantes de boxeo", desc: "Combos de puñetazos al enemigo más cercano. El último golpe empuja muy fuerte.",
    levels: [
      { dmg: 11, cd: 58, count: 2, area: 1 },
      { dmg: 14, cd: 55, count: 2, area: 1.1 },
      { dmg: 16, cd: 52, count: 3, area: 1.15 },
      { dmg: 19, cd: 48, count: 3, area: 1.25 },
      { dmg: 22, cd: 45, count: 4, area: 1.3 },
      { dmg: 27, cd: 40, count: 5, area: 1.45 }
    ]
  },
  punos: {
    name: "Puñetazos", desc: "Puñetazos tan fuertes que sueltan una onda hacia delante que atraviesa a todos.",
    levels: [
      { dmg: 16, cd: 62, count: 1, area: 1, speed: 4.2 },
      { dmg: 20, cd: 58, count: 1, area: 1.1, speed: 4.4 },
      { dmg: 23, cd: 54, count: 2, area: 1.15, speed: 4.6 },
      { dmg: 27, cd: 50, count: 2, area: 1.25, speed: 4.8 },
      { dmg: 32, cd: 46, count: 3, area: 1.3, speed: 5 },
      { dmg: 40, cd: 40, count: 3, area: 1.45, speed: 5.2 }
    ]
  },
  hacha: {
    name: "Hacha", desc: "Lanza un hacha que va y vuelve atravesando a todos.",
    levels: [
      { dmg: 14, cd: 80, count: 1, area: 1 },
      { dmg: 17, cd: 76, count: 1, area: 1.1 },
      { dmg: 20, cd: 72, count: 2, area: 1.15 },
      { dmg: 24, cd: 68, count: 2, area: 1.2 },
      { dmg: 28, cd: 64, count: 3, area: 1.3 },
      { dmg: 34, cd: 58, count: 3, area: 1.4 }
    ]
  },
  rayo: {
    name: "Tridente", desc: "Un rayo que salta de un enemigo a otro.",
    levels: [
      { dmg: 13, cd: 72, count: 3 },
      { dmg: 16, cd: 68, count: 4 },
      { dmg: 19, cd: 64, count: 5 },
      { dmg: 22, cd: 60, count: 6 },
      { dmg: 26, cd: 56, count: 7 },
      { dmg: 32, cd: 50, count: 9 }
    ]
  },
  petardo: {
    name: "Petardos", desc: "Lanza petardos que explotan entre los enemigos.",
    levels: [
      { dmg: 18, cd: 96, count: 1, area: 1 },
      { dmg: 22, cd: 92, count: 2, area: 1.05 },
      { dmg: 26, cd: 88, count: 2, area: 1.15 },
      { dmg: 30, cd: 84, count: 3, area: 1.2 },
      { dmg: 35, cd: 78, count: 3, area: 1.3 },
      { dmg: 42, cd: 70, count: 4, area: 1.4 }
    ]
  },
  colonia: {
    name: "Colonia", desc: "Una nube apestosa a tu alrededor que daña y frena a los enemigos.",
    levels: [
      { dmg: 4, cd: 24, area: 1 },
      { dmg: 5, cd: 23, area: 1.1 },
      { dmg: 6, cd: 22, area: 1.2 },
      { dmg: 7, cd: 21, area: 1.3 },
      { dmg: 9, cd: 20, area: 1.4 },
      { dmg: 11, cd: 18, area: 1.55 }
    ]
  },
  balon: {
    name: "Balón", desc: "Un balón que rebota de enemigo en enemigo.",
    levels: [
      { dmg: 11, cd: 90, count: 1, pierce: 4, speed: 4.5 },
      { dmg: 13, cd: 86, count: 1, pierce: 5, speed: 4.6 },
      { dmg: 15, cd: 82, count: 2, pierce: 5, speed: 4.8 },
      { dmg: 17, cd: 78, count: 2, pierce: 6, speed: 5 },
      { dmg: 20, cd: 72, count: 2, pierce: 7, speed: 5.2 },
      { dmg: 24, cd: 66, count: 3, pierce: 8, speed: 5.4 }
    ]
  },
  copos: {
    name: "Copos", desc: "Copos de hielo en todas direcciones que congelan a los enemigos.",
    levels: [
      { dmg: 8, cd: 100, count: 6, speed: 3.6 },
      { dmg: 10, cd: 96, count: 7, speed: 3.8 },
      { dmg: 12, cd: 92, count: 8, speed: 4 },
      { dmg: 14, cd: 88, count: 9, speed: 4.2 },
      { dmg: 16, cd: 82, count: 10, speed: 4.4 },
      { dmg: 20, cd: 74, count: 12, speed: 4.6 }
    ]
  },
  kunai: {
    name: "Kunais", desc: "Kunais muy rápidos hacia donde te mueves.",
    levels: [
      { dmg: 7, cd: 34, count: 1, pierce: 1, speed: 7 },
      { dmg: 8, cd: 32, count: 2, pierce: 1, speed: 7 },
      { dmg: 9, cd: 30, count: 2, pierce: 2, speed: 7.5 },
      { dmg: 11, cd: 28, count: 3, pierce: 2, speed: 7.5 },
      { dmg: 12, cd: 26, count: 3, pierce: 3, speed: 8 },
      { dmg: 15, cd: 22, count: 4, pierce: 3, speed: 8 }
    ]
  },
  meteoro: {
    name: "Meteoritos", desc: "Caen meteoritos del cielo sobre los enemigos.",
    levels: [
      { dmg: 26, cd: 140, count: 1, area: 1 },
      { dmg: 30, cd: 132, count: 2, area: 1.05 },
      { dmg: 35, cd: 124, count: 2, area: 1.15 },
      { dmg: 40, cd: 116, count: 3, area: 1.2 },
      { dmg: 46, cd: 108, count: 3, area: 1.3 },
      { dmg: 56, cd: 96, count: 4, area: 1.45 }
    ]
  },
  dron: {
    name: "Dron láser", desc: "Un dron te sigue y dispara un láser que lo atraviesa todo.",
    levels: [
      { dmg: 12, cd: 78, count: 1, area: 1 },
      { dmg: 15, cd: 74, count: 1, area: 1.1 },
      { dmg: 17, cd: 70, count: 2, area: 1.1 },
      { dmg: 20, cd: 66, count: 2, area: 1.2 },
      { dmg: 24, cd: 60, count: 2, area: 1.3 },
      { dmg: 29, cd: 54, count: 3, area: 1.4 }
    ]
  },
  tornado: {
    name: "Tornado", desc: "Tornados que van de un lado a otro arrastrando a los enemigos.",
    levels: [
      { dmg: 6, cd: 190, count: 1, area: 1, dur: 240 },
      { dmg: 7, cd: 180, count: 1, area: 1.1, dur: 260 },
      { dmg: 8, cd: 170, count: 2, area: 1.15, dur: 280 },
      { dmg: 10, cd: 160, count: 2, area: 1.25, dur: 300 },
      { dmg: 11, cd: 150, count: 3, area: 1.3, dur: 320 },
      { dmg: 14, cd: 136, count: 3, area: 1.45, dur: 360 }
    ]
  }
};
TS.MAX_WEAPONS = 4;
TS.MAX_PASSIVES = 4;

/* ---------- OBJETOS PASIVOS (se eligen al subir de nivel) ---------- */
TS.PASSIVES = {
  corazon: { name: "Corazón", desc: "+20 % de vida máxima", max: 5, stat: "maxHp", per: 0.2 },
  zapatillas: { name: "Zapatillas", desc: "+10 % de velocidad", max: 5, stat: "speed", per: 0.1 },
  iman: { name: "Imán", desc: "+30 % de radio para recoger cosas", max: 5, stat: "magnet", per: 0.3 },
  musculo: { name: "Pesas", desc: "+10 % de daño", max: 5, stat: "might", per: 0.1 },
  reloj: { name: "Reloj", desc: "Las armas se recargan un 8 % antes", max: 5, stat: "cooldown", per: 0.08 },
  escudo: { name: "Escudo", desc: "+1 de armadura (quita daño de cada golpe)", max: 5, stat: "armor", per: 1 },
  tirita: { name: "Tiritas", desc: "Recupera 0,3 de vida por segundo", max: 5, stat: "regen", per: 0.3 },
  lupa: { name: "Lupa", desc: "+10 % de área de las armas", max: 5, stat: "area", per: 0.1 },
  trebol: { name: "Trébol", desc: "+20 % de monedas", max: 5, stat: "greed", per: 0.2 },
  libro: { name: "Libro", desc: "+10 % de experiencia", max: 5, stat: "growth", per: 0.1 },
  clon: { name: "Fotocopiadora", desc: "+1 proyectil en todas las armas", max: 2, stat: "amount", per: 1 }
};

/* ---------- TIENDA (mejoras para siempre, se pagan con monedas) ---------- */
TS.SHOP = [
  { id: "vida", name: "Vida", desc: "+8 % de vida en cada partida", max: 5, stat: "maxHp", per: 0.08, cost: 120 },
  { id: "dano", name: "Fuerza", desc: "+5 % de daño", max: 5, stat: "might", per: 0.05, cost: 150 },
  { id: "velocidad", name: "Velocidad", desc: "+4 % de velocidad", max: 5, stat: "speed", per: 0.04, cost: 120 },
  { id: "iman", name: "Imán", desc: "+10 % de radio para recoger", max: 5, stat: "magnet", per: 0.1, cost: 90 },
  { id: "armadura", name: "Armadura", desc: "+1 de armadura", max: 3, stat: "armor", per: 1, cost: 220 },
  { id: "monedas", name: "Avaricia", desc: "+10 % de monedas", max: 5, stat: "greed", per: 0.1, cost: 160 },
  { id: "experiencia", name: "Estudio", desc: "+6 % de experiencia", max: 5, stat: "growth", per: 0.06, cost: 140 },
  { id: "revivir", name: "Segunda vida", desc: "Revives una vez por partida con la mitad de vida", max: 1, stat: "revive", per: 1, cost: 900 }
];

/* ---------- ENEMIGOS ----------
   hp, speed (por fotograma), dmg (por golpe), xp (gema que suelta),
   r (radio), ai: cómo se mueve. */
TS.ENEMIES = {
  zombi: { name: "Zombi", hp: 10, speed: 0.55, dmg: 6, xp: 1, r: 6, ai: "chase" },
  corredor: { name: "Zombi corredor", hp: 8, speed: 1.05, dmg: 5, xp: 1, r: 6, ai: "chase" },
  murcielago: { name: "Murciélago", hp: 5, speed: 1.25, dmg: 4, xp: 1, r: 5, ai: "erratic", flying: true },
  gordo: { name: "Zombi gordo", hp: 70, speed: 0.38, dmg: 12, xp: 5, r: 10, ai: "chase", heavy: true },
  casco: { name: "Zombi con casco", hp: 34, speed: 0.6, dmg: 8, xp: 3, r: 6, ai: "chase", armor: 3 },
  antitronk: { name: "Antitronk", hp: 18, speed: 0.7, dmg: 6, xp: 3, r: 6, ai: "ranged", range: 120, shot: { cd: 150, speed: 2.1, dmg: 8 } },
  slime: { name: "Moco", hp: 22, speed: 0.6, dmg: 6, xp: 2, r: 7, ai: "hop", split: "slimito" },
  slimito: { name: "Moquito", hp: 7, speed: 0.85, dmg: 4, xp: 1, r: 4, ai: "hop" },
  ninja: { name: "Ninja", hp: 22, speed: 0.8, dmg: 8, xp: 3, r: 6, ai: "dash", dodge: 0.2 },
  esqueleto: { name: "Esqueleto", hp: 30, speed: 0.72, dmg: 9, xp: 3, r: 6, ai: "chase" },
  bomba: { name: "Zombi bomba", hp: 16, speed: 1.0, dmg: 18, xp: 2, r: 6, ai: "kamikaze" },
  fantasma: { name: "Fantasma", hp: 26, speed: 0.75, dmg: 8, xp: 3, r: 6, ai: "phase", flying: true },
  brujo: { name: "Brujo antitronk", hp: 55, speed: 0.5, dmg: 8, xp: 8, r: 7, ai: "summoner", range: 140 },
  // Objetos que se rompen (no atacan ni se mueven): sueltan premios
  barril: { name: "Barril", hp: 1, speed: 0, dmg: 0, xp: 0, r: 8, ai: "prop", prop: true },
  caja: { name: "Caja", hp: 1, speed: 0, dmg: 0, xp: 0, r: 8, ai: "prop", prop: true },
  jarron: { name: "Jarrón", hp: 1, speed: 0, dmg: 0, xp: 0, r: 6, ai: "prop", prop: true },
  brasero: { name: "Brasero", hp: 1, speed: 0, dmg: 0, xp: 0, r: 6, ai: "prop", prop: true },
  // Jefes
  gigante: { name: "Zombi Gigante", hp: 1400, speed: 0.5, dmg: 18, xp: 60, r: 20, ai: "boss_stomp", boss: true, scale: 2, sprite: "gordo" },
  supremo: { name: "Antitronk Supremo", hp: 2600, speed: 0.6, dmg: 16, xp: 90, r: 16, ai: "boss_bullets", boss: true, scale: 2, sprite: "supremo" },
  maestro: { name: "Maestro Ninja", hp: 4200, speed: 0.9, dmg: 20, xp: 120, r: 15, ai: "boss_ninja", boss: true, scale: 2, sprite: "maestro" },
  rey: { name: "El Rey Zombi", hp: 9000, speed: 0.55, dmg: 26, xp: 200, r: 22, ai: "boss_king", boss: true, scale: 3, sprite: "rey" }
};

/* ---------- OLEADAS ----------
   Según el segundo de la partida: qué enemigos salen (con su peso),
   cada cuántos fotogramas y cuántos a la vez como mucho. */
TS.RUN_SECONDS = 600; // a los 10 minutos sale el Rey Zombi
TS.WAVES = [
  { from: 0, every: 46, alive: 45, mix: { zombi: 10, murcielago: 2 } },
  { from: 45, every: 34, alive: 80, mix: { zombi: 7, corredor: 3, murcielago: 3 } },
  { from: 90, every: 28, alive: 110, mix: { zombi: 6, corredor: 3, murcielago: 2, antitronk: 2, slime: 2 } },
  { from: 150, every: 24, alive: 140, mix: { zombi: 4, corredor: 3, gordo: 1, antitronk: 3, slime: 2, casco: 2 } },
  { from: 240, every: 22, alive: 170, mix: { corredor: 4, gordo: 2, antitronk: 3, ninja: 2, casco: 2, bomba: 1, murcielago: 2 } },
  { from: 300, every: 20, alive: 200, mix: { corredor: 3, gordo: 2, antitronk: 3, ninja: 3, esqueleto: 3, bomba: 2, fantasma: 1 } },
  { from: 390, every: 18, alive: 230, mix: { esqueleto: 4, ninja: 3, gordo: 2, antitronk: 3, fantasma: 2, bomba: 2, brujo: 1, slime: 2 } },
  { from: 480, every: 16, alive: 260, mix: { esqueleto: 4, ninja: 4, casco: 3, gordo: 3, antitronk: 3, fantasma: 3, bomba: 2, brujo: 2 } },
  { from: 560, every: 14, alive: 290, mix: { esqueleto: 4, ninja: 4, casco: 3, gordo: 3, antitronk: 4, fantasma: 3, bomba: 3, brujo: 2, corredor: 3 } }
];
TS.BOSSES = [
  { at: 150, id: "gigante" },
  { at: 300, id: "supremo" },
  { at: 450, id: "maestro" },
  { at: 600, id: "rey" }
];
// Hordas: un círculo de enemigos alrededor del jugador
TS.HORDES = [
  { at: 70, id: "murcielago", count: 26 },
  { at: 200, id: "zombi", count: 34 },
  { at: 270, id: "murcielago", count: 40 },
  { at: 360, id: "esqueleto", count: 30 },
  { at: 420, id: "bomba", count: 16 },
  { at: 520, id: "fantasma", count: 30 },
  { at: 580, id: "corredor", count: 50 }
];

/* ---------- COFRE (gacha con monedas del juego, sin dinero real) ---------- */
TS.GACHA = {
  cost1: 150,
  cost10: 1350,
  pity: 60, // a las 60 tiradas sin legendario, sale uno seguro
  maxStars: 5, // los repetidos suben estrellas (+5 % de daño y vida cada una)
  refund: { comun: 20, raro: 45, epico: 90, legendario: 200 } // repetido con 5 estrellas → monedas
};
