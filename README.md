# COLO 🗳️

**Coordinación de Operaciones Liberales Online**
App de fiscalización para las elecciones de la Facultad de Medicina UBA (FMED) — Abril 20–24, 2026.

Hecha para la agrupación **Somos Libres** (Lista 9).

---

## ¿Qué hace?

- **Fiscal** (`index.html`): cada fiscal se identifica con nombre y mail, abre urnas dinámicamente (carrera + día + número) y carga el recuento al cierre.
- **Admin** (`admin.html`): dashboard en tiempo real con totales, filtros por carrera/día/estado/categoría, tabla de resultados con porcentajes, y edición de cualquier urna.
- **Backend**: Google Apps Script + Google Sheets (sin servidor propio, sin base de datos, gratis).

## Stack

| Componente | Tech |
|---|---|
| Frontend | HTML + CSS + JS vanilla |
| Backend | Google Apps Script (Web App) |
| DB | Google Sheets |
| Hosting | GitHub Pages |
| Auth | ⚠️ MVP: nombre + mail sin verificar (se suma Google OAuth después) |

## Estructura

```
colo-app/
├── index.html              # Página del fiscal
├── admin.html              # Panel admin
├── css/styles.css
├── js/
│   ├── config.js           # 👈 EDITAR: API_URL, ADMIN_EMAILS
│   ├── api.js              # Wrapper de Apps Script
│   ├── fiscal.js
│   └── admin.js
├── assets/logos/           # SVGs de listas (reemplazables)
├── apps-script/
│   ├── Code.gs             # 👈 EDITAR: SHEET_ID
│   └── appsscript.json
└── docs/SETUP.md           # Paso a paso de deploy
```

## Setup rápido

Ver [`docs/SETUP.md`](docs/SETUP.md) para el paso a paso completo. Resumen:

1. Crear Google Sheet vacía → copiar ID.
2. Extensiones → Apps Script → pegar `apps-script/Code.gs`, poner el SHEET_ID.
3. Deploy → nuevo deploy → Web App (ejecutar como: yo, acceso: cualquiera).
4. Copiar URL y pegar en `js/config.js` como `API_URL`.
5. Agregar mails admin en `ADMIN_EMAILS`.
6. `git push` + activar GitHub Pages.
7. Probar desde el navegador.

## Listas participantes

| N° | Agrupación | Color |
|---|---|---|
| 4 | En Clave Roja | 🔴 |
| 8 | El Frente | 🔴 |
| 9 | **Somos Libres** | 🟣 (la nuestra) |
| 10 | Nuevo Espacio | 🟠 |
| 12 | El Torrente | 🔵 |
| 13 | Nuevo MAS | 🔴 |
| 17 | JUP | 🔵 |
| X  | Lista peronista (por confirmar) | ⚪ |

Si cambia alguna, editar `js/config.js`.

## Seguridad — TODO

El MVP **no tiene auth real**. Lo que está hardcodeado en `ADMIN_EMAILS` es una lista blanca client-side (cualquiera podría bypassearla tocando el JS).

Cuando activemos OAuth:
- `executeAs: "USER_ACCESSING"` en el manifest del Apps Script.
- Verificar `Session.getActiveUser().getEmail()` en cada acción.
- Gate real del panel admin por email en el servidor.

Por ahora alcanza con que la URL del admin no circule fuera del equipo.

## Créditos

Hecha con cariño y meme culture para el Colo Mortash y la agrupación **Somos Libres**.
