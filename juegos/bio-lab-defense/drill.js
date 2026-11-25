import { specializations, upgradeCost } from "./engine.js?v=33";

// Clone the complete state together so references between routes, towers and shots survive.
// The mission definition contains medal predicates and is read-only during combat.
export function startDrill(match, upgrade = null) {
  if (match.state !== "build" || match.power?.first === null) return null;
  const { mission, ...state } = match;
  const simulation = Object.assign(Object.create(Object.getPrototypeOf(match)), structuredClone(state), { mission });
  if (upgrade) {
    const tower = simulation.towers[upgrade.towerIndex];
    if (!tower || !simulation.upgrade(tower, upgrade.choice)) return null;
  }
  return simulation.startWave() ? simulation : null;
}

function waveResult(simulation) {
  const objectiveLost = simulation.console?.hp === 0 ||
    simulation.archive?.some(terminal => terminal.hp === 0);
  const leaks = simulation.waveLeaks.lanes.reduce((total, count) => total + count, 0);
  const outcome = objectiveLost ? "Objetivo perdido" : simulation.hp <= 0 ? "Núcleo perdido" : "Oleada contenida";
  return { hp: simulation.hp, atp: simulation.atp, leaks, outcome };
}

export function attachDrill(dialog, board, getMatch, selectTower) {
  const title = dialog.querySelector("h2");
  const intro = dialog.querySelector(".drill-intro");
  const normalIntro = intro.textContent;
  const result = dialog.querySelector("[role=status]");
  const lanes = dialog.querySelector("ul");
  const performancePanel = dialog.querySelector(".drill-towers");
  const towerList = performancePanel.querySelector("ol");
  const compare = dialog.querySelector(".drill-comparison");
  const gapHint = dialog.querySelector(".drill-gap");
  const upgradeComparison = dialog.querySelector(".drill-upgrades");
  const upgradeTitle = upgradeComparison.querySelector("caption");
  const upgradeRows = upgradeComparison.querySelector("tbody");
  let frame;
  let previous;

  function open(tower = null) {
    const match = getMatch();
    const sim = startDrill(match);
    if (!sim) return;
    const scenarios = [{ simulation: sim, label: "Defensa actual" }];
    const towerIndex = match.towers.indexOf(tower);
    if (towerIndex >= 0 && tower.rank < 3) {
      const labels = tower.rank === 1 ? ["Nivel 2"] : specializations(tower).map(branch => branch.name);
      for (const [choice, label] of labels.entries()) {
        const simulation = startDrill(match, { towerIndex, choice });
        if (simulation) scenarios.push({ simulation, label: `${label} · ${upgradeCost(tower)} ATP` });
      }
    }
    const comparing = scenarios.length > 1;
    cancelAnimationFrame(frame);
    const wave = sim.wave;
    const startingHP = sim.hp;
    title.textContent = `Ensayo de la oleada ${wave}`;
    intro.textContent = comparing
      ? "La misma oleada con tu defensa actual y cada mejora disponible."
      : normalIntro;
    result.textContent = comparing ? "Simulando la defensa actual y las mejoras…" : "Simulando el combate…";
    upgradeComparison.hidden = true;
    upgradeRows.replaceChildren();
    lanes.replaceChildren();
    performancePanel.hidden = true;
    performancePanel.open = false;
    compare.hidden = true;
    gapHint.hidden = true;
    dialog.showModal();
    const staticMap = matchMedia("(prefers-reduced-motion: reduce)").matches;
    board.draw(sim, null, null, null, true, false);

    function advance() {
      if (!dialog.open) return;
      const deadline = performance.now() + 7;
      for (let i = 0; i < 90 && performance.now() < deadline; i++) {
        let active = false;
        for (const { simulation } of scenarios) {
          if (simulation.state !== "wave") continue;
          simulation.tick();
          active = true;
        }
        if (!active) break;
      }
      const finished = scenarios.every(({ simulation }) => simulation.state !== "wave");
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
      const current = waveResult(sim);
      result.textContent = `${current.outcome} · Núcleo ${startingHP} % → ${current.hp} %`;
      if (comparing) {
        upgradeTitle.textContent = `${tower.name} · Nivel ${tower.rank}`;
        for (const { simulation, label } of scenarios) {
          const { outcome, hp, atp, leaks } = waveResult(simulation);
          const row = upgradeRows.insertRow();
          const name = document.createElement("th");
          name.scope = "row";
          name.textContent = label;
          const tested = simulation.towers[towerIndex];
          const contribution = document.createElement("small");
          contribution.className = "drill-contribution";
          contribution.textContent = tested.type === "eco"
            ? `${tested.produced - tower.produced} ATP generados`
            : `${Math.round(tested.inflicted - tower.inflicted)} de daño`;
          name.append(contribution);
          row.append(name);
          const core = row.insertCell();
          core.textContent = `${hp} %`;
          if (outcome !== "Oleada contenida") {
            const status = document.createElement("small");
            status.textContent = outcome;
            core.append(status);
          }
          row.insertCell().textContent = leaks;
          row.insertCell().textContent = atp.toLocaleString("es-ES");
        }
        upgradeComparison.hidden = false;
      }
      lanes.replaceChildren(...leaks.map((count, lane) => {
        const item = document.createElement("li");
        const names = [...sim.waveLeaks.entries.values()].filter(entry => entry.lane === lane)
          .map(entry => `${entry.count} × ${entry.name}`);
        item.textContent = `Entrada ${lane ? "B" : "A"} · ${count} ${count === 1 ? "fuga" : "fugas"}${names.length ? " · " + names.join(", ") : ""}`;
        return item;
      }));
      performancePanel.hidden = !sim.towers.length;
      const ctx = board.ctx;
      ctx.save();
      ctx.font = "bold 18px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      towerList.replaceChildren(...sim.towers.map((tested, i) => {
        const original = match.towers[i];
        const damage = Math.round(tested.inflicted - original.inflicted);
        const stats = tested.type === "eco" ? [`+${tested.produced - original.produced} ATP`]
          : [`${damage} de daño`, `${tested.defeated - original.defeated} bajas`];
        const slow = tested.slowTicks - original.slowTicks;
        if (slow) stats.push(`${(slow / 60).toLocaleString("es-ES", { maximumFractionDigits: 1 })} s de ralentización acumulada`);
        ctx.fillStyle = "#0c1e32";
        ctx.strokeStyle = tested.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tested.x, tested.y, 13, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(i + 1), tested.x, tested.y);
        const item = document.createElement("li");
        const inspect = document.createElement("button");
        inspect.type = "button";
        inspect.textContent = `${i + 1} · ${tested.name} · Rango ${tested.rank}`;
        inspect.setAttribute("aria-label", `Seleccionar ${tested.name}, torre ${i + 1}`);
        inspect.onclick = () => {
          dialog.close();
          selectTower(original);
        };
        const detail = document.createElement("span");
        detail.textContent = stats.join(" · ");
        item.append(inspect, detail);
        return item;
      }));
      ctx.restore();
      const gaps = [...sim.waveLeaks.gaps.values()].sort((a, b) => b.count - a.count);
      if (gaps.length) {
        const gap = gaps[0];
        gapHint.hidden = false;
        gapHint.textContent = `Los trazos amarillos señalan zonas sin cobertura. En el tramo ${gap.waypoint} de ${gap.lane ? "B" : "A"} pasaron ${gap.count} de los enemigos que llegaron al núcleo.`;
      }
      if (!comparing && previous?.match === match && previous.wave === wave) {
        compare.hidden = false;
        compare.textContent = `Ensayo anterior · ${previous.outcome} · Núcleo ${previous.hp} % · ${previous.leaks} fugas`;
      }
      if (!comparing) previous = { match, wave, ...current };
    }
    frame = requestAnimationFrame(advance);
  }
  dialog.addEventListener("close", () => { if (!dialog.open) cancelAnimationFrame(frame); });
  return open;
}
