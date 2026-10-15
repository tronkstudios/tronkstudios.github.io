"use strict";

/* TronkStudios · js/community.js
   Estado de las ideas, encuestas, notificaciones y entradas del
   diario guardadas en Supabase. Usa las tablas de
   docs/supabase/comunidad.sql: si todavía no existen, todo esto se
   esconde y la web sigue funcionando como antes.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   DATOS
   ========================================================= */

// Estados de una idea: texto e icono
const SUGGESTION_STATUSES = {
  pending: { label: "Pendiente", icon: "calendar" },
  reviewing: { label: "En estudio", icon: "sparkles" },
  planned: { label: "Planeada", icon: "rocket" },
  done: { label: "Hecha", icon: "check" },
  rejected: { label: "Descartada", icon: "close" }
};

// Icono de cada tipo de notificación
const NOTIFICATION_ICONS = {
  votes: "thumb",
  status: "sparkles",
  reply: "message",
  record: "trophy",
  release: "calendar"
};

// Cada cuánto se miran las notificaciones nuevas (ms)
const NOTIFICATIONS_EVERY = 120000;

// true cuando las tablas de comunidad.sql existen en Supabase
let communityAvailable = false;

let notificationsTimer = null;

/* =========================================================
   ESTADO DE LAS IDEAS (lo usa js/suggestions.js)
   ========================================================= */

function createStatusBadge(status) {
  const info = SUGGESTION_STATUSES[status];

  if (!info) {
    return null;
  }

  const badge = document.createElement("span");
  badge.className = `status-badge status-${status}`;
  setIconText(badge, info.icon, info.label);
  return badge;
}

function createTeamReply(text) {
  const box = document.createElement("div");
  box.className = "team-reply";

  const title = document.createElement("p");
  title.className = "team-reply-title";
  setIconText(title, "shield", "Respuesta del equipo");

  const body = document.createElement("p");
  body.className = "team-reply-text";
  body.textContent = text;

  box.append(title, body);
  return box;
}

/* =========================================================
   ENCUESTAS
   ========================================================= */

async function loadPolls() {
  const box = document.getElementById("polls");
  const list = document.getElementById("polls-list");

  if (!box || !list || !communityAvailable) {
    return;
  }

  const [polls, results, mine] = await Promise.all([
    supabaseClient
      .from("polls")
      .select("id, question, options, closed, created_at")
      .order("closed", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(4),
    supabaseClient.rpc("poll_results"),
    currentUser
      ? supabaseClient.from("poll_votes").select("poll_id, option_index")
      : Promise.resolve({ data: [] })
  ]);

  if (polls.error || !polls.data || !polls.data.length) {
    box.hidden = true;
    return;
  }

  const totals = {};

  (results.data || []).forEach((row) => {
    totals[row.poll_id] = totals[row.poll_id] || {};
    totals[row.poll_id][row.option_index] = Number(row.votes);
  });

  const myVotes = {};

  (mine.data || []).forEach((row) => {
    myVotes[row.poll_id] = row.option_index;
  });

  list.replaceChildren(
    ...polls.data.map((poll) => createPoll(poll, totals[poll.id] || {}, myVotes[poll.id]))
  );
  box.hidden = false;
}

function createPoll(poll, votes, myVote) {
  const card = document.createElement("article");
  card.className = "poll-card";

  const head = document.createElement("div");
  head.className = "poll-head";

  const question = document.createElement("h4");
  question.textContent = poll.question;

  const state = document.createElement("span");
  state.className = poll.closed ? "poll-state is-closed" : "poll-state";
  state.textContent = poll.closed ? "Cerrada" : "Abierta";

  head.append(question, state);
  card.appendChild(head);

  const options = Array.isArray(poll.options) ? poll.options : [];
  const total = options.reduce((sum, _, index) => sum + (votes[index] || 0), 0);
  const showResults = poll.closed || myVote !== undefined;

  const list = document.createElement("div");
  list.className = "poll-options";

  options.forEach((text, index) => {
    const count = votes[index] || 0;
    const percent = total ? Math.round((count / total) * 100) : 0;

    const option = document.createElement("button");
    option.type = "button";
    option.className = "poll-option";
    option.disabled = poll.closed;
    option.setAttribute("aria-pressed", String(myVote === index));

    if (showResults) {
      option.style.setProperty("--percent", `${percent}%`);
      option.classList.add("show-results");
    }

    const label = document.createElement("span");
    label.className = "poll-option-label";

    if (myVote === index) {
      label.appendChild(makeIcon("check"));
    }

    label.append(document.createTextNode(String(text)));
    option.appendChild(label);

    if (showResults) {
      const value = document.createElement("span");
      value.className = "poll-option-value";
      value.textContent = `${percent} %`;
      option.appendChild(value);
    }

    option.addEventListener("click", () => votePoll(poll.id, index));
    list.appendChild(option);
  });

  card.appendChild(list);

  const foot = document.createElement("p");
  foot.className = "poll-foot";
  foot.textContent = `${total} ${total === 1 ? "voto" : "votos"}` +
    (!poll.closed && myVote !== undefined ? " · Puedes cambiar tu voto" : "");
  card.appendChild(foot);

  return card;
}

async function votePoll(pollId, option) {
  if (!currentUser) {
    openAccountForCommunity("Inicia sesión para votar en las encuestas.");
    return;
  }

  const { error } = await supabaseClient.rpc("vote_poll", {
    p_poll: pollId,
    p_option: option
  });

  if (error) {
    console.warn("No se pudo votar:", error.message);
  }

  loadPolls();
}

/* =========================================================
   NOTIFICACIONES (campana de la cabecera)
   ========================================================= */

async function loadNotifications() {
  const button = document.getElementById("notifications-button");
  const count = document.getElementById("notifications-count");

  if (!button || !communityAvailable || !currentUser) {
    if (button) {
      button.hidden = true;
    }
    return [];
  }

  button.hidden = false;

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("id, kind, message, link, read, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("No se pudieron cargar las notificaciones:", error.message);
    return [];
  }

  const unread = (data || []).filter((item) => !item.read).length;

  if (count) {
    count.textContent = unread > 9 ? "9+" : String(unread);
    count.hidden = unread === 0;
  }

  button.setAttribute(
    "aria-label",
    unread ? `Notificaciones: ${unread} sin leer` : "Notificaciones"
  );

  return data || [];
}

function timeAgo(date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 1440) return `hace ${Math.round(minutes / 60)} h`;

  const days = Math.round(minutes / 1440);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

async function toggleNotificationsPanel() {
  const button = document.getElementById("notifications-button");
  const panel = document.getElementById("notifications-panel");

  if (!button || !panel) {
    return;
  }

  if (!panel.hidden) {
    closeNotificationsPanel();
    return;
  }

  const items = await loadNotifications();
  const list = panel.querySelector(".notifications-list");
  list.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "notifications-empty";
    empty.textContent = "No tienes notificaciones todavía.";
    list.appendChild(empty);
  }

  items.forEach((item) => {
    const row = document.createElement("li");

    const link = document.createElement("a");
    link.className = item.read ? "notification" : "notification is-unread";
    link.href = /^#[a-z-]+$/.test(item.link) ? item.link : "#";
    link.appendChild(makeIcon(NOTIFICATION_ICONS[item.kind] || "bell", "icon notification-icon"));

    const text = document.createElement("span");
    text.className = "notification-text";
    text.textContent = item.message;

    const time = document.createElement("span");
    time.className = "notification-time";
    time.textContent = timeAgo(item.created_at);

    text.appendChild(time);
    link.appendChild(text);
    link.addEventListener("click", closeNotificationsPanel);

    row.appendChild(link);
    list.appendChild(row);
  });

  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");

  // Al abrir la lista, todo queda como leído
  if (items.some((item) => !item.read)) {
    await supabaseClient
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUser.id)
      .eq("read", false);

    loadNotifications();
  }
}

function closeNotificationsPanel() {
  const panel = document.getElementById("notifications-panel");
  const button = document.getElementById("notifications-button");

  if (panel && !panel.hidden) {
    panel.hidden = true;
    button?.setAttribute("aria-expanded", "false");
  }
}

function startNotificationsTimer() {
  clearInterval(notificationsTimer);

  if (communityAvailable && currentUser) {
    notificationsTimer = setInterval(() => {
      if (!document.hidden) {
        loadNotifications();
      }
    }, NOTIFICATIONS_EVERY);
  }
}

/* =========================================================
   DIARIO: entradas escritas desde el panel del equipo
   ========================================================= */

async function loadDatabaseNews() {
  if (!communityAvailable) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("news")
    .select("id, published_on, tag, title, body")
    .order("published_on", { ascending: false })
    .limit(30);

  if (!error) {
    addNewsEntries(data || []);
  }
}

/* =========================================================
   ARRANQUE Y CAMBIOS DE SESIÓN
   ========================================================= */

async function checkCommunityAvailable() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from("polls")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      console.warn(
        "TronkStudios: comunidad desactivada (ejecuta docs/supabase/comunidad.sql).",
        error.message
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/* Lo llama js/auth.js al iniciar o cerrar sesión */
async function onCommunityAuthChange() {
  if (!communityAvailable) {
    return;
  }

  closeNotificationsPanel();
  await loadNotifications();
  startNotificationsTimer();
  loadPolls();

  if (typeof checkTeamMember === "function") {
    checkTeamMember();
  }
}

async function initializeCommunity() {
  document.querySelectorAll("[data-community]").forEach((element) => {
    element.hidden = true;
  });

  document
    .getElementById("notifications-button")
    ?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNotificationsPanel();
    });

  // Pulsar fuera o Escape cierra la lista de notificaciones
  document.addEventListener("click", (event) => {
    const panel = document.getElementById("notifications-panel");

    if (panel && !panel.hidden && !panel.contains(event.target)) {
      closeNotificationsPanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNotificationsPanel();
    }
  });

  communityAvailable = await checkCommunityAvailable();

  if (!communityAvailable) {
    return;
  }

  // Los elementos con data-community se ven en cuanto hay tablas.
  // Encuestas, campana y panel del equipo se muestran solos cuando toca.
  document.querySelectorAll("[data-community]").forEach((element) => {
    element.hidden = false;
  });

  // Las ideas vuelven a pintarse con su estado
  if (typeof renderSuggestions === "function" && allSuggestions.length) {
    renderSuggestions(allSuggestions);
  }

  if (!currentUser) {
    currentUser = await getCurrentUser();
  }

  loadDatabaseNews();
  await onCommunityAuthChange();
}
