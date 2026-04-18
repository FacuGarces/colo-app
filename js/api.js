// ===================================================================
// api.js — wrapper de Apps Script + Google Sign-In
// La identidad ahora viene de Google OAuth (ID token JWT).
// El backend valida el token en cada request y determina si es admin.
// ===================================================================

// ---------------- API (incluye idToken en cada llamada) ----------------
async function apiCall(action, payload = {}) {
  if (!API_URL || API_URL.includes("REEMPLAZAR")) {
    throw new Error("API_URL no configurada. Editá js/config.js.");
  }
  const idToken = Session.getIdToken();
  if (!idToken) {
    throw new Error("AUTH_REQUIRED: no hay sesión activa");
  }
  const body = JSON.stringify({ action, idToken, ...payload });
  const res = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(data.error || "Error desconocido");
    err.code = data.code;
    throw err;
  }
  return data.result;
}

const API = {
  whoami:          ()                       => apiCall("whoami"),
  listarUrnas:     (filtros = {})           => apiCall("listarUrnas", { filtros }),
  abrirUrna:       (urna)                   => apiCall("abrirUrna", { urna }),
  guardarRecuento: (urna_id, datos)         => apiCall("guardarRecuento", { urna_id, datos }),
  eliminarUrna:    (urna_id)                => apiCall("eliminarUrna", { urna_id }),
  obtenerUrna:     (urna_id)                => apiCall("obtenerUrna", { urna_id }),
  totales:         (filtros = {})           => apiCall("totales", { filtros }),
};

// ---------------- Google Session ----------------
const Session = {
  _initialized: false,
  _onChangeHandlers: [],

  getIdToken() {
    const stored = localStorage.getItem("colo.idToken");
    if (!stored) return null;
    try {
      const profile = JSON.parse(localStorage.getItem("colo.profile") || "null");
      // Chequear expiración (exp en segundos desde epoch)
      if (profile && profile.exp && profile.exp * 1000 < Date.now()) {
        this.clear();
        return null;
      }
      return stored;
    } catch { return null; }
  },

  getProfile() {
    const token = this.getIdToken();
    if (!token) return null;
    try { return JSON.parse(localStorage.getItem("colo.profile") || "null"); }
    catch { return null; }
  },

  isActive() { return !!this.getIdToken(); },

  set(idToken) {
    localStorage.setItem("colo.idToken", idToken);
    const profile = decodeJwt(idToken);
    localStorage.setItem("colo.profile", JSON.stringify(profile));
    this._emit();
  },

  clear() {
    localStorage.removeItem("colo.idToken");
    localStorage.removeItem("colo.profile");
    // también disable auto-select en Google
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    this._emit();
  },

  onChange(cb) { this._onChangeHandlers.push(cb); },
  _emit() { this._onChangeHandlers.forEach(h => { try { h(); } catch(e) { console.error(e); } }); },

  /**
   * Inicializa GSI (Google Identity Services) y renderiza el botón de sign-in
   * en el contenedor dado.
   */
  async initSignInButton(containerId) {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("REEMPLAZAR")) {
      document.getElementById(containerId).innerHTML =
        '<div class="validation warn">GOOGLE_CLIENT_ID no configurado. Editá <code>js/config.js</code>.</div>';
      return;
    }
    await waitForGoogle();
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        Session.set(response.credential);
      },
      auto_select: true,
      cancel_on_tap_outside: false,
    });
    const el = document.getElementById(containerId);
    el.innerHTML = "";
    window.google.accounts.id.renderButton(el, {
      theme: "filled_black",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: Math.min(360, el.offsetWidth || 340),
    });
    // Mostrar One Tap también, por si ya está logueado en Google
    window.google.accounts.id.prompt();
    this._initialized = true;
  },
};

// Espera a que el SDK de Google esté cargado
function waitForGoogle(maxMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tick() {
      if (window.google?.accounts?.id) return resolve();
      if (Date.now() - start > maxMs) return reject(new Error("Google SDK no cargó"));
      setTimeout(tick, 100);
    })();
  });
}

// Decodifica el payload de un JWT (sin validar firma — eso lo hace el backend)
function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64).split("").map(c =>
        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
      ).join("")
    );
    return JSON.parse(json);
  } catch { return null; }
}

// ---------------- Toasts ----------------
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

// Manejo global de errores de autenticación
function handleApiError(err) {
  if (err.code === "AUTH_REQUIRED" || String(err.message).includes("AUTH_REQUIRED")) {
    toast("Tu sesión expiró. Volvé a iniciar sesión.", "err");
    Session.clear();
    return;
  }
  if (err.code === "FORBIDDEN") {
    toast("No tenés permisos para esta acción.", "err");
    return;
  }
  toast(err.message || String(err), "err");
}

// ---------------- Helpers numéricos ----------------
function toInt(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : Math.max(0, n); }
function fmt(n) { return Number(n || 0).toLocaleString("es-AR"); }
function pct(n, total) { if (!total) return 0; return (n / total) * 100; }
function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
