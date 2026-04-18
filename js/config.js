// ===================================================================
// COLO — Coordinación de Operaciones Liberales Online
// Config: listas, colores, carreras, días y endpoints
// ===================================================================

// 👇 REEMPLAZAR por la URL de tu Web App de Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxKaHwQNiepAecwsX8iPQw6vhDg0-fV03UUtyM9LmlJs5r115DpiuBaI0WspiFNLYr2/exec";

// 👇 REEMPLAZAR por tu OAuth Client ID de Google Cloud Console
// Formato: 123456789-abcdefghijk.apps.googleusercontent.com
const GOOGLE_CLIENT_ID = "44126438744-pt6nsqj7j3gmjtsm7b42n2onr308152o.apps.googleusercontent.com";

// Listas participantes
const LISTAS = [
  { id: "lista4",  numero: 4,   nombre: "En Clave Roja",        color: "#e31b23", colorOscuro: "#8a0e13", logo: "assets/logos/lista4.svg" },
  { id: "lista8",  numero: 8,   nombre: "El Frente",            color: "#c1121f", colorOscuro: "#6a0a13", logo: "assets/logos/lista8.svg" },
  { id: "lista9",  numero: 9,   nombre: "Somos Libres",         color: "#7b2cbf", colorOscuro: "#3c1661", logo: "assets/logos/lista9.svg", destacada: true },
  { id: "lista10", numero: 10,  nombre: "Nuevo Espacio",        color: "#ff7b00", colorOscuro: "#a04d00", logo: "assets/logos/lista10.svg" },
  { id: "lista12", numero: 12,  nombre: "El Torrente",          color: "#00b4d8", colorOscuro: "#005f73", logo: "assets/logos/lista12.svg" },
  { id: "lista13", numero: 13,  nombre: "Nuevo MAS",            color: "#d90429", colorOscuro: "#6d0217", logo: "assets/logos/lista13.svg" },
  { id: "lista17", numero: 17,  nombre: "JUP",                  color: "#0077b6", colorOscuro: "#003d5c", logo: "assets/logos/lista17.svg" },
  { id: "listax",  numero: "X", nombre: "Lista Peronista (por confirmar)", color: "#8d99ae", colorOscuro: "#4a5062", logo: "assets/logos/listax.svg" },
];

const CARRERAS = [
  "Medicina",
  "Enfermería",
  "Kinesiología",
  "Nutrición",
  "Fonoaudiología",
  "Obstetricia",
  "Producción de Bioimágenes",
  "Podología",
  "Tec. Anestesia",
  "Tec. Cosmetología",
  "Tec. Hemoterapia",
  "Tec. Instrumentación Quirúrgica",
  "Tec. Prácticas Cardiológicas",
  "Tec. Radiología",
];

const DIAS = [
  { id: "lunes",     label: "Lunes 20" },
  { id: "martes",    label: "Martes 21" },
  { id: "miercoles", label: "Miércoles 22" },
  { id: "jueves",    label: "Jueves 23" },
  { id: "viernes",   label: "Viernes 24" },
];

const CATEGORIAS = [
  { id: "cd", label: "Consejo Directivo",    sublabel: "Claustro de Estudiantes" },
  { id: "ce", label: "Centro de Estudiantes", sublabel: "CECIM" },
];

const CAMPOS_EXTRA = [
  { id: "blancos",        label: "En blanco" },
  { id: "nulos",          label: "Nulos" },
  { id: "impugnados",     label: "Impugnados" },
  { id: "recurridos",     label: "Recurridos" },
  { id: "total_sobres",   label: "Total sobres" },
  { id: "total_votantes", label: "Total votantes" },
];

// ⚠️ La whitelist de admins ahora vive en el backend (apps-script/Code.gs → ADMIN_EMAILS).
// Para cambiarla hay que editar Code.gs y re-desplegar (Administrar implementaciones → Nueva versión).
