// ===================================================================
// admin.js — panel admin con Google OAuth
// El check de "es admin" lo hace el backend (whoami) y no el cliente
// ===================================================================

let allUrnas = [];
let autoRefreshTimer = null;
let currentEdit = null;
let adminProfile = null; // { email, name, picture, isAdmin, ... } desde whoami

// ---------------- Gate de admin ----------------
async function renderAdminGate() {
  const signIn = document.getElementById("adminSignIn");
  const notAdmin = document.getElementById("notAdminSection");
  const dash = document.getElementById("adminDashboard");
  const badge = document.getElementById("adminBadge");
  const profile = Session.getProfile();

  if (!Session.isActive() || !profile) {
    // No logueado: mostrar botón de Google
    signIn.classList.remove("hidden");
    notAdmin.classList.add("hidden");
    dash.classList.add("hidden");
    badge.classList.add("hidden");
    Session.initSignInButton("adminSignInBtn").catch(err => {
      console.error(err);
      document.getElementById("adminSignInBtn").innerHTML =
        `<div class="validation warn">Error: ${err.message}</div>`;
    });
    return;
  }

  // Logueado: preguntarle al backend si es admin
  try {
    const who = await API.whoami();
    adminProfile = who;
    if (!who.isAdmin) {
      signIn.classList.add("hidden");
      dash.classList.add("hidden");
      badge.classList.add("hidden");
      notAdmin.classList.remove("hidden");
      document.getElementById("notAdminEmail").textContent = who.email;
      return;
    }
    // Es admin: mostrar dashboard
    signIn.classList.add("hidden");
    notAdmin.classList.add("hidden");
    dash.classList.remove("hidden");
    badge.classList.remove("hidden");
    document.getElementById("adminBadgeName").textContent =
      (profile.given_name || profile.name || profile.email) + " [admin]";
    const pic = document.getElementById("adminBadgePic");
    if (profile.picture) { pic.src = profile.picture; pic.style.display = ""; }
    else { pic.style.display = "none"; }
    initDashboard();
  } catch (err) {
    handleApiError(err);
  }
}

Session.onChange(renderAdminGate);

document.getElementById("btnLogoutAdmin").addEventListener("click", () => {
  if (!confirm("¿Cerrar sesión admin?")) return;
  stopAutoRefresh();
  Session.clear();
});

document.getElementById("btnNotAdminSwitch").addEventListener("click", () => {
  Session.clear();
});

// ---------------- Dashboard init ----------------
let dashboardInited = false;
function initDashboard() {
  if (dashboardInited) { loadAll(); return; }
  dashboardInited = true;

  const selCarrera = document.getElementById("filterCarrera");
  const selDia = document.getElementById("filterDia");
  selCarrera.innerHTML = '<option value="">Todas las carreras</option>' +
    CARRERAS.map(c => `<option value="${c}">${c}</option>`).join("");
  selDia.innerHTML = '<option value="">Todos los días</option>' +
    DIAS.map(d => `<option value="${d.id}">${d.label}</option>`).join("");

  ["filterCarrera","filterDia","filterEstado","filterCategoria"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderAll);
  });
  document.getElementById("btnRefreshAdmin").addEventListener("click", loadAll);
  document.getElementById("btnAutoRefresh").addEventListener("click", toggleAutoRefresh);

  loadAll();
}

async function loadAll() {
  const btn = document.getElementById("btnRefreshAdmin");
  btn.disabled = true;
  const prev = btn.innerHTML;
  btn.innerHTML = '<span class="loader"></span> Cargando';
  try {
    allUrnas = await API.listarUrnas({});
    document.getElementById("lastUpdated").textContent =
      "actualizado " + new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    renderAll();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = prev;
  }
}

function getFilteredUrnas() {
  const c = document.getElementById("filterCarrera").value;
  const d = document.getElementById("filterDia").value;
  const e = document.getElementById("filterEstado").value;
  return allUrnas.filter(u => {
    if (c && u.carrera !== c) return false;
    if (d && u.dia !== d) return false;
    if (e && (u.estado || "abierta") !== e) return false;
    return true;
  });
}

function renderAll() {
  const cat = document.getElementById("filterCategoria").value;
  document.getElementById("resultsCategoryLabel").textContent =
    CATEGORIAS.find(c => c.id === cat)?.label || "";
  const urnas = getFilteredUrnas();
  renderStats(urnas, cat);
  renderResultsTable(urnas, cat);
  renderAdminUrnasList(urnas);
  document.getElementById("urnasCount").textContent = `${urnas.length} urnas`;
}

function renderStats(urnas, cat) {
  const abiertas = urnas.filter(u => (u.estado || "abierta") === "abierta").length;
  const cerradas = urnas.filter(u => u.estado === "cerrada").length;
  let votantes = 0, sobres = 0, otros = 0;
  urnas.forEach(u => {
    votantes += toInt(u[`${cat}_total_votantes`]);
    sobres += toInt(u[`${cat}_total_sobres`]);
    otros += toInt(u[`${cat}_blancos`]) + toInt(u[`${cat}_nulos`])
           + toInt(u[`${cat}_impugnados`]) + toInt(u[`${cat}_recurridos`]);
  });
  document.getElementById("statUrnas").textContent = fmt(urnas.length);
  document.getElementById("statUrnasSub").textContent = `${abiertas} abiertas · ${cerradas} cerradas`;
  document.getElementById("statVotantes").textContent = fmt(votantes);
  document.getElementById("statSobres").textContent = fmt(sobres);
  document.getElementById("statOtros").textContent = fmt(otros);
  const pctOtros = sobres > 0 ? ((otros / sobres) * 100).toFixed(1) : "0.0";
  document.getElementById("statOtrosSub").textContent = `${pctOtros}% sobre sobres totales`;
}

function renderResultsTable(urnas, cat) {
  const rows = LISTAS.map(l => {
    const votos = urnas.reduce((s, u) => s + toInt(u[`${cat}_${l.id}`]), 0);
    return { lista: l, votos };
  });
  const totalListas = rows.reduce((s, r) => s + r.votos, 0);
  rows.sort((a, b) => b.votos - a.votos);

  const tbody = document.querySelector("#resultsTable tbody");
  if (totalListas === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-dim text-mono" style="text-align:center;padding:2rem;">Sin datos cargados todavía</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r, i) => {
    const p = pct(r.votos, totalListas);
    const destacada = r.lista.destacada ? 'style="background:rgba(123,44,191,0.08)"' : "";
    return `
      <tr ${destacada}>
        <td>
          <div class="lista-cell">
            <img src="${r.lista.logo}" alt="" onerror="this.style.display='none'" />
            <div>
              <div style="font-weight:700">Lista ${r.lista.numero} · ${r.lista.nombre}</div>
              <div class="text-mono text-dim" style="font-size:0.7rem;">#${i+1}${r.lista.destacada ? ' · la nuestra' : ''}</div>
            </div>
          </div>
        </td>
        <td class="num" style="font-size:1.05rem;font-weight:700;">${fmt(r.votos)}</td>
        <td class="num">${p.toFixed(1)}%</td>
        <td>
          <div class="pct-bar" style="--lista-color:${r.lista.color}">
            <span style="width:${Math.min(100, p)}%; background:${r.lista.color}"></span>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function renderAdminUrnasList(urnas) {
  const list = document.getElementById("adminUrnasList");
  const empty = document.getElementById("adminUrnasEmpty");
  if (!urnas.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  const sorted = [...urnas].sort((a,b) => (b.fecha_actualizacion || "").localeCompare(a.fecha_actualizacion || ""));
  list.innerHTML = sorted.map(u => `
    <div class="urna-card" data-id="${u.urna_id}">
      <div class="urna-card-title">${u.carrera} · U${String(u.numero).padStart(2,"0")}</div>
      <div class="urna-card-meta">
        <span class="chip">${u.dia_label || u.dia}</span>
        <span class="chip state-${u.estado || 'abierta'}">${u.estado || 'abierta'}</span>
      </div>
      <div class="text-mono text-dim" style="font-size:0.7rem;">${u.urna_id}</div>
      <div class="text-mono text-dim" style="font-size:0.68rem;">fiscal: ${u.fiscal_nombre || '—'}</div>
    </div>`).join("");
  list.querySelectorAll(".urna-card").forEach(c => {
    c.addEventListener("click", () => openEditModal(c.dataset.id));
  });
}

// ---------------- Modal edición ----------------
async function openEditModal(urna_id) {
  const modal = document.getElementById("modalEdit");
  const body = document.getElementById("editBody");
  document.getElementById("editTitle").textContent = "Cargando...";
  body.innerHTML = '<div class="text-dim text-mono">Obteniendo datos...</div>';
  modal.classList.add("open");
  try {
    const urna = await API.obtenerUrna(urna_id);
    currentEdit = urna;
    renderEditForm(urna);
  } catch (err) {
    body.innerHTML = `<div class="validation warn">${err.message}</div>`;
    handleApiError(err);
  }
}

function renderEditForm(urna) {
  document.getElementById("editTitle").textContent =
    `${urna.carrera} · Urna ${String(urna.numero).padStart(2,"0")}`;
  document.getElementById("editSubtitle").textContent =
    `${urna.dia_label || urna.dia} · ID ${urna.urna_id} · fiscal: ${urna.fiscal_nombre || '—'}`;

  const body = document.getElementById("editBody");
  const stateHTML = `
    <div class="field" style="margin-bottom:1.2rem;max-width:280px;">
      <label>Estado de la urna</label>
      <select id="editEstado">
        <option value="abierta" ${(urna.estado || 'abierta')==='abierta'?'selected':''}>Abierta</option>
        <option value="cerrada" ${urna.estado==='cerrada'?'selected':''}>Cerrada (escrutinio listo)</option>
      </select>
    </div>`;
  const catHTML = CATEGORIAS.map(cat => renderEditCategoriaBlock(cat, urna)).join("");
  const obsHTML = `
    <div class="field mt-2">
      <label>Observaciones</label>
      <textarea id="editObs" rows="3" placeholder="Notas sobre la urna, impugnaciones, etc.">${urna.observaciones || ''}</textarea>
    </div>`;
  body.innerHTML = stateHTML + catHTML + obsHTML;
}

function renderEditCategoriaBlock(cat, urna) {
  const listasHTML = LISTAS.map(l => {
    const fieldName = `${cat.id}_${l.id}`;
    return `
      <div class="lista-row ${l.destacada ? 'destacada' : ''}" style="--lista-color:${l.color}">
        <img class="logo" src="${l.logo}" alt="" onerror="this.style.display='none'" />
        <div class="name">
          <div class="num">LISTA ${l.numero}</div>
          <div class="txt">${l.nombre}</div>
        </div>
        <div class="field">
          <input type="number" min="0" class="num" name="${fieldName}" value="${urna[fieldName] || ''}" placeholder="0" />
        </div>
      </div>`;
  }).join("");
  const extrasHTML = CAMPOS_EXTRA.map(f => {
    const fieldName = `${cat.id}_${f.id}`;
    return `
      <div class="field">
        <label>${f.label}</label>
        <input type="number" min="0" class="num" name="${fieldName}" value="${urna[fieldName] || ''}" placeholder="0" />
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

function closeEditModal() {
  document.getElementById("modalEdit").classList.remove("open");
  currentEdit = null;
}
document.getElementById("editClose").addEventListener("click", closeEditModal);
document.getElementById("btnEditCancelar").addEventListener("click", closeEditModal);
document.getElementById("modalEdit").addEventListener("click", e => {
  if (e.target.classList.contains("modal-bg")) closeEditModal();
});

document.getElementById("btnEditGuardar").addEventListener("click", async (e) => {
  if (!currentEdit) return;
  const datos = {
    estado: document.getElementById("editEstado").value,
    observaciones: document.getElementById("editObs").value.trim(),
  };
  document.querySelectorAll("#editBody input.num").forEach(inp => {
    datos[inp.name] = toInt(inp.value);
  });
  const btn = e.currentTarget;
  btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Guardando';
  try {
    await API.guardarRecuento(currentEdit.urna_id, datos);
    toast("Guardado (admin)", "ok");
    closeEditModal();
    loadAll();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.innerHTML = "Guardar cambios";
  }
});

document.getElementById("btnAdminEliminar").addEventListener("click", async () => {
  if (!currentEdit) return;
  if (!confirm(`¿Eliminar urna ${currentEdit.urna_id}? Esta acción es irreversible.`)) return;
  try {
    await API.eliminarUrna(currentEdit.urna_id);
    toast("Urna eliminada", "ok");
    closeEditModal();
    loadAll();
  } catch (err) {
    handleApiError(err);
  }
});

// ---------------- Auto-refresh ----------------
function toggleAutoRefresh() {
  const btn = document.getElementById("btnAutoRefresh");
  if (autoRefreshTimer) {
    stopAutoRefresh();
    btn.textContent = "▶ Auto";
  } else {
    autoRefreshTimer = setInterval(loadAll, 20000);
    btn.innerHTML = "⏸ Auto ON";
    btn.classList.add("btn-primary");
    toast("Auto-refresh activado (cada 20s)", "ok");
  }
}
function stopAutoRefresh() {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  const btn = document.getElementById("btnAutoRefresh");
  btn.classList.remove("btn-primary");
  btn.textContent = "▶ Auto";
}

// Init
renderAdminGate();
