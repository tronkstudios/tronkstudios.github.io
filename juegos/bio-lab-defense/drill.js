// Clone the complete state together so references between routes, towers and shots survive.
// The mission definition contains medal predicates and is read-only during combat.
export function startDrill(match) {
  if (match.state !== "build" || match.power?.first === null) return null;
  const { mission, ...state } = match;
  const simulation = Object.assign(Object.create(Object.getPrototypeOf(match)), structuredClone(state), { mission });
  return simulation.startWave() ? simulation : null;
}

export function attachDrill(dialog, board, getMatch) {
  const title = dialog.querySelector("h2");
  const result = dialog.querySelector("[role=status]");
  const lanes = dialog.querySelector("ul");
  const compare = dialog.querySelector(".drill-comparison");
  const gapHint = dialog.querySelector(".drill-gap");
  let frame;
  let previous;

  function open() {
    const match = getMatch();
    const sim = startDrill(match);
    if (!sim) return;
    cancelAnimationFrame(frame);
    const wave = sim.wave;
    const startingHP = sim.hp;
    title.textContent = `Ensayo de la oleada ${wave}`;
    result.textContent = "Simulando el combate…";
    lanes.replaceChildren();
    compare.hidden = true;
    gapHint.hidden = true;
    dialog.showModal();
    const staticMap = matchMedia("(prefers-reduced-motion: reduce)").matches;
    board.draw(sim, null, null, null, true, false);

    function advance() {
      if (!dialog.open) return;
      const deadline = performance.now() + 7;
      for (let i = 0; i < 90 && sim.state === "wave" && performance.now() < deadline; i++) sim.tick();
      const finished = sim.state !== "wave";
      if (finished || !staticMap) {
        board.draw(sim, null, null, null, true, false, null, {
          breach: finished && sim.waveLeaks.worst ? sim.waveLeaks : null,
        });
      }
      if (!finished) {
        frame = requestAnimationFrame(advance);
        return;
      }
      const leaks = sim.waveLeaks.lanes;
      const objectiveLost = sim.console?.hp === 0 || sim.archive?.some(terminal => terminal.hp === 0);
      const outcome = objectiveLost ? "Objetivo perdido" : sim.hp <= 0 ? "Núcleo perdido" : "Oleada contenida";
      result.textContent = `${outcome} · Núcleo ${startingHP} % → ${sim.hp} %`;
      lanes.replaceChildren(...leaks.map((count, lane) => {
        const item = document.createElement("li");
        const names = [...sim.waveLeaks.entries.values()].filter(entry => entry.lane === lane)
          .map(entry => `${entry.count} × ${entry.name}`);
        item.textContent = `Entrada ${lane ? "B" : "A"} · ${count} ${count === 1 ? "fuga" : "fugas"}${names.length ? " · " + names.join(", ") : ""}`;
        return item;
      }));
      const gaps = [...sim.waveLeaks.gaps.values()].sort((a, b) => b.count - a.count);
      if (gaps.length) {
        const gap = gaps[0];
        gapHint.hidden = false;
        gapHint.textContent = `Los trazos amarillos señalan zonas sin cobertura. En el tramo ${gap.waypoint} de ${gap.lane ? "B" : "A"} pasaron ${gap.count} de los enemigos que llegaron al núcleo.`;
      }
      if (previous?.match === match && previous.wave === wave) {
        compare.hidden = false;
        compare.textContent = `Ensayo anterior · ${previous.outcome} · Núcleo ${previous.hp} % · ${previous.leaks} fugas`;
      }
      previous = { match, wave, outcome, hp: sim.hp, leaks: leaks.reduce((sum, n) => sum + n, 0) };
    }
    frame = requestAnimationFrame(advance);
  }
  dialog.addEventListener("close", () => { if (!dialog.open) cancelAnimationFrame(frame); });
  return open;
}
