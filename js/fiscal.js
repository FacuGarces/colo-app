// ===================================================================
// fiscal.js — lógica de la página del fiscal
// ===================================================================

let currentUrna = null; // urna que se está editando en el modal

// ---------------- Identidad (MVP sin OAuth) ----------------
function renderIdentity() {
  const id = Identity.get();
  const idSection = document.getElementById("identitySection");
  const fSection = document.getElementById("fiscalSection");
  const badge = document.getElementById("fiscalBadge");
  if (id && id.nombre && id.email) {
    idSection.classList.add("hidden");
    fSection.classList.remove("hidden");
    badge.classList.remove("hidden");
    document.getElementById("fiscalBadgeName").textContent = id.nombre;
    loadUrnas();
  } else {
    idSection.classList.remove("hidden");
    fSection.classList.add("hidden");
    badge.classList.add("hidden");
  }
}

document.getElementById("identityForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = document.getElementById("fNombre").value.trim();
  const email = document.getElementById("fEmail").value.trim().toLowerCase();
  if (!nombre || !email) return;
  Identity.set({ nombre, email });
  toast(`Bienvenido, ${nombre}`, "ok");
  renderIdentity();
});

document.getElementById("btnLogout").addEventListener("click", () => {
  if (!confirm("¿Cerrar identidad? Vas a tener que volver a cargar nombre y mail.")) return;
  Identity.clear();
  renderIdentity();
});

// ---------------- Abrir urna: selects + preview ----------------
function fillOpenerSelects() {
  const selCarrera = document.getElementById("urnaCarrera");
  const selDia = document.getElementById("urnaDia");
  selCarrera.innerHTML = CARRERAS.map(c => `<option value="${c}">${c}</option>`).join("");
  selDia.innerHTML = DIAS.map(d => `<option value="${d.id}">${d.label}</option>`).join("");

  // Preseleccionar día actual si coincide
  const today = new Date().getDay(); // 0=dom, 1=lun...
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

function updateIdPreview() {
  const c = document.getElementById("urnaCarrera").value;
  const d = document.getElementById("urnaDia").value;
  const n = document.getElementById("urnaNumero").value;
  const id = buildUrnaId(c, d, n);
  document.getElementById("previewId").textContent = id || "—";
}

function updateNowLabel() {
  const now = new Date();
  document.getElementById("nowLabel").textContent =
    now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase() +
    " · " +
    now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// Abrir urna
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
    fiscal: Identity.get(),
  };
  const btn = e.currentTarget;
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Abriendo...';
  try {
    await API.abrirUrna(urna);
    toast(`Urna ${urna.urna_id} abierta`, "ok");
    document.getElementById("urnaNumero").value = "";
    await loadUrnas();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    btn.disabled = false; btn.innerHTML = "<span>Abrir urna</span>";
  }
});

// ---------------- Listar urnas del fiscal ----------------
async function loadUrnas() {
  const id = Identity.get();
  if (!id) return;
  const listEl = document.getElementById("urnasList");
  const emptyEl = document.getElementById("urnasEmpty");
  listEl.innerHTML = '<div class="text-dim text-mono">Cargando...</div>';
  emptyEl.classList.add("hidden");
  try {
    const urnas = await API.listarUrnas({ fiscal_email: id.email });
    renderUrnasList(urnas);
  } catch (err) {
    listEl.innerHTML = `<div class="validation warn">${err.message}</div>`;
  }
}

function renderUrnasList(urnas) {
  const listEl = document.getElementById("urnasList");
  const emptyEl = document.getElementById("urnasEmpty");
  if (!urnas || urnas.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  listEl.innerHTML = urnas.map(u => `
    <div class="urna-card" data-id="${u.urna_id}">
      <div class="urna-card-title">${u.carrera} · U${String(u.numero).padStart(2,"0")}</div>
      <div class="urna-card-meta">
        <span class="chip">${u.dia_label || u.dia}</span>
        <span class="chip state-${u.estado || 'abierta'}">${u.estado || 'abierta'}</span>
      </div>
      <div class="text-mono text-dim" style="font-size:0.7rem;">${u.urna_id}</div>
    </div>`).join("");
  listEl.querySelectorAll(".urna-card").forEach(card => {
    card.addEventListener("click", () => openRecuentoModal(card.dataset.id));
  });
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
  }
}

function renderRecuentoForm(urna) {
  document.getElementById("modalTitle").textContent =
    `${urna.carrera} · Urna ${String(urna.numero).padStart(2,"0")}`;
  document.getElementById("modalSubtitle").textContent =
    `${urna.dia_label || urna.dia} · ID ${urna.urna_id}`;

  const body = document.getElementById("modalBody");
  body.innerHTML = CATEGORIAS.map(cat => renderCategoriaBlock(cat, urna)).join("") +
    `<div id="validationHost"></div>`;

  // Listener en todos los inputs para validar en vivo
  body.querySelectorAll("input.num").forEach(inp => {
    inp.addEventListener("input", validateTotals);
  });
  validateTotals();
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
        <div class="field">
          <input type="number" min="0" class="num" data-cat="${cat.id}" data-field="${l.id}"
                 name="${fieldName}" value="${value}" placeholder="0" />
        </div>
      </div>`;
  }).join("");

  const extrasHTML = CAMPOS_EXTRA.map(f => {
    const fieldName = `${cat.id}_${f.id}`;
    const value = urna[fieldName] || "";
    return `
      <div class="field">
        <label for="${fieldName}">${f.label}</label>
        <input type="number" min="0" class="num" data-cat="${cat.id}" data-field="${f.id}"
               id="${fieldName}" name="${fieldName}" value="${value}" placeholder="0" />
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

function validateTotals() {
  // Chequea por cada categoría que suma(votos lista) + blancos + nulos + impugnados + recurridos === total_sobres
  const host = document.getElementById("validationHost");
  if (!host) return;
  const msgs = [];
  CATEGORIAS.forEach(cat => {
    let sumaListas = 0;
    LISTAS.forEach(l => {
      const v = toInt(document.querySelector(`input[name="${cat.id}_${l.id}"]`)?.value);
      sumaListas += v;
    });
    const blancos = toInt(document.querySelector(`input[name="${cat.id}_blancos"]`)?.value);
    const nulos = toInt(document.querySelector(`input[name="${cat.id}_nulos"]`)?.value);
    const imp = toInt(document.querySelector(`input[name="${cat.id}_impugnados"]`)?.value);
    const rec = toInt(document.querySelector(`input[name="${cat.id}_recurridos"]`)?.value);
    const sobres = toInt(document.querySelector(`input[name="${cat.id}_total_sobres"]`)?.value);
    const total = sumaListas + blancos + nulos + imp + rec;
    if (sobres > 0 || total > 0) {
      if (sobres !== total) {
        msgs.push({
          type: "warn",
          text: `${cat.label}: suma listas+blancos+nulos+imp+rec = ${total}, pero total sobres = ${sobres}. Diferencia: ${sobres - total}`
        });
      } else if (total > 0) {
        msgs.push({ type: "ok", text: `${cat.label}: cuadra ✓ (${total} votos)` });
      }
    }
  });
  host.innerHTML = msgs.map(m => `<div class="validation ${m.type}">${m.text}</div>`).join("");
}

// Cerrar modal
function closeModal() {
  document.getElementById("modalRecuento").classList.remove("open");
  currentUrna = null;
}
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("btnCancelar").addEventListener("click", closeModal);
document.getElementById("modalRecuento").addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-bg")) closeModal();
});

// Guardar recuento
document.getElementById("btnGuardar").addEventListener("click", async (e) => {
  if (!currentUrna) return;
  const datos = {};
  document.querySelectorAll("#modalBody input.num").forEach(inp => {
    datos[inp.name] = toInt(inp.value);
  });
  const btn = e.currentTarget;
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Guardando...';
  try {
    await API.guardarRecuento(currentUrna.urna_id, datos, Identity.get());
    toast("Recuento guardado", "ok");
    closeModal();
    loadUrnas();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    btn.disabled = false; btn.innerHTML = "Guardar recuento";
  }
});

// Eliminar urna
document.getElementById("btnEliminarUrna").addEventListener("click", async () => {
  if (!currentUrna) return;
  if (!confirm(`¿Eliminar urna ${currentUrna.urna_id}? Esto borra también su recuento.`)) return;
  try {
    await API.eliminarUrna(currentUrna.urna_id);
    toast("Urna eliminada", "ok");
    closeModal();
    loadUrnas();
  } catch (err) {
    toast(err.message, "err");
  }
});

// ---------------- Init ----------------
fillOpenerSelects();
updateNowLabel();
setInterval(updateNowLabel, 30000);
renderIdentity();
