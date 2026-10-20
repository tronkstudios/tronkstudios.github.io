"use strict";

/* TronkStudios · js/calendar.js
   Calendario de TronkStudios (tabla de docs/supabase/calendario.sql):
   - Sección «Calendario» con los próximos eventos, agrupados por mes.
   - Cada evento se puede añadir a Google Calendar o descargar (.ics).
   - «Suscribirse»: el calendario entero desde el Worker (/calendar.ics),
     que se actualiza solo en el calendario del móvil.
   - Las fechas de «Lanzamientos» salen solas como eventos.
   - Pestaña «Calendario» del panel del equipo para crear y borrar eventos.
   Se carga como script clásico (ver docs/adr/0002). */

const CALENDAR_KINDS = {
  lanzamiento: { label: "Lanzamiento", icon: "rocket" },
  torneo: { label: "Torneo", icon: "trophy" },
  concurso: { label: "Concurso", icon: "brush" },
  directo: { label: "Directo", icon: "film" },
  evento: { label: "Evento", icon: "calendar" }
};

const CALENDAR_PREVIEW = 6;

let calendarEvents = [];

function calendarElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

/* =========================================================
   CARGAR
   ========================================================= */

async function loadCalendar() {
  const section = document.getElementById("calendario");

  if (!section || !isSupabaseConfigured()) {
    return;
  }

  const since = new Date(Date.now() - 86400000).toISOString();

  const [events, releases] = await Promise.all([
    supabaseClient.from("calendar_events").select("*").gte("starts_at", since).order("starts_at", { ascending: true }).limit(100),
    supabaseClient.from("game_releases").select("project_id, title, release_date")
  ]);

  // Sin calendario.sql: la sección no se enseña
  if (events.error) {
    section.hidden = true;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lanzamientos de los juegos como eventos de día entero
  const launches = (releases.data || [])
    .filter((row) => row.release_date && new Date(`${row.release_date}T00:00:00`) >= today)
    .map((row) => ({
      id: `release-${row.project_id}`,
      title: `Lanzamiento de ${row.title}`,
      kind: "lanzamiento",
      starts_at: `${row.release_date}T00:00:00`,
      ends_at: null,
      all_day: true,
      description: "Fecha prevista (puede cambiar).",
      link: "",
      project: row.project_id
    }));

  calendarEvents = [...events.data, ...launches].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  section.hidden = false;
  renderCalendar();
}

/* =========================================================
   PINTAR
   ========================================================= */

function calendarDateParts(event) {
  const date = new Date(event.starts_at);
  return {
    day: date.toLocaleDateString(currentLocale(), { day: "numeric" }),
    month: date.toLocaleDateString(currentLocale(), { month: "short" }).replace(".", ""),
    weekday: date.toLocaleDateString(currentLocale(), { weekday: "long" }),
    time: event.all_day ? "Todo el día" : date.toLocaleTimeString(currentLocale(), { hour: "2-digit", minute: "2-digit" })
  };
}

function renderCalendar() {
  const list = document.getElementById("calendar-list");
  const more = document.getElementById("calendar-more");

  if (!list) {
    return;
  }

  list.replaceChildren();

  if (!calendarEvents.length) {
    list.appendChild(calendarElement("p", "calendar-empty", "No hay eventos próximos. ¡Vuelve pronto!"));
  }

  calendarEvents.slice(0, CALENDAR_PREVIEW).forEach((event) => list.appendChild(calendarCard(event)));

  setShowMoreButton(more, calendarEvents.length - CALENDAR_PREVIEW, "Mostrar más");

  if (more) {
    more.onclick = () =>
      openListModal("calendar", "Calendario de TronkStudios", `${calendarEvents.length} eventos próximos`, (content) => {
        const box = calendarElement("div", "calendar-list");
        calendarEvents.forEach((event) => box.appendChild(calendarCard(event)));
        content.appendChild(box);
      });
  }
}

function calendarCard(event) {
  const kind = CALENDAR_KINDS[event.kind] || CALENDAR_KINDS.evento;
  const parts = calendarDateParts(event);
  const card = calendarElement("article", `calendar-card kind-${event.kind}`);

  const date = calendarElement("div", "calendar-date");
  date.append(calendarElement("span", "calendar-month", parts.month), calendarElement("strong", "calendar-day", parts.day));

  const body = calendarElement("div", "calendar-body");
  const badge = calendarElement("span", "calendar-kind");
  badge.append(makeIcon(kind.icon), document.createTextNode(` ${kind.label}`));

  body.append(
    badge,
    calendarElement("h3", "calendar-title", event.title),
    calendarElement("p", "calendar-when", `${parts.weekday} · ${parts.time}`)
  );

  if (event.description) {
    body.appendChild(calendarElement("p", "calendar-text", event.description));
  }

  const actions = calendarElement("div", "calendar-actions");

  const google = calendarElement("a", "calendar-button");
  google.href = googleCalendarUrl(event);
  google.target = "_blank";
  google.rel = "noopener";
  google.append(makeIcon("calendar"), document.createTextNode(" Google Calendar"));

  const ics = calendarElement("button", "calendar-button");
  ics.type = "button";
  ics.append(makeIcon("download"), document.createTextNode(" Añadir a mi calendario"));
  ics.addEventListener("click", () => downloadIcs(event));

  actions.append(ics, google);

  if (event.project && typeof openProjectModal === "function") {
    const open = calendarElement("button", "calendar-button");
    open.type = "button";
    open.append(makeIcon("gamepad"), document.createTextNode(" Ver ficha"));
    open.addEventListener("click", () => openProjectModal(event.project));
    actions.appendChild(open);
  } else if (event.link) {
    const link = calendarElement("a", "calendar-button");
    link.href = event.link;
    link.target = "_blank";
    link.rel = "noopener";
    link.append(makeIcon("arrow-right"), document.createTextNode(" Más información"));
    actions.appendChild(link);
  }

  body.appendChild(actions);
  card.append(date, body);
  return card;
}

/* =========================================================
   AÑADIR A UN CALENDARIO
   ========================================================= */

const pad2 = (n) => String(n).padStart(2, "0");

function icsUtc(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}00Z`;
}

function icsDay(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function eventRange(event) {
  const start = new Date(event.starts_at);

  if (event.all_day) {
    const end = event.ends_at ? new Date(event.ends_at) : new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: icsDay(start), end: icsDay(end), allDay: true };
  }

  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 3600000);
  return { start: icsUtc(start), end: icsUtc(end), allDay: false };
}

function googleCalendarUrl(event) {
  const range = eventRange(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${range.start}/${range.end}`,
    details: [event.description, event.link, "https://tronkstudios.github.io/#calendario"].filter(Boolean).join("\n\n")
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsEscape(text) {
  return String(text || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

function downloadIcs(event) {
  const range = eventRange(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TronkStudios//Calendario//ES",
    "BEGIN:VEVENT",
    `UID:${event.id}@tronkstudios.github.io`,
    `DTSTAMP:${icsUtc(new Date())}`,
    range.allDay ? `DTSTART;VALUE=DATE:${range.start}` : `DTSTART:${range.start}`,
    range.allDay ? `DTEND;VALUE=DATE:${range.end}` : `DTEND:${range.end}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape([event.description, event.link].filter(Boolean).join("\n"))}`,
    "URL:https://tronkstudios.github.io/#calendario",
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/* Suscripción al calendario entero (lo sirve el Worker) */
function initializeCalendarSubscribe() {
  const button = document.getElementById("calendar-subscribe");

  if (!button || typeof WORKER_URL === "undefined" || !WORKER_URL) {
    button?.remove();
    return;
  }

  const feed = `${WORKER_URL.replace(/\/$/, "")}/calendar.ics`;
  const webcal = feed.replace(/^https?:/, "webcal:");

  button.addEventListener("click", () => {
    openListModal("calendar-subscribe", "Suscribirse al calendario", "Los eventos nuevos te salen solos", (content) => {
      const box = calendarElement("div", "calendar-subscribe-box");
      const google = calendarElement("a", "primary-button");
      google.href = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
      google.target = "_blank";
      google.rel = "noopener";
      google.textContent = "Añadir a Google Calendar";

      const apple = calendarElement("a", "secondary-button");
      apple.href = webcal;
      apple.textContent = "Calendario del iPhone, Mac u Outlook";

      const copy = calendarElement("button", "secondary-button", "Copiar el enlace");
      copy.type = "button";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(feed);
          copy.textContent = "¡Copiado!";
        } catch {
          window.prompt("Copia este enlace:", feed);
        }
      });

      box.append(
        calendarElement("p", "", "Elige tu calendario. Cuando el equipo añada un torneo, un concurso o un lanzamiento, te aparecerá solo."),
        google,
        apple,
        copy,
        calendarElement("code", "calendar-feed", feed)
      );
      content.appendChild(box);
    });
  });
}

/* =========================================================
   PANEL DEL EQUIPO: pestaña «Calendario»
   ========================================================= */

async function renderTeamCalendar(content) {
  const { data, error } = await supabaseClient
    .from("calendar_events")
    .select("*")
    .gte("starts_at", new Date(Date.now() - 30 * 86400000).toISOString())
    .order("starts_at", { ascending: true });

  content.replaceChildren();

  if (error) {
    content.appendChild(calendarElement("p", "team-empty", "Ejecuta docs/supabase/calendario.sql en Supabase para activar el calendario."));
    return;
  }

  content.appendChild(
    calendarElement("p", "team-help", "Los lanzamientos de la pestaña «Lanzamientos» salen solos. Aquí añades torneos, concursos, directos y otros eventos.")
  );

  // Formulario
  const form = calendarElement("form", "team-form");
  form.noValidate = true;

  const title = document.createElement("input");
  title.maxLength = 100;
  title.placeholder = "Por ejemplo: Torneo de Tronk Fight";

  const kind = document.createElement("select");
  Object.entries(CALENDAR_KINDS).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value.label;
    kind.appendChild(option);
  });
  kind.value = "torneo";

  const day = document.createElement("input");
  day.type = "date";
  const time = document.createElement("input");
  time.type = "time";
  time.value = "18:00";
  const hours = document.createElement("input");
  hours.type = "number";
  hours.min = "0";
  hours.max = "720";
  hours.step = "0.5";
  hours.value = "1";

  const allDayLabel = calendarElement("label", "team-check");
  const allDay = document.createElement("input");
  allDay.type = "checkbox";
  allDay.addEventListener("change", () => {
    time.disabled = allDay.checked;
  });
  allDayLabel.append(allDay, document.createTextNode(" Todo el día"));

  const description = document.createElement("textarea");
  description.rows = 3;
  description.maxLength = 1000;
  const link = document.createElement("input");
  link.type = "url";
  link.placeholder = "https://... (opcional)";

  const row = calendarElement("div", "team-form-row");
  row.append(teamField("Tipo", kind), teamField("Día", day), teamField("Hora", time), teamField("Duración (horas)", hours));

  const save = teamButton("primary-button", "calendar", "Añadir al calendario", () => form.requestSubmit());

  form.append(teamField("Título", title), row, allDayLabel, teamField("Descripción", description), teamField("Enlace", link), save);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (title.value.trim().length < 2 || !day.value) {
      teamMessage("Pon un título y un día.", "error");
      return;
    }

    if (link.value && !/^https:\/\//.test(link.value)) {
      teamMessage("El enlace tiene que empezar por https://", "error");
      return;
    }

    const start = allDay.checked ? new Date(`${day.value}T00:00:00`) : new Date(`${day.value}T${time.value || "00:00"}:00`);
    const length = Number(hours.value) || 0;
    const end = allDay.checked
      ? length > 24 ? new Date(start.getTime() + (Math.ceil(length / 24) - 1) * 86400000) : null
      : length > 0 ? new Date(start.getTime() + length * 3600000) : null;

    const ok = await teamAction(
      supabaseClient.from("calendar_events").insert({
        title: title.value.trim(),
        kind: kind.value,
        starts_at: start.toISOString(),
        ends_at: end ? end.toISOString() : null,
        all_day: allDay.checked,
        description: description.value.trim(),
        link: link.value.trim()
      }),
      "Evento añadido al calendario."
    );

    if (ok) {
      loadCalendar();
      showTeamTab("calendar");
    }
  });

  content.appendChild(form);

  // Lista
  if (!data.length) {
    content.appendChild(calendarElement("p", "team-empty", "Todavía no hay eventos."));
    return;
  }

  data.forEach((event) => {
    const card = calendarElement("article", "team-card");
    const parts = calendarDateParts(event);
    card.append(
      calendarElement("p", "team-card-meta", `${(CALENDAR_KINDS[event.kind] || CALENDAR_KINDS.evento).label} · ${parts.day} ${parts.month} · ${parts.time}`),
      calendarElement("p", "team-card-text", event.title)
    );

    const actions = calendarElement("div", "team-card-actions");
    actions.appendChild(
      teamButton("danger-button", "trash", "Borrar", async () => {
        if (!window.confirm(`¿Borrar «${event.title}» del calendario?`)) {
          return;
        }

        const ok = await teamAction(supabaseClient.from("calendar_events").delete().eq("id", event.id), "Evento borrado.");

        if (ok) {
          loadCalendar();
          showTeamTab("calendar");
        }
      })
    );

    card.appendChild(actions);
    content.appendChild(card);
  });
}
