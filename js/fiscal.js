// ===================================================================
// fiscal.js — lógica de la página del fiscal con Google OAuth
// ===================================================================

let currentUrna = null;

// ---------------- Identidad (Google OAuth) ----------------
function renderIdentity() {
  const signInSection = document.getElementById("signInSection");
  const fSection = document.getElementById("fiscalSection");
  const badge = document.getElementById("fiscalBadge");
  const profile = Session.getProfile();

  if (Session.isActive() && profile) {
    signInSection.classList.add("hidden");
    fSection.classList.remove("hidden");
    badge.classList.remove("hidden");
    document.getElementById("fiscalBadgeName").textContent =
      profile.given_name || profile.name || profile.email;
    const pic = document.getElementById("fiscalBadgePic");
    if (profile.picture) {
      pic.src = profile.picture;
      pic.style.display = "";
    } else {
      pic.style.display = "none";
    }
    loadUrnas();
  } else {
    signInSection.classList.remove("hidden");
    fSection.classList.add("hidden");
    badge.classList.add("hidden");
    // Renderizar botón de Google
    Session.initSignInButton("googleSignInBtn").catch(err => {
      console.error(err);
      document.getElementById("googleSignInBtn").innerHTML =
        `<div class="validation warn">Error cargando Google Sign-In: ${err.message}</div>`;
    });
  }
}

// Cuando cambia la sesión (login / logout), re-renderizar todo
Session.onChange(renderIdentity);

document.getElementById("btnLogout").addEventListener("click", () => {
  if (!confirm("¿Cerrar sesión?")) return;
  Session.clear();
});

// ---------------- Abrir urna ----------------
function fillOpenerSelects() {
  const selCarrera = document.getElementById("urnaCarrera");
  const selDia = document.getElementById("urnaDia");
  selCarrera.innerHTML = CARRERAS.map(c => `<option value="${c}">${c}</option>`).join("");
  selDia.innerHTML = DIAS.map(d => `<option value="${d.id}">${d.label}</option>`).join("");

  // Preseleccionar día actual si coincide
  const today = new Date().getDay();
  const map = { 1: "lunes", 2: "martes", 3: "miercoles", 4: "jueves", 5: "viernes" };
  if (map[today]) selDia.value = map[today];

  [selCarrera, selDia, document.getElementById("urnaNumero")].forEach(el => {
    el.addEventListener("input", updateIdPreview);
  });
  updateIdPreview();
}

function buildUrnaId(carrera, dia, numero) {
  const n = toInt(numero);
  if (!carrera || !dia || !n) return "";
  return `${slugify(carrera)}-${dia}-${String(n).padStart(2, "0")}`;
}

// Cache de las urnas que el fiscal ya tiene abiertas (para detectar duplicados antes de crearlas)
let urnasCache = [];

function updateIdPreview() {
  const c = document.getElementById("urnaCarrera").value;
  const d = document.getElementById("urnaDia").value;
  const n = document.getElementById("urnaNumero").value;
  const id = buildUrnaId(c, d, n);
  const previewEl = document.getElementById("previewId");
  previewEl.textContent = id || "—";

  // Si el ID ya existe entre mis urnas, mostrar warning visual
  const existe = id && urnasCache.some(u => u.urna_id === id);
  if (existe) {
    previewEl.style.color = "var(--err)";
    previewEl.textContent = id + " ⚠ ya tenés una abierta con ese ID";
  } else {
    previewEl.style.color = "var(--fmed-gold)";
  }
}

function updateNowLabel() {
  const now = new Date();
  document.getElementById("nowLabel").textContent =
    now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase() +
    " · " +
    now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

document.getElementById("btnAbrirUrna").addEventListener("click", async (e) => {
  const carrera = document.getElementById("urnaCarrera").value;
  const dia = document.getElementById("urnaDia").value;
  const numero = toInt(document.getElementById("urnaNumero").value);
  if (!carrera || !dia || !numero) {
    toast("Completá carrera, día y número", "err");
    return;
  }
  const diaLabel = DIAS.find(d => d.id === dia)?.label || dia;
  const urna = {
    urna_id: buildUrnaId(carrera, dia, numero),
    carrera, dia, dia_label: diaLabel, numero,
  };
  const btn = e.currentTarget;
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Abriendo...';
  try {
    await API.abrirUrna(urna);
    toast(`Urna ${urna.urna_id} abierta`, "ok");
    document.getElementById("urnaNumero").value = "";
    await loadUrnas();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.innerHTML = "<span>Abrir urna</span>";
  }
});

// ---------------- Listar urnas ----------------
async function loadUrnas(opts = {}) {
  if (!Session.isActive()) return;
  const listEl = document.getElementById("urnasList");
  const emptyEl = document.getElementById("urnasEmpty");
  // Si es la primera carga, mostrar "Cargando..."; si es un auto-refresh, silencioso
  if (!opts.silent && urnasCache.length === 0) {
    listEl.innerHTML = '<div class="text-dim text-mono">Cargando...</div>';
  }
  emptyEl.classList.add("hidden");
  try {
    const urnas = await API.listarUrnas();
    renderUrnasList(urnas);
    updateLastRefreshLabel();
  } catch (err) {
    if (!opts.silent) {
      listEl.innerHTML = `<div class="validation warn">${err.message}</div>`;
      handleApiError(err);
    } else {
      // En auto-refresh, solo loggear, no interrumpir al fiscal
      console.warn("Auto-refresh falló:", err.message);
    }
  }
}

function updateLastRefreshLabel() {
  const el = document.getElementById("lastRefreshLabel");
  if (!el) return;
  const now = new Date();
  el.textContent = "actualizado " + now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderUrnasList(urnas) {
  // Guardar cache para detección de duplicados en el preview
  urnasCache = urnas || [];
  updateIdPreview(); // actualiza el warning visual si corresponde

  const listEl = document.getElementById("urnasList");
  const emptyEl = document.getElementById("urnasEmpty");
  if (!urnas || urnas.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  listEl.innerHTML = urnas.map(u => {
    const estado = u.estado || 'abierta';
    // Si está abierta y tiene al menos un dato cargado, mostrar "pendiente cerrar"
    const tieneDatos = urnaTieneDatos(u);
    const pendienteChip = estado === "abierta" && tieneDatos
      ? `<span class="chip state-pendiente" title="Con datos cargados pero todavía abierta">⚠ pendiente cerrar</span>`
      : "";
    return `
      <div class="urna-card" data-id="${u.urna_id}">
        <div class="urna-card-title">${u.carrera} · U${String(u.numero).padStart(2,"0")}</div>
        <div class="urna-card-meta">
          <span class="chip">${u.dia_label || u.dia}</span>
          <span class="chip state-${estado}">${estado}</span>
          ${pendienteChip}
        </div>
        <div class="text-mono text-dim" style="font-size:0.7rem;">${u.urna_id}</div>
      </div>`;
  }).join("");
  listEl.querySelectorAll(".urna-card").forEach(card => {
    card.addEventListener("click", () => openRecuentoModal(card.dataset.id));
  });
}

// Chequea si la urna tiene al menos un valor numérico cargado
function urnaTieneDatos(u) {
  for (const cat of CATEGORIAS) {
    for (const l of LISTAS) {
      if (toInt(u[`${cat.id}_${l.id}`]) > 0) return true;
    }
    for (const f of CAMPOS_EXTRA) {
      if (toInt(u[`${cat.id}_${f.id}`]) > 0) return true;
    }
  }
  return false;
}

document.getElementById("btnRefresh").addEventListener("click", loadUrnas);

// ---------------- Modal recuento ----------------
async function openRecuentoModal(urna_id) {
  const modal = document.getElementById("modalRecuento");
  const body = document.getElementById("modalBody");
  document.getElementById("modalTitle").textContent = "Cargando urna...";
  body.innerHTML = '<div class="text-dim text-mono">Obteniendo datos...</div>';
  modal.classList.add("open");
  try {
    const urna = await API.obtenerUrna(urna_id);
    currentUrna = urna;
    renderRecuentoForm(urna);
  } catch (err) {
    body.innerHTML = `<div class="validation warn">${err.message}</div>`;
    handleApiError(err);
  }
}

function renderRecuentoForm(urna) {
  document.getElementById("modalTitle").textContent =
    `${urna.carrera} · Urna ${String(urna.numero).padStart(2,"0")}`;
  document.getElementById("modalSubtitle").textContent =
    `${urna.dia_label || urna.dia} · ID ${urna.urna_id}`;

  const body = document.getElementById("modalBody");
  const cerrada = urna.estado === "cerrada";

  // Banner según estado
  const banner = cerrada
    ? `<div class="validation warn" style="margin-bottom:1rem;">
         🔒 <strong>Esta urna está cerrada.</strong> Los datos son finales. Si necesitás modificarlos, pedile a un admin que la reabra.
       </div>`
    : `<div class="validation ok" style="margin-bottom:1rem;background:rgba(244,196,48,0.08);border-color:rgba(244,196,48,0.3);color:var(--fmed-gold-soft);">
         💡 Recordá apretar <strong>"Cerrar urna"</strong> cuando termines el escrutinio. Si todavía estás cargando, usá <strong>"Guardar"</strong> para ir salvando parcialmente.
       </div>`;

  body.innerHTML = banner + CATEGORIAS.map(cat => renderCategoriaBlock(cat, urna)).join("");

  // Si está cerrada, todos los inputs readonly + botones adecuados
  if (cerrada) {
    body.querySelectorAll("input, button.stepper-btn").forEach(el => {
      if (el.tagName === "INPUT") el.setAttribute("readonly", "readonly");
      if (el.tagName === "BUTTON") el.setAttribute("disabled", "disabled");
    });
  }
  updateFooterForState(cerrada);
}

function updateFooterForState(cerrada) {
  const btnGuardar = document.getElementById("btnGuardar");
  const btnCerrar = document.getElementById("btnCerrarUrna");
  const btnEliminar = document.getElementById("btnEliminarUrna");
  if (cerrada) {
    btnGuardar.classList.add("hidden");
    btnCerrar.classList.add("hidden");
    btnEliminar.classList.add("hidden"); // fiscal no puede eliminar urna cerrada
  } else {
    btnGuardar.classList.remove("hidden");
    btnCerrar.classList.remove("hidden");
    btnEliminar.classList.remove("hidden");
  }
}

function renderCategoriaBlock(cat, urna) {
  const listasHTML = LISTAS.map(l => {
    const fieldName = `${cat.id}_${l.id}`;
    const value = urna[fieldName] || "";
    const destacada = l.destacada ? "destacada" : "";
    return `
      <div class="lista-row ${destacada}" style="--lista-color:${l.color}">
        <img class="logo" src="${l.logo}" alt="Lista ${l.numero}" onerror="this.style.display='none'" />
        <div class="name">
          <div class="num">LISTA ${l.numero}</div>
          <div class="txt">${l.nombre}</div>
        </div>
        ${numInput({ name: fieldName, value })}
      </div>`;
  }).join("");
  const extrasHTML = CAMPOS_EXTRA.map(f => {
    const fieldName = `${cat.id}_${f.id}`;
    const value = urna[fieldName] || "";
    return `
      <div class="field">
        <label>${f.label}</label>
        ${numInput({ name: fieldName, value, id: fieldName })}
      </div>`;
  }).join("");
  return `
    <div class="categoria-block">
      <h3 class="categoria-header">${cat.label}</h3>
      <div class="categoria-sub">${cat.sublabel}</div>
      <div class="listas-grid">${listasHTML}</div>
      <div class="extras-grid">${extrasHTML}</div>
    </div>`;
}

function closeModal() {
  document.getElementById("modalRecuento").classList.remove("open");
  currentUrna = null;
}
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("btnCancelar").addEventListener("click", closeModal);
document.getElementById("modalRecuento").addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-bg")) closeModal();
});

document.getElementById("btnGuardar").addEventListener("click", async (e) => {
  if (!currentUrna) return;
  const datos = {};
  document.querySelectorAll("#modalBody input.num").forEach(inp => {
    datos[inp.name] = toInt(inp.value);
  });
  const btn = e.currentTarget;
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Guardando...';
  try {
    await API.guardarRecuento(currentUrna.urna_id, datos);
    toast("Guardado. Acordate de cerrar la urna cuando termines.", "ok");
    closeModal();
    loadUrnas();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.innerHTML = "💾 Guardar";
  }
});

// Cerrar urna: guarda + cambia estado a "cerrada" con warning fuerte
document.getElementById("btnCerrarUrna").addEventListener("click", async (e) => {
  if (!currentUrna) return;
  const confirmado = confirm(
    "⚠️ ATENCIÓN — ¿Cerrar esta urna?\n\n" +
    "Una vez cerrada:\n" +
    "• Los datos quedan como finales.\n" +
    "• No vas a poder seguir editándola.\n" +
    "• Si necesitás modificarla después, vas a tener que pedirle a un admin de Somos Libres que la reabra.\n\n" +
    "¿Confirmás que terminaste el escrutinio de esta urna?"
  );
  if (!confirmado) return;

  const datos = { estado: "cerrada" };
  document.querySelectorAll("#modalBody input.num").forEach(inp => {
    datos[inp.name] = toInt(inp.value);
  });
  const btn = e.currentTarget;
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Cerrando...';
  try {
    await API.guardarRecuento(currentUrna.urna_id, datos);
    toast("Urna cerrada ✓", "ok");
    closeModal();
    loadUrnas();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.innerHTML = "🔒 Cerrar urna";
  }
});

document.getElementById("btnEliminarUrna").addEventListener("click", async () => {
  if (!currentUrna) return;
  if (!confirm(`¿Eliminar urna ${currentUrna.urna_id}? Esto borra también su recuento.`)) return;
  try {
    await API.eliminarUrna(currentUrna.urna_id);
    toast("Urna eliminada", "ok");
    closeModal();
    loadUrnas();
  } catch (err) {
    handleApiError(err);
  }
});

// ---------------- Auto-refresh (polling cada 15s) ----------------
// Para evitar que 2 fiscales creen la misma urna sin saberlo
let fiscalAutoRefreshTimer = null;

function startFiscalAutoRefresh() {
  if (fiscalAutoRefreshTimer) return;
  fiscalAutoRefreshTimer = setInterval(() => {
    const modalOpen = document.getElementById("modalRecuento")?.classList.contains("open");
    if (!Session.isActive() || modalOpen) return;
    if (document.hidden) return;
    loadUrnas({ silent: true });
  }, 30000); // 30 segundos — balance entre frescura y cuota de Apps Script
}
function stopFiscalAutoRefresh() {
  if (fiscalAutoRefreshTimer) { clearInterval(fiscalAutoRefreshTimer); fiscalAutoRefreshTimer = null; }
}

// Cuando volvés a la pestaña, refrescar inmediatamente
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Session.isActive()) {
    const modalOpen = document.getElementById("modalRecuento")?.classList.contains("open");
    if (!modalOpen) loadUrnas();
  }
});

// ---------------- Init ----------------
fillOpenerSelects();
updateNowLabel();
setInterval(updateNowLabel, 30000);
renderIdentity();
startFiscalAutoRefresh();
