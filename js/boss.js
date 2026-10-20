"use strict";

/* TronkStudios · js/boss.js
   Modo jefe: con la tecla B (o el botón del pie de página) la web se
   tapa al instante con una hoja de cálculo de mentira, se para el
   sonido, los minijuegos se congelan y la pestaña cambia de título e
   icono. Con B o Escape se vuelve a la web tal cual estaba.
   En el móvil no se activa: avisa de que solo funciona en PC.
   Se carga como script clásico (ver docs/adr/0002). */

window.TronkBossActive = false;

const TronkBoss = (() => {
  const SHEET_TITLE = "Presupuesto_T3 - Hoja de cálculo";

  // Icono de hoja de cálculo genérico (cuadrícula verde)
  const SHEET_ICON =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#188038"/><path d="M8 9h16v14H8z" fill="#fff"/><path d="M8 14h16M8 18.5h16M14 9v14" stroke="#188038" stroke-width="1.6"/></svg>'
    );

  const COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

  // Datos aburridos y creíbles
  const ROWS = [
    ["Concepto", "Julio", "Agosto", "Septiembre", "Total T3", "Previsto", "Desviación", "% Ejec."],
    ["Material de oficina", 412.5, 388.2, 455.9],
    ["Licencias de software", 1250, 1250, 1310],
    ["Mantenimiento", 860.4, 912, 798.35],
    ["Transporte", 320.75, 298.1, 344.6],
    ["Formación", 600, 0, 1200],
    ["Suministros", 735.2, 801.45, 760.3],
    ["Telefonía e internet", 289.9, 289.9, 289.9],
    ["Seguros", 1100, 1100, 1100],
    ["Publicidad", 450, 520, 610],
    ["Dietas y viajes", 510.6, 140.2, 690],
    ["Limpieza", 380, 380, 395],
    ["Otros gastos", 145.3, 98.75, 210.4]
  ];
  const BUDGET = [1200, 3800, 2700, 950, 1800, 2300, 870, 3300, 1500, 1300, 1150, 400];

  let sheet = null;
  let savedTitle = "";
  let savedIcon = null;

  const money = (value) =>
    Number(value).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function cell(text, className = "") {
    const td = document.createElement("td");
    td.className = className;
    td.textContent = text;
    return td;
  }

  function build() {
    const root = document.createElement("div");
    root.id = "boss-sheet";
    root.className = "boss-sheet";
    root.setAttribute("data-no-translate", "");
    root.hidden = true;

    // Barra de título y menús
    const top = document.createElement("div");
    top.className = "boss-top";
    top.innerHTML = `
      <div class="boss-file">
        <span class="boss-doc-icon" aria-hidden="true"></span>
        <div>
          <div class="boss-name">Presupuesto_T3</div>
          <div class="boss-menus"><span>Archivo</span><span>Editar</span><span>Ver</span><span>Insertar</span><span>Formato</span><span>Datos</span><span>Herramientas</span><span>Ayuda</span></div>
        </div>
      </div>
      <div class="boss-saved">Todos los cambios se han guardado</div>`;

    const tools = document.createElement("div");
    tools.className = "boss-tools";
    tools.innerHTML =
      '<span>↶</span><span>↷</span><span>🖨</span><i></i><span>100 %</span><i></i><span>€</span><span>%</span><span>.0</span><span>.00</span><i></i><span>Arial</span><span>10</span><i></i><b>B</b><em>I</em><s>S</s><span>A</span><i></i><span>⊞</span><span>≡</span><span>Σ</span>';

    const formula = document.createElement("div");
    formula.className = "boss-formula";
    formula.innerHTML = '<span class="boss-ref">E14</span><span class="boss-fx">fx</span><span class="boss-input">=SUMA(E2:E13)</span>';

    // Tabla
    const wrap = document.createElement("div");
    wrap.className = "boss-grid";
    const table = document.createElement("table");
    const head = document.createElement("tr");
    head.appendChild(cell("", "boss-corner"));
    COLUMNS.forEach((letter) => head.appendChild(cell(letter, "boss-col")));
    table.appendChild(head);

    const totals = [0, 0, 0, 0, 0];

    for (let r = 0; r < 40; r++) {
      const tr = document.createElement("tr");
      tr.appendChild(cell(String(r + 1), "boss-row"));

      const values = new Array(COLUMNS.length).fill("");
      const data = ROWS[r];

      if (r === 0) {
        data.forEach((text, i) => (values[i] = text));
      } else if (data) {
        const sum = data[1] + data[2] + data[3];
        const plan = BUDGET[r - 1];
        values[0] = data[0];
        values[1] = money(data[1]);
        values[2] = money(data[2]);
        values[3] = money(data[3]);
        values[4] = money(sum);
        values[5] = money(plan);
        values[6] = money(sum - plan);
        values[7] = `${Math.round((sum / plan) * 100)} %`;
        totals[0] += data[1];
        totals[1] += data[2];
        totals[2] += data[3];
        totals[3] += sum;
        totals[4] += plan;
      } else if (r === ROWS.length) {
        values[0] = "TOTAL";
        values[1] = money(totals[0]);
        values[2] = money(totals[1]);
        values[3] = money(totals[2]);
        values[4] = money(totals[3]);
        values[5] = money(totals[4]);
        values[6] = money(totals[3] - totals[4]);
        values[7] = `${Math.round((totals[3] / totals[4]) * 100)} %`;
      }

      values.forEach((text, c) => {
        let className = c > 0 && r > 0 ? "boss-num" : "";

        if (r === 0) className = "boss-head";
        if (r === ROWS.length) className += " boss-total";
        if (r === ROWS.length && c === 4) className += " is-selected";

        const td = cell(text, className.trim());
        td.tabIndex = -1;
        tr.appendChild(td);
      });

      table.appendChild(tr);
    }

    // Clic en una celda: se selecciona como en una hoja de verdad
    table.addEventListener("click", (event) => {
      const td = event.target.closest("td");

      if (!td || td.classList.contains("boss-col") || td.classList.contains("boss-row") || td.classList.contains("boss-corner")) {
        return;
      }

      table.querySelectorAll(".is-selected").forEach((el) => el.classList.remove("is-selected"));
      td.classList.add("is-selected");
      const col = COLUMNS[td.cellIndex - 1];
      const row = td.parentElement.rowIndex;
      formula.querySelector(".boss-ref").textContent = `${col}${row}`;
      formula.querySelector(".boss-input").textContent = td.textContent;
    });

    wrap.appendChild(table);

    const tabs = document.createElement("div");
    tabs.className = "boss-tabs";
    tabs.innerHTML = '<span>＋</span><span>☰</span><span class="is-on">Hoja 1</span><span>Resumen</span><span>Datos 2025</span><span class="boss-sum">Suma: ' + money(totals[3]) + "</span>";

    root.append(top, tools, formula, wrap, tabs);
    document.body.appendChild(root);
    return root;
  }

  function setIcon(href) {
    let link = document.querySelector('link[rel="icon"]');

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.href = href;
  }

  // Móvil o tablet (pantalla táctil y sin ratón): el modo jefe no tiene sentido
  function isMobile() {
    return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
  }

  function on() {
    if (window.TronkBossActive) {
      return;
    }

    if (isMobile()) {
      window.showTronkToast?.("chart", "El modo jefe solo funciona en PC.");
      return;
    }

    sheet = sheet || build();
    window.TronkBossActive = true;

    savedTitle = document.title;
    savedIcon = document.querySelector('link[rel="icon"]')?.getAttribute("href") || "favicon.png";
    document.title = SHEET_TITLE;
    setIcon(SHEET_ICON);

    sheet.hidden = false;
    document.body.classList.add("boss-on");
    window.TronkSound?.hold(true);
    document.querySelectorAll("video, audio").forEach((media) => media.pause());
    window.dispatchEvent(new CustomEvent("tronk:boss", { detail: { on: true } }));
  }

  function off() {
    if (!window.TronkBossActive) {
      return;
    }

    window.TronkBossActive = false;
    sheet.hidden = true;
    document.body.classList.remove("boss-on");
    document.title = savedTitle;
    setIcon(savedIcon);
    window.TronkSound?.hold(false);
    window.dispatchEvent(new CustomEvent("tronk:boss", { detail: { on: false } }));
  }

  function toggle() {
    if (window.TronkBossActive) {
      off();
    } else {
      on();
    }
  }

  function isTypingIn(element) {
    return Boolean(element && (element.isContentEditable || /^(input|textarea|select)$/i.test(element.tagName)));
  }

  // B funciona en toda la web, también dentro de los minijuegos
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
        return;
      }

      const isB = event.code === "KeyB" || event.key === "b" || event.key === "B";

      if (window.TronkBossActive && (isB || event.key === "Escape")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        off();
        return;
      }

      if (isB && !isTypingIn(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        on();
      }
    },
    true
  );

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-boss-mode]")) {
      on();
    }
  });

  return { on, off, toggle };
})();

window.TronkBoss = TronkBoss;
