"use strict";

/* TronkStudios · js/team-projects.js
   Pestaña «Juegos» del panel del equipo: crear, editar y borrar los
   juegos de «En desarrollo» y «Nuestros juegos» (tabla «projects» de
   docs/supabase/proyectos.sql), con imagen principal, capturas,
   tráiler, plataformas, tiendas y Roblox. La fecha de lanzamiento se
   cambia en la pestaña «Lanzamientos».
   Se carga como script clásico (ver docs/adr/0002). */

const PROJECT_SECTIONS = {
  desarrollo: "En desarrollo",
  juegos: "Nuestros juegos (publicado)"
};

function teamField(labelText, input, hint) {
  const label = teamElement("label", "team-field");
  label.append(document.createTextNode(labelText), input);

  if (hint) {
    label.appendChild(teamElement("small", "team-hint", hint));
  }

  return label;
}

function teamInput(value = "", attrs = {}) {
  const input = document.createElement(attrs.textarea ? "textarea" : "input");

  if (!attrs.textarea) {
    input.type = attrs.type || "text";
  }

  Object.entries(attrs).forEach(([key, val]) => {
    if (!["textarea", "type"].includes(key)) {
      input.setAttribute(key, val);
    }
  });

  input.value = value ?? "";
  return input;
}

function teamSelect(options, value) {
  const select = document.createElement("select");

  Object.entries(options).forEach(([key, label]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    select.appendChild(option);
  });

  select.value = value;
  return select;
}

// Acepta la dirección del vídeo de YouTube o solo su ID
function youtubeId(text) {
  const value = String(text || "").trim();
  const match = value.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,20})/);

  if (match) {
    return match[1];
  }

  return /^[A-Za-z0-9_-]{0,20}$/.test(value) ? value : null;
}

async function uploadProjectImage(file) {
  const blob = await shrinkImage(file);
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const id = window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `juegos/${id}.${extension}`;

  const { error } = await supabaseClient.storage
    .from(PROJECT_MEDIA_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  return path;
}

/* ---------- Lista de juegos ---------- */

async function renderTeamProjects(content) {
  const { data, error } = await supabaseClient
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  content.replaceChildren();

  if (error) {
    content.appendChild(teamElement("p", "team-empty", "Ejecuta docs/supabase/proyectos.sql en Supabase para poder editar los juegos desde aquí."));
    return;
  }

  content.appendChild(
    teamElement(
      "p",
      "team-help",
      "Aquí cambias los juegos de «En desarrollo» y «Nuestros juegos». Los cambios salen en la web al momento. La fecha de lanzamiento se pone en la pestaña «Lanzamientos»."
    )
  );

  content.appendChild(teamButton("primary-button", "sparkles", "Nuevo juego", () => renderTeamProjectForm(content, null)));

  const list = teamElement("div", "team-project-list");

  data.forEach((row) => {
    const card = teamElement("article", "team-project");
    const thumb = document.createElement("img");
    thumb.src = projectMediaUrl(row.image) || "img/icons/icon-192.png";
    thumb.alt = "";

    const info = teamElement("div", "team-project-info");
    info.append(
      teamElement("strong", "", row.title),
      teamElement(
        "span",
        "",
        `${PROJECT_SECTIONS[row.section] || row.section} · ${PROJECT_STATUSES[row.status]?.label || row.status}${row.visible ? "" : " · Oculto"}`
      )
    );

    const actions = teamElement("div", "team-card-actions");
    actions.append(
      teamButton("secondary-button", "edit", "Editar", () => renderTeamProjectForm(content, row)),
      teamButton("danger-button", "trash", "Borrar", async () => {
        if (!window.confirm(`¿Borrar «${row.title}» de la web? No se puede deshacer.`)) {
          return;
        }

        const ok = await teamAction(supabaseClient.from("projects").delete().eq("id", row.id), `«${row.title}» borrado.`);

        if (ok) {
          await loadProjectsFromDb();
          showTeamTab("projects");
        }
      })
    );

    card.append(thumb, info, actions);
    list.appendChild(card);
  });

  content.appendChild(list);
}

/* ---------- Formulario de un juego ---------- */

function renderTeamProjectForm(content, row) {
  const isNew = !row;
  const data = row || {
    id: "",
    title: "",
    section: "desarrollo",
    category: "Juego",
    genre: "",
    platforms: [],
    status: "development",
    people: 1,
    trailer: "",
    description: "",
    image: "",
    image_alt: "",
    gallery: [],
    stores: [],
    roblox_place_id: "",
    sort_order: 10,
    visible: true
  };

  content.replaceChildren();

  const form = teamElement("form", "team-form team-project-form");
  form.noValidate = true;

  form.appendChild(teamElement("h3", "team-form-title", isNew ? "Nuevo juego" : `Editar «${data.title}»`));

  const title = teamInput(data.title, { maxlength: "80", required: "" });
  const id = teamInput(data.id, { maxlength: "60", pattern: "[a-z0-9-]+", placeholder: "por-ejemplo-tronk-racer" });
  id.disabled = !isNew;

  // El identificador se rellena solo a partir del título
  if (isNew) {
    title.addEventListener("input", () => {
      if (!id.dataset.touched) {
        id.value = title.value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60);
      }
    });
    id.addEventListener("input", () => (id.dataset.touched = "1"));
  }

  const section = teamSelect(PROJECT_SECTIONS, data.section);
  const status = teamSelect(
    Object.fromEntries(Object.entries(PROJECT_STATUSES).map(([key, value]) => [key, value.label])),
    data.status
  );
  const category = teamInput(data.category, { maxlength: "40", placeholder: "Roblox, Juego, PC..." });
  const genre = teamInput(data.genre, { maxlength: "120", placeholder: "Acción · Aventura · Cooperativo" });
  const platforms = teamInput((data.platforms || []).join(", "), { placeholder: "PC, Roblox, Móvil" });
  const people = teamInput(data.people, { type: "number", min: "1", max: "500" });
  const trailer = teamInput(data.trailer ? `https://youtu.be/${data.trailer}` : "", { placeholder: "https://youtu.be/..." });
  const description = teamInput(data.description, { textarea: true, rows: "8", maxlength: "6000" });
  const roblox = teamInput(data.roblox_place_id, { inputmode: "numeric", placeholder: "Número de roblox.com/games/NÚMERO/..." });
  const order = teamInput(data.sort_order, { type: "number" });
  const stores = teamInput(
    (data.stores || []).map((store) => `${store.label} | ${store.url}`).join("\n"),
    { textarea: true, rows: "3", placeholder: "Steam | https://store.steampowered.com/app/..." }
  );

  const visibleLabel = teamElement("label", "team-check");
  const visible = document.createElement("input");
  visible.type = "checkbox";
  visible.checked = data.visible !== false;
  visibleLabel.append(visible, document.createTextNode(" Se ve en la web (desmárcalo para ocultarlo)"));

  // Imagen principal
  let imagePath = data.image || "";
  const imagePreview = document.createElement("img");
  imagePreview.className = "team-project-preview";
  imagePreview.alt = "";
  const paintImage = () => {
    imagePreview.src = projectMediaUrl(imagePath);
    imagePreview.hidden = !imagePath;
  };
  paintImage();

  const imageFile = teamInput("", { type: "file", accept: "image/png, image/jpeg, image/webp" });
  imageFile.addEventListener("change", async () => {
    const file = imageFile.files && imageFile.files[0];

    if (!file) {
      return;
    }

    teamMessage("Subiendo imagen...");

    try {
      imagePath = await uploadProjectImage(file);
      paintImage();
      teamMessage("Imagen subida. Recuerda guardar.", "success");
    } catch (error) {
      teamMessage(error.message, "error");
    }
  });

  const imageAlt = teamInput(data.image_alt, { maxlength: "160", placeholder: "Qué se ve en la imagen (para lectores de pantalla)" });

  // Capturas
  let gallery = Array.isArray(data.gallery) ? data.gallery.map((item) => ({ ...item })) : [];
  const galleryBox = teamElement("div", "team-project-gallery");

  const paintGallery = () => {
    galleryBox.replaceChildren();

    gallery.forEach((item, index) => {
      const row = teamElement("div", "team-project-shot");
      const image = document.createElement("img");
      image.src = projectMediaUrl(item.src);
      image.alt = "";
      const caption = teamInput(item.caption || "", { maxlength: "120", placeholder: "Qué se ve" });
      caption.addEventListener("input", () => (item.caption = caption.value));
      const remove = teamButton("secondary-button", "trash", "Quitar", () => {
        gallery.splice(index, 1);
        paintGallery();
      });
      row.append(image, caption, remove);
      galleryBox.appendChild(row);
    });
  };

  paintGallery();

  const galleryFile = teamInput("", { type: "file", accept: "image/png, image/jpeg, image/webp", multiple: "" });
  galleryFile.addEventListener("change", async () => {
    const files = [...(galleryFile.files || [])];

    for (const file of files) {
      teamMessage(`Subiendo ${file.name}...`);

      try {
        gallery.push({ src: await uploadProjectImage(file), caption: "" });
        paintGallery();
      } catch (error) {
        teamMessage(error.message, "error");
        return;
      }
    }

    galleryFile.value = "";
    teamMessage("Capturas subidas. Recuerda guardar.", "success");
  });

  const row1 = teamElement("div", "team-form-row");
  row1.append(teamField("Sección", section), teamField("Fase", status));
  const row2 = teamElement("div", "team-form-row");
  row2.append(teamField("Categoría", category), teamField("Personas en el equipo", people));
  const row3 = teamElement("div", "team-form-row");
  row3.append(teamField("Orden (menor sale antes)", order), teamField("Roblox placeId", roblox, "Solo si ya está publicado en Roblox"));

  form.append(
    teamField("Título", title),
    teamField("Identificador", id, isNew ? "Va en la dirección y no se puede cambiar después" : "No se puede cambiar"),
    row1,
    row2,
    teamField("Géneros", genre),
    teamField("Plataformas (separadas por comas)", platforms, "Vacío = «Por confirmar»"),
    teamField("Descripción", description, "Deja una línea en blanco entre párrafos"),
    teamField("Imagen principal", imageFile),
    imagePreview,
    teamField("Texto de la imagen", imageAlt),
    teamField("Capturas extra", galleryFile),
    galleryBox,
    teamField("Tráiler de YouTube", trailer, "La dirección del vídeo o vacío si no tiene"),
    teamField("Tiendas (una por línea: Nombre | https://...)", stores),
    row3,
    visibleLabel
  );

  const actions = teamElement("div", "team-card-actions");
  const save = teamButton("primary-button", "check", isNew ? "Crear juego" : "Guardar cambios", () => form.requestSubmit());
  const cancel = teamButton("secondary-button", "arrow-left", "Volver", () => showTeamTab("projects"));
  actions.append(save, cancel);
  form.appendChild(actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const trailerId = youtubeId(trailer.value);
    const parsedStores = stores.value
      .split("\n")
      .map((line) => line.split("|").map((part) => part.trim()))
      .filter(([label, url]) => label && url);

    if (!title.value.trim()) {
      teamMessage("Pon un título.", "error");
      return;
    }

    if (!/^[a-z0-9-]{2,60}$/.test(id.value)) {
      teamMessage("El identificador solo puede tener minúsculas, números y guiones.", "error");
      return;
    }

    if (trailerId === null) {
      teamMessage("La dirección del tráiler no es de YouTube.", "error");
      return;
    }

    if (parsedStores.some(([, url]) => !/^https:\/\//.test(url))) {
      teamMessage("Las tiendas tienen que empezar por https://", "error");
      return;
    }

    if (roblox.value && !/^\d{1,20}$/.test(roblox.value.trim())) {
      teamMessage("El placeId de Roblox es solo un número.", "error");
      return;
    }

    const values = {
      title: title.value.trim(),
      section: section.value,
      category: category.value.trim() || "Juego",
      genre: genre.value.trim(),
      platforms: platforms.value.split(",").map((item) => item.trim()).filter(Boolean),
      status: status.value,
      people: Math.min(500, Math.max(1, Number(people.value) || 1)),
      trailer: trailerId,
      description: description.value.trim(),
      image: imagePath,
      image_alt: imageAlt.value.trim(),
      gallery: gallery.map((item) => ({ src: item.src, caption: (item.caption || "").trim() })),
      stores: parsedStores.map(([label, url]) => ({ label, url })),
      roblox_place_id: roblox.value.trim(),
      sort_order: Number(order.value) || 0,
      visible: visible.checked
    };

    const request = isNew
      ? supabaseClient.from("projects").insert({ id: id.value, ...values })
      : supabaseClient.from("projects").update(values).eq("id", data.id);

    const ok = await teamAction(request, isNew ? `«${values.title}» creado.` : "Cambios guardados.");

    if (ok) {
      await loadProjectsFromDb();
      showTeamTab("projects");
    }
  });

  content.appendChild(form);
  title.focus();
}
