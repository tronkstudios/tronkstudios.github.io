"use strict";

/* TronkStudios · js/games/miente.js
   Minijuego «El Juego Miente»: reacción y atención.
   Sale una palabra de color («ROJO») escrita en OTRO color, y una regla:
   - OBEDECE A LA PALABRA: pulsa el color que dice la palabra.
   - OBEDECE AL COLOR: pulsa el color en el que está escrita.
   - NI UNO NI OTRO: pulsa un color que no sea ninguno de los dos.
   - ¡NO PULSES NADA!: espera a que se acabe el tiempo.
   La regla cambia cada pocas rondas, y cuanto más aciertas, más miente
   el juego (los botones cambian de sitio y sus nombres no dicen la verdad).
   Se carga como script clásico (ver docs/adr/0002). */

function initializeMienteGame() {
  const card = document.querySelector('[data-minigame="miente"]');
  const modal = document.getElementById("miente-modal");
  const closeButton = document.getElementById("miente-close");
  const game = document.getElementById("miente-game");
  const startButton = document.getElementById("miente-start");
  const overlay = document.getElementById("miente-overlay");
  const overlayTitle = document.getElementById("miente-overlay-title");
  const overlayText = document.getElementById("miente-overlay-text");
  const overlayBox = overlay?.querySelector(".antitronks-overlay-box");
  const hud = modal?.querySelector(".antitronks-hud");
  const scoreElement = document.getElementById("miente-score");
  const recordElement = document.getElementById("miente-record");
  const livesElement = document.getElementById("miente-lives");
  const flash = document.getElementById("miente-hit-flash");
  const ruleElement = document.getElementById("miente-rule");
  const wordElement = document.getElementById("miente-word");
  const timerBar = document.getElementById("miente-timer-bar");
  const buttonsBox = document.getElementById("miente-buttons");
  const message = document.getElementById("miente-message");
  const messageText = document.getElementById("miente-message-text");

  if (!card || !modal || !game || !buttonsBox || !wordElement) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const RECORD_KEY = "miente-record";

  const COLORS = {
    rojo: { name: "ROJO", hex: "#ef4444" },
    azul: { name: "AZUL", hex: "#3b82f6" },
    verde: { name: "VERDE", hex: "#22c55e" },
    amarillo: { name: "AMARILLO", hex: "#facc15" }
  };
  const IDS = Object.keys(COLORS);

  const RULES = {
    palabra: "OBEDECE A LA PALABRA",
    color: "OBEDECE AL COLOR",
    ninguno: "NI UNO NI OTRO",
    nada: "¡NO PULSES NADA!"
  };

  const INTRO_TEXT =
    "Arriba sale la regla y en el centro una palabra de color. «Obedece a la palabra»: pulsa el color que dice. «Obedece al color»: pulsa el color en que está escrita. La regla cambia… y el juego miente cada vez más. Teclas 1-4 o toca los botones.";

  // Dificultad según los aciertos
  const SHUFFLE_FROM = 8; // los botones cambian de sitio
  const TRAP_FROM = 6; // rondas de «¡NO PULSES NADA!»
  const NEITHER_FROM = 12; // regla «NI UNO NI OTRO»
  const LYING_LABELS_FROM = 18; // los nombres de los botones mienten

  /* =======================================================
     ESTADO
     ======================================================= */

  let running = false;
  let paused = false;
  let busy = false; // entre ronda y ronda no se puede pulsar
  let score = 0;
  let lives = 3;
  let streak = 0;
  let bestStreakGame = 0;
  let record = loadRecord();

  let rule = "palabra";
  let roundsLeftInRule = 0;
  let round = null;
  let frame = 0;
  let pausedAt = 0;
  let lastTick = 0;
  let order = [...IDS];

  const buttons = IDS.map((id, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "miente-button";
    button.dataset.slot = String(index);
    button.innerHTML = `<span class="miente-key">${index + 1}</span><span class="miente-label"></span>`;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      press(button.dataset.color);
    });
    buttonsBox.appendChild(button);
    return button;
  });

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function loadRecord() {
    try {
      return Number(localStorage.getItem(RECORD_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveRecord(value) {
    try {
      localStorage.setItem(RECORD_KEY, String(value));
    } catch {
      // Sin almacenamiento: dura hasta recargar
    }
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function shuffle(list) {
    const copy = [...list];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function updateHud() {
    if (scoreElement) scoreElement.textContent = `ACIERTOS: ${score}`;
    if (recordElement) recordElement.textContent = `RÉCORD: ${record}`;
    if (livesElement) livesElement.textContent = `VIDAS: ${lives}`;
  }

  function showMessage(text, time = 700) {
    if (!message || !messageText) {
      return;
    }

    messageText.textContent = text;
    message.classList.add("visible");
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => message.classList.remove("visible"), time);
  }

  // Tiempo para responder: de 3 s a 1,1 s según los aciertos
  const roundTime = () => Math.max(1100, 3000 - score * 55);

  /* =======================================================
     BOTONES Y RONDAS
     ======================================================= */

  function paintButtons() {
    if (score >= SHUFFLE_FROM) {
      order = shuffle(IDS);
    }

    // Desde cierto nivel, el nombre de cada botón es el de otro color
    const labels = score >= LYING_LABELS_FROM ? derange(order) : order;

    buttons.forEach((button, index) => {
      const id = order[index];
      button.dataset.color = id;
      button.style.setProperty("--miente-color", COLORS[id].hex);
      button.querySelector(".miente-label").textContent = COLORS[labels[index]].name;
      button.setAttribute("aria-label", `Botón ${index + 1}`);
      button.classList.remove("is-right", "is-wrong");
    });
  }

  // Desordena sin que ningún elemento quede en su sitio
  function derange(list) {
    let result;

    do {
      result = shuffle(list);
    } while (result.some((item, i) => item === list[i]));

    return result;
  }

  function chooseRule() {
    const options = ["palabra", "color"];

    if (score >= NEITHER_FROM) {
      options.push("ninguno");
    }

    let next;

    do {
      next = pick(options);
    } while (next === rule && options.length > 1);

    return next;
  }

  function nextRound() {
    if (!running) {
      return;
    }

    let changed = false;

    if (roundsLeftInRule <= 0) {
      const first = round === null;
      rule = first ? "palabra" : chooseRule();
      roundsLeftInRule = 4 + Math.floor(Math.random() * 4);
      changed = !first;
    }

    roundsLeftInRule--;

    const word = pick(IDS);
    // Casi siempre miente: la palabra está escrita en otro color
    const ink = Math.random() < 0.78 ? pick(IDS.filter((id) => id !== word)) : word;
    const trap = score >= TRAP_FROM && Math.random() < 0.12;
    const current = trap ? "nada" : rule;

    let answers;

    if (current === "palabra") answers = [word];
    else if (current === "color") answers = [ink];
    else if (current === "ninguno") answers = IDS.filter((id) => id !== word && id !== ink);
    else answers = [];

    paintButtons();

    ruleElement.textContent = RULES[current];
    ruleElement.dataset.rule = current;
    wordElement.textContent = COLORS[word].name;
    wordElement.style.color = COLORS[ink].hex;
    wordElement.classList.remove("is-pop");
    void wordElement.offsetWidth;
    wordElement.classList.add("is-pop");

    const start = () => {
      round = { word, ink, rule: current, answers, duration: roundTime(), start: performance.now() };
      busy = false;
      lastTick = 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };

    if (changed) {
      // Cambio de regla: se avisa y se deja un momento para leerla
      busy = true;
      round = round || {};
      ruleElement.classList.remove("is-changing");
      void ruleElement.offsetWidth;
      ruleElement.classList.add("is-changing");
      showMessage("¡CAMBIO DE REGLA!", 900);
      TronkSound.play("ruleChange");
      timerBar.style.transform = "scaleX(1)";
      setTimeout(() => running && start(), 900);
    } else {
      start();
    }
  }

  function tick(now) {
    if (!running || paused || busy || !round) {
      return;
    }

    const left = 1 - (now - round.start) / round.duration;
    timerBar.style.transform = `scaleX(${Math.max(0, left)})`;
    timerBar.classList.toggle("is-low", left < 0.3);

    // Tic-tac en el último tramo
    if (left < 0.3 && now - lastTick > 260) {
      lastTick = now;
      TronkSound.play("clockTick");
    }

    if (left <= 0) {
      timeUp();
      return;
    }

    frame = requestAnimationFrame(tick);
  }

  function timeUp() {
    if (round.rule === "nada") {
      // Bien: no has pulsado
      correct(null);
    } else {
      wrong(null, "¡SE ACABÓ EL TIEMPO!");
    }
  }

  function press(color) {
    if (!running || paused || busy || !round || !round.answers) {
      return;
    }

    if (round.answers.includes(color)) {
      correct(color);
    } else {
      wrong(color, round.rule === "nada" ? "¡TE HE DICHO QUE NO!" : "¡TE HA ENGAÑADO!");
    }
  }

  function buttonFor(color) {
    return buttons.find((button) => button.dataset.color === color);
  }

  function correct(color) {
    busy = true;
    cancelAnimationFrame(frame);

    score++;
    streak++;
    bestStreakGame = Math.max(bestStreakGame, streak);
    updateHud();
    TronkResults.showStreak(hud, streak);
    TronkSound.play("rightAnswer");

    if (color) {
      buttonFor(color)?.classList.add("is-right");
    } else {
      showMessage("¡BIEN AGUANTADO!", 500);
    }

    if (streak > 0 && streak % 10 === 0) {
      window.TronkMascot?.react("combo");
    }

    setTimeout(nextRound, 220);
  }

  function wrong(color, text) {
    busy = true;
    cancelAnimationFrame(frame);

    lives--;
    streak = 0;
    updateHud();
    TronkResults.showStreak(hud, 0);
    TronkSound.play("wrongAnswer");
    window.TronkMascot?.react(lives === 1 ? "lastLife" : "hurt");
    showMessage(text, 800);

    if (color) {
      buttonFor(color)?.classList.add("is-wrong");
    }

    // Se enseña cuál era la buena
    round.answers.forEach((answer) => buttonFor(answer)?.classList.add("is-right"));

    flash?.classList.add("active");
    setTimeout(() => flash?.classList.remove("active"), 160);

    if (lives <= 0) {
      setTimeout(gameOver, 750);
    } else {
      setTimeout(nextRound, 900);
    }
  }

  /* =======================================================
     PARTIDA
     ======================================================= */

  function resetBoard() {
    order = [...IDS];
    paintButtons();
    ruleElement.textContent = RULES.palabra;
    ruleElement.dataset.rule = "palabra";
    wordElement.textContent = COLORS.rojo.name;
    wordElement.style.color = COLORS.azul.hex;
    timerBar.style.transform = "scaleX(1)";
    timerBar.classList.remove("is-low");
  }

  function startGame() {
    score = 0;
    lives = 3;
    streak = 0;
    bestStreakGame = 0;
    rule = "palabra";
    roundsLeftInRule = 0;
    round = null;
    running = true;
    paused = false;

    updateHud();
    resetBoard();
    overlay?.classList.add("hidden");
    TronkSound.play("start");
    nextRound();
  }

  function gameOver() {
    running = false;
    busy = true;
    cancelAnimationFrame(frame);

    const newRecord = score > record;

    if (newRecord) {
      record = score;
      saveRecord(record);
    }

    // Cuenta, retos y mascota (js/profiles.js, js/challenges.js, js/mascot.js)
    if (score > 0) {
      window.TronkScores?.submit("miente", score);
      window.TronkChallenges?.add("miente", score);
    }

    window.TronkMascot?.react(newRecord && score > 0 ? "record" : "gameover");
    TronkSound.play(newRecord && score > 0 ? "record" : "gameOver");

    updateHud();

    if (overlayTitle) {
      overlayTitle.textContent = "GAME OVER";
    }

    if (overlayText) {
      overlayText.hidden = true;
    }

    const newBestStreak = TronkResults.saveStreak("miente", bestStreakGame);

    TronkResults.render(overlayBox, {
      newRecord: newRecord && score > 0,
      tiles: [
        { label: "Aciertos", value: score, gold: newRecord && score > 0 },
        { label: "Récord", value: record },
        { label: newBestStreak ? "Mejor racha (¡nueva!)" : "Racha de la partida", value: bestStreakGame, gold: newBestStreak }
      ],
      duel: { game: "miente", score }
    });
    TronkResults.showStreak(hud, 0);

    if (startButton) {
      startButton.textContent = "REINTENTAR";
    }

    overlay?.classList.remove("hidden");
    startButton?.focus({ preventScroll: true });
  }

  function resetGame() {
    running = false;
    busy = true;
    cancelAnimationFrame(frame);
    score = 0;
    lives = 3;
    updateHud();
    resetBoard();

    if (overlayTitle) {
      overlayTitle.textContent = "EL JUEGO MIENTE";
    }

    if (overlayText) {
      overlayText.textContent = INTRO_TEXT;
      overlayText.hidden = false;
    }

    TronkResults.render(overlayBox, {
      tiles: [
        record > 0 ? { label: "Tu récord", value: record } : null,
        TronkResults.bestStreak("miente") > 0 ? { label: "Mejor racha", value: TronkResults.bestStreak("miente") } : null
      ],
      duel: { game: "miente" }
    });
    TronkResults.showStreak(hud, 0);

    if (startButton) {
      startButton.textContent = "JUGAR";
    }

    overlay?.classList.remove("hidden");
  }

  function openGame() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("antitronks-open");

    TronkSound.startMusic("quiz");

    resetGame();
    setTimeout(() => startButton?.focus({ preventScroll: true }), 50);
  }

  function closeGame() {
    running = false;
    cancelAnimationFrame(frame);

    TronkSound.stopMusic();

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("antitronks-open");
  }

  /* Si cambias de pestaña (o se activa el modo jefe), el tiempo se para */
  function setPaused(value) {
    if (!running || value === paused) {
      return;
    }

    if (value) {
      paused = true;
      pausedAt = performance.now();
      cancelAnimationFrame(frame);
    } else {
      paused = false;

      if (round && round.start) {
        round.start += performance.now() - pausedAt;
      }

      if (!busy) {
        frame = requestAnimationFrame(tick);
      }
    }
  }

  document.addEventListener("visibilitychange", () => setPaused(document.hidden || window.TronkBossActive));
  window.addEventListener("tronk:boss", () => setPaused(document.hidden || window.TronkBossActive));

  /* =======================================================
     EVENTOS
     ======================================================= */

  card.addEventListener("click", openGame);

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGame();
    }
  });

  closeButton?.addEventListener("click", closeGame);
  // Pulsar fuera del juego no lo cierra: solo la × o la tecla Escape
  startButton?.addEventListener("click", startGame);

  window.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    if (event.key === "Escape") {
      closeGame();
      return;
    }

    // Teclas 1-4 (también en el teclado numérico)
    const slot = ["1", "2", "3", "4"].indexOf(event.key);

    if (slot >= 0 && !event.repeat) {
      event.preventDefault();
      press(buttons[slot].dataset.color);
    }
  });
}
