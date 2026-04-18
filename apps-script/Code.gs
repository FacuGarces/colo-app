/**
 * ============================================================================
 * COLO — Backend Apps Script
 * Coordinación de Operaciones Liberales Online
 * Fiscalización de Elecciones FMED UBA
 * ============================================================================
 *
 * DEPLOY (ver docs/SETUP.md para paso a paso):
 *   1) Crear Google Sheet nueva y copiar su ID (de la URL entre /d/ y /edit).
 *   2) Pegar el ID abajo en SHEET_ID.
 *   3) Extensiones → Apps Script → pegar este archivo como Code.gs.
 *   4) Implementar → Implementación nueva → Aplicación web.
 *      - Ejecutar como: yo
 *      - Quién tiene acceso: cualquier persona
 *   5) Copiar la URL de despliegue y pegarla en js/config.js como API_URL.
 *
 * La primera vez que corra, crea automáticamente las solapas y encabezados.
 */

// 👇 REEMPLAZAR por el ID de tu Google Sheet
const SHEET_ID = "11GFt2XNjlTqd6oZMqXBOqfQKSINR5nrDqWXha3ZYRZM";

const SHEET_NAME = "Recuentos";

// Listas (tiene que coincidir con js/config.js)
const LISTA_IDS = ["lista4", "lista8", "lista9", "lista10", "lista12", "lista13", "lista17", "listax"];
const CATEGORIA_IDS = ["cd", "ce"];
const CAMPOS_EXTRA_IDS = ["blancos", "nulos", "impugnados", "recurridos", "total_sobres", "total_votantes"];

// Encabezados base + derivados
const BASE_HEADERS = [
  "urna_id", "carrera", "dia", "dia_label", "numero",
  "estado", "fiscal_nombre", "fiscal_email",
  "fecha_creacion", "fecha_actualizacion", "observaciones"
];

function buildHeaders() {
  const headers = BASE_HEADERS.slice();
  CATEGORIA_IDS.forEach(cat => {
    LISTA_IDS.forEach(l => headers.push(cat + "_" + l));
    CAMPOS_EXTRA_IDS.forEach(f => headers.push(cat + "_" + f));
  });
  return headers;
}

// ----------------------------------------------------------------------------
// Entry points
// ----------------------------------------------------------------------------
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;
    switch (action) {
      case "abrirUrna":        result = abrirUrna(body.urna); break;
      case "guardarRecuento":  result = guardarRecuento(body.urna_id, body.datos, body.fiscal); break;
      case "listarUrnas":      result = listarUrnas(body.filtros || {}); break;
      case "obtenerUrna":      result = obtenerUrna(body.urna_id); break;
      case "eliminarUrna":     result = eliminarUrna(body.urna_id); break;
      case "totales":          result = totales(body.filtros || {}); break;
      default: throw new Error("Acción desconocida: " + action);
    }
    return jsonResponse({ ok: true, result: result });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function doGet(e) {
  // Health check simple (útil para verificar el deploy)
  return jsonResponse({
    ok: true,
    result: {
      name: "COLO Apps Script backend",
      version: "1.0.0",
      sheet_ready: !!getSheet(true)
    }
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------------
// Sheet helpers
// ----------------------------------------------------------------------------
function getSheet(silent) {
  if (!SHEET_ID || SHEET_ID.indexOf("REEMPLAZAR") === 0) {
    if (silent) return null;
    throw new Error("SHEET_ID no configurado en Code.gs");
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  const headers = buildHeaders();
  const existingHeaders = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const needsHeaders = existingHeaders.every(v => v === "" || v == null);
  if (needsHeaders) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0a1929").setFontColor("#f4c430");
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headers.length);
  }
  return sh;
}

function readAll() {
  const sh = getSheet();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return { headers: buildHeaders(), rows: [] };
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const rows = values.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 }; // 1-based + header
    headers.forEach((h, idx) => { if (h) obj[h] = row[idx]; });
    return obj;
  }).filter(r => r.urna_id); // descartar filas vacías
  return { headers: headers, rows: rows };
}

function rowToValues(headers, obj) {
  return headers.map(h => obj[h] !== undefined && obj[h] !== null ? obj[h] : "");
}

function findRowByUrnaId(urna_id) {
  const { headers, rows } = readAll();
  const row = rows.find(r => r.urna_id === urna_id);
  return { headers, row };
}

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------

function abrirUrna(urna) {
  if (!urna || !urna.urna_id) throw new Error("urna.urna_id requerido");
  const { headers, row } = findRowByUrnaId(urna.urna_id);
  if (row) throw new Error("Ya existe una urna con ese ID (" + urna.urna_id + ")");

  const sh = getSheet();
  const now = new Date().toISOString();
  const fiscal = urna.fiscal || {};
  const newRow = {
    urna_id: urna.urna_id,
    carrera: urna.carrera || "",
    dia: urna.dia || "",
    dia_label: urna.dia_label || "",
    numero: urna.numero || "",
    estado: "abierta",
    fiscal_nombre: fiscal.nombre || "",
    fiscal_email: fiscal.email || "",
    fecha_creacion: now,
    fecha_actualizacion: now,
    observaciones: "",
  };
  // inicializar todos los campos numéricos en 0 vacío
  CATEGORIA_IDS.forEach(cat => {
    LISTA_IDS.forEach(l => newRow[cat + "_" + l] = "");
    CAMPOS_EXTRA_IDS.forEach(f => newRow[cat + "_" + f] = "");
  });

  sh.appendRow(rowToValues(headers, newRow));
  return newRow;
}

function guardarRecuento(urna_id, datos, fiscal) {
  if (!urna_id) throw new Error("urna_id requerido");
  const sh = getSheet();
  const { headers, row } = findRowByUrnaId(urna_id);
  if (!row) throw new Error("Urna no encontrada: " + urna_id);

  const now = new Date().toISOString();
  // Merge: actualizar todos los campos numéricos y metadata permitida
  const updated = Object.assign({}, row);
  // Campos numéricos permitidos
  CATEGORIA_IDS.forEach(cat => {
    LISTA_IDS.forEach(l => {
      const k = cat + "_" + l;
      if (datos[k] !== undefined) updated[k] = Number(datos[k]) || 0;
    });
    CAMPOS_EXTRA_IDS.forEach(f => {
      const k = cat + "_" + f;
      if (datos[k] !== undefined) updated[k] = Number(datos[k]) || 0;
    });
  });
  // Metadata opcional
  if (datos.estado !== undefined) updated.estado = String(datos.estado);
  if (datos.observaciones !== undefined) updated.observaciones = String(datos.observaciones);
  if (fiscal && fiscal.nombre) updated.fiscal_nombre = fiscal.nombre;
  if (fiscal && fiscal.email) updated.fiscal_email = fiscal.email;
  updated.fecha_actualizacion = now;

  sh.getRange(row._rowIndex, 1, 1, headers.length).setValues([rowToValues(headers, updated)]);
  delete updated._rowIndex;
  return updated;
}

function listarUrnas(filtros) {
  const { rows } = readAll();
  return rows
    .filter(r => {
      if (filtros.fiscal_email && String(r.fiscal_email).toLowerCase() !== String(filtros.fiscal_email).toLowerCase()) return false;
      if (filtros.carrera && r.carrera !== filtros.carrera) return false;
      if (filtros.dia && r.dia !== filtros.dia) return false;
      if (filtros.estado && (r.estado || "abierta") !== filtros.estado) return false;
      return true;
    })
    .map(r => { const o = Object.assign({}, r); delete o._rowIndex; return o; });
}

function obtenerUrna(urna_id) {
  const { row } = findRowByUrnaId(urna_id);
  if (!row) throw new Error("Urna no encontrada: " + urna_id);
  const o = Object.assign({}, row); delete o._rowIndex;
  return o;
}

function eliminarUrna(urna_id) {
  const sh = getSheet();
  const { row } = findRowByUrnaId(urna_id);
  if (!row) throw new Error("Urna no encontrada: " + urna_id);
  sh.deleteRow(row._rowIndex);
  return { urna_id: urna_id, deleted: true };
}

function totales(filtros) {
  const urnas = listarUrnas(filtros);
  const out = { urnas_count: urnas.length, por_categoria: {} };
  CATEGORIA_IDS.forEach(cat => {
    const catTotals = { listas: {}, blancos: 0, nulos: 0, impugnados: 0, recurridos: 0, total_sobres: 0, total_votantes: 0 };
    LISTA_IDS.forEach(l => catTotals.listas[l] = 0);
    urnas.forEach(u => {
      LISTA_IDS.forEach(l => catTotals.listas[l] += Number(u[cat + "_" + l]) || 0);
      CAMPOS_EXTRA_IDS.forEach(f => catTotals[f] += Number(u[cat + "_" + f]) || 0);
    });
    out.por_categoria[cat] = catTotals;
  });
  return out;
}

// ----------------------------------------------------------------------------
// Setup helper — correr a mano una vez desde el editor de Apps Script
// ----------------------------------------------------------------------------
function setupSheet() {
  const sh = getSheet();
  Logger.log("Sheet OK: " + sh.getName() + " (rows=" + sh.getLastRow() + ", cols=" + sh.getLastColumn() + ")");
}
