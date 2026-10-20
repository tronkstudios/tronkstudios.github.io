"use strict";

/* TronkStudios · js/gallery.js
   Galería de fans (tablas y Storage de docs/supabase/galeria.sql):
   - «Dibujo de la semana»: el aprobado más votado de los últimos 7 días.
   - Cuadrícula con los dibujos y capturas aprobados (los primeros en la
     página, el resto en «Mostrar más») y una ficha grande con votos.
   - Subir un dibujo con cuenta: se encoge en el navegador antes de
     subirlo y queda pendiente hasta que el equipo lo aprueba.
   - Pestaña «Galería» del panel del equipo para aprobar o rechazar.
   Se carga como script clásico (ver docs/adr/0002). */

const GALLERY_BUCKET = "fan-art";
const GALLERY_PREVIEW = 8;
const GALLERY_MAX_SIDE = 1600;
const GALLERY_MAX_BYTES = 3 * 1024 * 1024;

const GALLERY_KINDS = {
  drawing: "Dibujo",
  screenshot: "Captura"
};

let galleryAvailable = false;
let galleryItems = [];
let galleryVoted = new Set();
let gallerySort = "votes";

function galleryElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function galleryUrl(path) {
  return supabaseClient.storage.from(GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* =========================================================
   CARGAR
   ========================================================= */

// La galería tiene su propia página: ?vista=galeria (js/view-early.js)
const isGalleryView = document.documentElement.classList.contains("view-gallery");

async function loadGallery() {
  const section = document.getElementById("galeria");

  // En la portada no se carga nada: la galería se abre en su pestaña
  if (!section || !isGalleryView || !isSupabaseConfigured()) {
    return;
  }

  document.title = "Galería de fans | TronkStudios";

  const { data, error } = await supabaseClient
    .from("fan_art")
    .select("id, user_id, title, kind, image_path, votes, created_at, approved_at, status")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(200);

  // Sin galeria.sql ejecutado: la sección no se enseña
  galleryAvailable = !error;
  section.hidden = !galleryAvailable;

  if (error) {
    return;
  }

  galleryItems = data || [];

  await Promise.all([loadGalleryAuthors(galleryItems), loadGalleryVotes()]);
  renderGallery();
}

async function loadGalleryAuthors(items) {
  const ids = [...new Set(items.map((item) => item.user_id))].filter((id) => !suggestionAuthors.has(id));

  if (!ids.length) {
    return;
  }

  const { data } = await supabaseClient.from("profiles").select("id, display_name, avatar").in("id", ids);
  (data || []).forEach((profile) => suggestionAuthors.set(profile.id, profile));
}

async function loadGalleryVotes() {
  galleryVoted = new Set();

  if (!currentUser) {
    return;
  }

  const { data } = await supabaseClient.from("fan_art_votes").select("art_id").eq("user_id", currentUser.id);
  (data || []).forEach((row) => galleryVoted.add(String(row.art_id)));
}

function galleryAuthor(item) {
  return suggestionAuthors.get(item.user_id)?.display_name || "Tronker";
}

/* =========================================================
   PINTAR
   ========================================================= */

function sortedGallery() {
  const items = [...galleryItems];

  if (gallerySort === "votes") {
    items.sort((a, b) => (b.votes || 0) - (a.votes || 0) || String(b.approved_at).localeCompare(String(a.approved_at)));
  }

  return items;
}

function weeklyPick() {
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = galleryItems.filter((item) => new Date(item.approved_at).getTime() >= weekAgo);
  const pool = recent.length ? recent : galleryItems;

  return [...pool].sort((a, b) => (b.votes || 0) - (a.votes || 0) || String(a.approved_at).localeCompare(String(b.approved_at)))[0] || null;
}

function renderGallery() {
  const featured = document.getElementById("gallery-featured");
  const grid = document.getElementById("gallery-grid");
  const more = document.getElementById("gallery-more");

  if (!featured || !grid) {
    return;
  }

  // Dibujo de la semana
  featured.replaceChildren();
  const pick = weeklyPick();
  featured.hidden = !pick;

  if (pick) {
    const card = galleryElement("button", "gallery-featured-card");
    card.type = "button";
    const image = galleryElement("img");
    image.src = galleryUrl(pick.image_path);
    image.alt = pick.title;
    image.loading = "lazy";

    const info = galleryElement("div", "gallery-featured-info");
    const badge = galleryElement("span", "gallery-featured-badge");
    badge.append(makeIcon("trophy"), document.createTextNode(" Dibujo de la semana"));
    info.append(
      badge,
      galleryElement("strong", "gallery-featured-title", pick.title),
      galleryElement("span", "gallery-featured-meta", `de ${galleryAuthor(pick)} · ${pick.votes || 0} ${pick.votes === 1 ? "voto" : "votos"}`)
    );

    card.append(image, info);
    card.addEventListener("click", () => openGalleryItem(pick));
    featured.appendChild(card);
  }

  // Cuadrícula
  const items = sortedGallery();
  grid.replaceChildren();

  if (!items.length) {
    grid.appendChild(galleryElement("p", "gallery-empty", "Todavía no hay dibujos. ¡Sube el primero!"));
  }

  items.slice(0, GALLERY_PREVIEW).forEach((item) => grid.appendChild(galleryTile(item)));

  setShowMoreButton(more, items.length - GALLERY_PREVIEW, "Mostrar más");

  if (more) {
    more.onclick = () =>
      openListModal("gallery", "Galería de fans", `${items.length} ${items.length === 1 ? "dibujo" : "dibujos"}`, galleryFill(items));
  }

  refillListModal("gallery", galleryFill(items));
}

function galleryFill(items) {
  return (content) => {
    const grid = galleryElement("div", "gallery-grid");
    items.forEach((item) => grid.appendChild(galleryTile(item)));
    content.appendChild(grid);
  };
}

function galleryTile(item) {
  const tile = galleryElement("button", "gallery-tile");
  tile.type = "button";
  tile.title = item.title;

  const image = galleryElement("img");
  image.src = galleryUrl(item.image_path);
  image.alt = item.title;
  image.loading = "lazy";

  const caption = galleryElement("span", "gallery-tile-caption");
  caption.append(
    galleryElement("span", "gallery-tile-title", item.title),
    galleryElement("span", "gallery-tile-votes", `♥ ${item.votes || 0}`)
  );

  tile.append(image, caption);
  tile.addEventListener("click", () => openGalleryItem(item));
  return tile;
}

/* =========================================================
   FICHA GRANDE
   ========================================================= */

function openGalleryItem(item) {
  const modal = document.getElementById("art-modal");
  const content = document.getElementById("art-content");

  if (!modal || !content) {
    return;
  }

  content.replaceChildren();

  const image = galleryElement("img", "art-image");
  image.src = galleryUrl(item.image_path);
  image.alt = item.title;

  const head = galleryElement("div", "art-head");
  const title = galleryElement("h2", "art-title", item.title);
  title.id = "art-modal-title";

  const author = galleryElement("button", "art-author profile-link");
  author.type = "button";
  author.append(
    avatarImage(suggestionAuthors.get(item.user_id)?.avatar, "suggestion-avatar"),
    galleryElement("span", "", galleryAuthor(item))
  );
  author.addEventListener("click", () => openProfile(item.user_id));

  const meta = galleryElement(
    "span",
    "art-meta",
    `${GALLERY_KINDS[item.kind] || "Dibujo"} · ${new Date(item.approved_at || item.created_at).toLocaleDateString(currentLocale())}`
  );

  head.append(title, author, meta);

  const actions = galleryElement("div", "art-actions");
  const vote = galleryElement("button", "vote-button art-vote");
  vote.type = "button";

  const paintVote = () => {
    const voted = galleryVoted.has(String(item.id));
    vote.classList.toggle("voted", voted);
    vote.setAttribute("aria-pressed", String(voted));
    setIconText(vote, voted ? "heart-fill" : "heart", `${item.votes || 0}`);
    vote.title = voted ? "Quitar tu voto" : "Votar este dibujo";
  };

  paintVote();

  vote.addEventListener("click", async () => {
    if (!currentUser) {
      openAccountForCommunity("Inicia sesión para votar los dibujos de la galería.");
      return;
    }

    if (currentUser.id === item.user_id) {
      showTronkToast("heart", "No puedes votar tu propio dibujo.");
      return;
    }

    vote.disabled = true;
    const { data, error } = await supabaseClient.rpc("toggle_fan_art_vote", { p_id: item.id });
    vote.disabled = false;

    if (error || !data) {
      console.warn("No se pudo votar el dibujo:", error?.message);
      return;
    }

    item.votes = data.votes;

    if (data.voted) {
      galleryVoted.add(String(item.id));
    } else {
      galleryVoted.delete(String(item.id));
    }

    paintVote();
    renderGallery();
  });

  actions.appendChild(vote);

  const mine = currentUser && currentUser.id === item.user_id;
  const team = typeof isTeamMember !== "undefined" && isTeamMember;

  if (mine || team) {
    const remove = galleryElement("button", "delete-suggestion-button", "Borrar");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm("¿Borrar este dibujo de la galería?")) {
        return;
      }

      await deleteGalleryItem(item);
      closeModal(modal);
      loadGallery();
    });
    actions.appendChild(remove);
  }

  content.append(image, head, actions);
  openModal(modal);
}

async function deleteGalleryItem(item) {
  await supabaseClient.storage.from(GALLERY_BUCKET).remove([item.image_path]);
  const { error } = await supabaseClient.from("fan_art").delete().eq("id", item.id);

  if (error) {
    console.warn("No se pudo borrar el dibujo:", error.message);
  }
}

/* =========================================================
   SUBIR UN DIBUJO
   ========================================================= */

// Encoge la imagen (máx. 1600 px) y la pasa a WebP (o JPEG)
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, GALLERY_MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

      const tryType = (type, quality) =>
        new Promise((done) => canvas.toBlob((blob) => done(blob && blob.type === type ? blob : null), type, quality));

      tryType("image/webp", 0.86)
        .then((blob) => blob || tryType("image/jpeg", 0.86))
        .then((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo preparar la imagen"))));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Ese archivo no es una imagen"));
    };

    image.src = url;
  });
}

function openGalleryUpload() {
  if (!currentUser) {
    openAccountForCommunity("Inicia sesión para subir tus dibujos a la galería.");
    return;
  }

  const modal = document.getElementById("art-upload-modal");
  const form = document.getElementById("art-upload-form");

  if (!modal || !form) {
    return;
  }

  form.reset();
  document.getElementById("art-upload-preview").hidden = true;
  setGalleryUploadMessage("");
  openModal(modal);
  renderMySubmissions();
}

function setGalleryUploadMessage(text, type = "") {
  const message = document.getElementById("art-upload-message");

  if (message) {
    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }
}

async function renderMySubmissions() {
  const box = document.getElementById("art-my-list");

  if (!box || !currentUser) {
    return;
  }

  const { data } = await supabaseClient
    .from("fan_art")
    .select("id, title, status, image_path, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(12);

  box.replaceChildren();

  if (!data || !data.length) {
    return;
  }

  box.appendChild(galleryElement("h3", "art-my-title", "Tus envíos"));
  const list = galleryElement("ul", "art-my");
  const LABELS = { pending: "Esperando revisión", approved: "Publicado", rejected: "No publicado" };

  data.forEach((item) => {
    const row = galleryElement("li", `art-my-item is-${item.status}`);
    const thumb = galleryElement("img");
    thumb.src = galleryUrl(item.image_path);
    thumb.alt = "";
    row.append(thumb, galleryElement("span", "art-my-name", item.title), galleryElement("span", "art-my-status", LABELS[item.status] || item.status));
    list.appendChild(row);
  });

  box.appendChild(list);
}

function initializeGalleryUpload() {
  const form = document.getElementById("art-upload-form");
  const file = document.getElementById("art-upload-file");
  const preview = document.getElementById("art-upload-preview");

  document.getElementById("gallery-upload")?.addEventListener("click", openGalleryUpload);

  document.getElementById("gallery-sort")?.addEventListener("change", (event) => {
    gallerySort = event.target.value;
    renderGallery();
  });

  if (!form || !file) {
    return;
  }

  file.addEventListener("change", () => {
    const chosen = file.files && file.files[0];

    if (!chosen) {
      preview.hidden = true;
      return;
    }

    preview.src = URL.createObjectURL(chosen);
    preview.hidden = false;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const chosen = file.files && file.files[0];
    const title = document.getElementById("art-upload-title").value.trim();
    const kind = document.getElementById("art-upload-kind").value;
    const send = form.querySelector('button[type="submit"]');

    if (!chosen) {
      setGalleryUploadMessage("Elige una imagen.", "error");
      return;
    }

    if (title.length < 2) {
      setGalleryUploadMessage("Ponle un título de al menos 2 letras.", "error");
      return;
    }

    send.disabled = true;
    setGalleryUploadMessage("Preparando la imagen...");

    try {
      const blob = await shrinkImage(chosen);

      if (blob.size > GALLERY_MAX_BYTES) {
        throw new Error("La imagen es demasiado grande (máximo 3 MB).");
      }

      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      const id = window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${currentUser.id}/${id}.${extension}`;

      setGalleryUploadMessage("Subiendo...");

      const upload = await supabaseClient.storage
        .from(GALLERY_BUCKET)
        .upload(path, blob, { contentType: blob.type, upsert: false });

      if (upload.error) {
        throw new Error("No se pudo subir la imagen. Inténtalo de nuevo.");
      }

      const { error } = await supabaseClient.from("fan_art").insert({ title, kind, image_path: path });

      if (error) {
        await supabaseClient.storage.from(GALLERY_BUCKET).remove([path]);
        throw new Error(
          /minuto/.test(error.message)
            ? "Espera un minuto antes de subir otro."
            : /3 envíos/.test(error.message)
              ? "Ya tienes 3 envíos esperando revisión."
              : "No se pudo guardar. Inténtalo de nuevo."
        );
      }

      form.reset();
      preview.hidden = true;
      setGalleryUploadMessage("¡Enviado! El equipo lo revisará y te avisaremos cuando salga en la galería.", "success");
      renderMySubmissions();
    } catch (error) {
      setGalleryUploadMessage(error.message || "No se pudo subir.", "error");
    } finally {
      send.disabled = false;
    }
  });
}

/* =========================================================
   PANEL DEL EQUIPO: pestaña «Galería»
   ========================================================= */

async function renderTeamGallery(content) {
  const { data, error } = await supabaseClient
    .from("fan_art")
    .select("id, user_id, title, kind, image_path, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  content.replaceChildren();

  if (error) {
    content.appendChild(galleryElement("p", "team-empty", "Ejecuta docs/supabase/galeria.sql para activar la galería de fans."));
    return;
  }

  content.appendChild(
    galleryElement("p", "team-help", "Revisa cada envío antes de publicarlo: que sea de TronkStudios, apto para todos y sin datos personales.")
  );

  if (!data.length) {
    content.appendChild(galleryElement("p", "team-empty", "No hay dibujos esperando revisión."));
    return;
  }

  await loadGalleryAuthors(data);

  const list = galleryElement("div", "team-art-list");

  data.forEach((item) => {
    const card = galleryElement("article", "team-art");
    const link = galleryElement("a");
    link.href = galleryUrl(item.image_path);
    link.target = "_blank";
    link.rel = "noopener";
    const image = galleryElement("img");
    image.src = galleryUrl(item.image_path);
    image.alt = item.title;
    link.appendChild(image);

    const info = galleryElement("div", "team-art-info");
    info.append(
      galleryElement("strong", "", item.title),
      galleryElement("span", "", `${GALLERY_KINDS[item.kind] || "Dibujo"} · de ${galleryAuthor(item)}`)
    );

    const buttons = galleryElement("div", "team-art-buttons");
    const approve = galleryElement("button", "primary-button", "Aprobar");
    const reject = galleryElement("button", "secondary-button", "Rechazar");
    approve.type = reject.type = "button";

    const decide = async (status) => {
      approve.disabled = reject.disabled = true;
      const { error: rpcError } = await supabaseClient.rpc("set_fan_art_status", { p_id: item.id, p_status: status });

      if (rpcError) {
        approve.disabled = reject.disabled = false;
        teamMessage("No se pudo cambiar. Inténtalo de nuevo.", "error");
        return;
      }

      // Lo rechazado no se guarda: se borra la imagen
      if (status === "rejected") {
        await supabaseClient.storage.from(GALLERY_BUCKET).remove([item.image_path]);
      }

      card.remove();
      teamMessage(status === "approved" ? "Publicado en la galería." : "Rechazado.", "success");
      loadGallery();
    };

    approve.addEventListener("click", () => decide("approved"));
    reject.addEventListener("click", () => decide("rejected"));
    buttons.append(approve, reject);

    card.append(link, info, buttons);
    list.appendChild(card);
  });

  content.appendChild(list);
}

/* =========================================================
   ARRANQUE
   ========================================================= */

initializeGalleryUpload();
