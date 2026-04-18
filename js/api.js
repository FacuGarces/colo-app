// ===================================================================
// api.js — wrapper para la Web App de Apps Script
// Apps Script no soporta bien CORS con headers custom, por eso usamos
// text/plain como Content-Type: el preflight no se dispara.
// ===================================================================

async function apiCall(action, payload = {}) {
  if (!API_URL || API_URL.includes("REEMPLAZAR")) {
    throw new Error("API_URL no configurada. Editá js/config.js con la URL de tu Apps Script Web App.");
  }
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Error desconocido");
  return data.result;
}

// API pública ------------------------------------------------------------
const API = {
  listarUrnas: (filtros = {}) => apiCall("listarUrnas", { filtros }),
  abrirUrna:   (urna) => apiCall("abrirUrna", { urna }),
  guardarRecuento: (urna_id, datos, fiscal) => apiCall("guardarRecuento", { urna_id, datos, fiscal }),
  eliminarUrna: (urna_id) => apiCall("eliminarUrna", { urna_id }),
  obtenerUrna: (urna_id) => apiCall("obtenerUrna", { urna_id }),
  totales: (filtros = {}) => apiCall("totales", { filtros }),
};

// Identidad local (MVP sin OAuth) ----------------------------------------
const Identity = {
  get() {
    try { return JSON.parse(localStorage.getItem("colo.fiscal") || "null"); }
    catch { return null; }
  },
  set(identity) {
    localStorage.setItem("colo.fiscal", JSON.stringify(identity));
  },
  clear() { localStorage.removeItem("colo.fiscal"); },
  isAdmin(identity) {
    if (!identity || !identity.email) return false;
    return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(identity.email.toLowerCase());
  }
};

// Toasts -----------------------------------------------------------------
function toast(msg, type = "info") {
  let host = document.querySelector(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => { t.style.opacity = 0; t.style.transform = "translateX(20px)"; }, 3500);
  setTimeout(() => t.remove(), 3800);
}

// Helpers numéricos ------------------------------------------------------
function toInt(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : Math.max(0, n); }
function fmt(n) { return Number(n || 0).toLocaleString("es-AR"); }
function pct(n, total) { if (!total) return 0; return (n / total) * 100; }

function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
