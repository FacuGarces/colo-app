# Setup — Guía paso a paso

De cero a COLO funcionando en producción. Leer entero antes de empezar (tarda ~15 min).

---

## 1) Google Sheet (base de datos)

1. Ir a [sheets.new](https://sheets.new) (tiene que estar con la cuenta de Google que vas a usar como "dueña" del sistema).
2. Nombrarla algo como **COLO · Elecciones FMED 2026**.
3. Copiar el **ID** de la Sheet desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/AQUI_ESTA_EL_ID_LARGO/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^
   ```
4. Guardar ese ID, lo vamos a usar enseguida.

> ⚠️ No hace falta que agregues columnas — las crea el script la primera vez que corre.

---

## 2) Apps Script (backend)

1. En la misma Sheet → menú **Extensiones → Apps Script**.
2. Se abre un editor con un archivo `Code.gs` vacío → **borrar todo** y pegar el contenido de `apps-script/Code.gs` (este repo).
3. Reemplazar la línea:
   ```js
   const SHEET_ID = "REEMPLAZAR_CON_TU_SHEET_ID";
   ```
   por el ID que copiaste en el paso 1.
4. (Opcional pero recomendado) En el panel de la izquierda → ⚙️ **Configuración del proyecto** → tildar **"Mostrar archivo de manifiesto 'appsscript.json' en el editor"** → pegar el contenido de `apps-script/appsscript.json`.
5. Guardar todo (💾 / Ctrl+S).
6. Con `Code.gs` abierto, elegir la función `setupSheet` del dropdown de arriba y apretar **Ejecutar**. Te va a pedir permisos (autorizar).
   - Aparece "Google no verificó esta aplicación" → **Avanzado → Ir a COLO (no seguro)** → **Permitir**. Es tu propio script.
   - Verificá que en la Sheet apareció la solapa **Recuentos** con los encabezados.

### Deploy como Web App

1. Arriba a la derecha → **Implementar → Nueva implementación**.
2. ⚙️ (ícono engranaje) → elegir **Aplicación web**.
3. Configuración:
   - **Descripción**: COLO backend v1
   - **Ejecutar como**: Yo (tu mail)
   - **Quién tiene acceso**: **Cualquier persona**
4. **Implementar** → autorizar de nuevo si pide.
5. Copiar la **URL del Web App** (termina en `/exec`).

> ⚠️ Si después cambiás el código, tenés que hacer **"Administrar implementaciones"** → editar → nueva versión. Si creás una implementación nueva, te da otra URL distinta.

---

## 3) Frontend

1. En el repo clonado, editar `js/config.js`:
   ```js
   const API_URL = "https://script.google.com/macros/s/xxxxxx/exec"; // la URL del paso anterior
   const ADMIN_EMAILS = [
     "tu-mail-admin@gmail.com",
     "otro-admin@gmail.com",
   ];
   ```
2. (Opcional) reemplazar los logos en `assets/logos/` por los oficiales — ver `assets/logos/README.md`.
3. Probar localmente:
   ```bash
   # Cualquier servidor estático sirve. Por ejemplo:
   python3 -m http.server 8080
   # abrir http://localhost:8080
   ```

---

## 4) GitHub Pages

1. Crear un repo en GitHub (público o privado, ambos funcionan con Pages).
2. Subir todo:
   ```bash
   cd colo-app
   git init
   git add .
   git commit -m "COLO v1"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/colo-app.git
   git push -u origin main
   ```
3. En el repo → **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main** / folder **/ (root)**
   - **Save**
4. Esperar 1-2 minutos → aparece la URL `https://TU_USUARIO.github.io/colo-app/`.
5. Abrir esa URL → debería cargar la app del fiscal.

---

## 5) Probar el flujo completo

1. Desde el navegador, abrir la app → cargar nombre + mail (usá cualquiera, no importa para el MVP).
2. Completar carrera + día + número → **Abrir urna**.
3. Verificar en la Google Sheet que apareció una fila nueva con los datos.
4. Click en la urna recién creada → cargar algunos números → **Guardar recuento**.
5. Abrir `admin.html` → cargar un mail que esté en `ADMIN_EMAILS` → ver los totales.
6. Desde el admin, tocar una urna → editar → verificar que se reflejan los cambios en la Sheet.

---

## 6) Cambios después del primer deploy

### Cambiar el código del frontend
→ commit + push. GitHub Pages redeploya solo (a veces tarda 1-2 min).

### Cambiar el código del backend (`Code.gs`)
→ **Administrar implementaciones** → ✏️ editar la existente → **Versión: Nueva versión** → **Implementar**.
La URL no cambia, pero **tenés que crear una nueva versión** o sino sigue corriendo la vieja.

### Agregar un admin
→ editar `ADMIN_EMAILS` en `js/config.js` → push. No requiere tocar el backend.

### Cambiar colores o logos de una lista
→ editar `js/config.js` o los archivos en `assets/logos/`. No tocar backend.

### Agregar una categoría nueva (ej: Claustro de Graduados)
→ Agregar el ID en `js/config.js` (`CATEGORIAS`) **Y** en `apps-script/Code.gs` (`CATEGORIA_IDS`).
→ En el Apps Script, correr `setupSheet()` de nuevo para que agregue las columnas nuevas al header.
→ ⚠️ Si ya había filas cargadas, los valores nuevos van a quedar en blanco (es normal, se completan al editar).

---

## Troubleshooting

**"API_URL no configurada"**
→ Faltó pegar la URL de Apps Script en `js/config.js`.

**"Script function not found: doPost"**
→ El Apps Script no se deployó como Web App. Volvé al paso 2.

**Error 401 o CORS**
→ Revisar que el deploy tenga "Quién tiene acceso: Cualquier persona". Apps Script no soporta bien preflight; por eso usamos `Content-Type: text/plain` en `api.js` (no tocar).

**"Ya existe una urna con ese ID"**
→ Dos fiscales abrieron la misma combinación carrera+día+número. Corregir el número o eliminar la duplicada desde el panel admin.

**La Sheet no se actualiza en vivo**
→ Apps Script tiene ~1-2s de latencia. Hacer refresh a mano desde el admin, o activar el auto-refresh (botón ▶ Auto).

**Panel admin no me deja entrar**
→ Mi mail no está en `ADMIN_EMAILS` en `js/config.js`, o está mal escrito (sensible a mayúsculas no, al espacio en blanco sí).
