// ===================================================================
// COLO — Coordinación de Operaciones Liberales Online
// Config: listas, colores, carreras, días y URL de la API (Apps Script)
// ===================================================================

// 👇 REEMPLAZAR por la URL de tu Web App de Apps Script (ver docs/SETUP.md)
const API_URL = "https://script.google.com/macros/s/AKfycbxKaHwQNiepAecwsX8iPQw6vhDg0-fV03UUtyM9LmlJs5r115DpiuBaI0WspiFNLYr2/exec";

// Listas participantes. El campo `id` se usa como sufijo en las columnas de la Sheet.
// Si cambia el nombre/color/logo, se refleja en toda la app sin tocar nada más.
const LISTAS = [
  {
    id: "lista4",
    numero: 4,
    nombre: "En Clave Roja",
    color: "#e31b23",
    colorOscuro: "#8a0e13",
    logo: "assets/logos/lista4.svg",
  },
  {
    id: "lista8",
    numero: 8,
    nombre: "El Frente",
    color: "#c1121f",
    colorOscuro: "#6a0a13",
    logo: "assets/logos/lista8.svg",
  },
  {
    id: "lista9",
    numero: 9,
    nombre: "Somos Libres",
    color: "#7b2cbf",
    colorOscuro: "#3c1661",
    logo: "assets/logos/lista9.svg",
    destacada: true, // la nuestra 💜
  },
  {
    id: "lista10",
    numero: 10,
    nombre: "Nuevo Espacio",
    color: "#ff7b00",
    colorOscuro: "#a04d00",
    logo: "assets/logos/lista10.svg",
  },
  {
    id: "lista12",
    numero: 12,
    nombre: "El Torrente",
    color: "#00b4d8",
    colorOscuro: "#005f73",
    logo: "assets/logos/lista12.svg",
  },
  {
    id: "lista13",
    numero: 13,
    nombre: "Nuevo MAS",
    color: "#d90429",
    colorOscuro: "#6d0217",
    logo: "assets/logos/lista13.svg",
  },
  {
    id: "lista17",
    numero: 17,
    nombre: "JUP",
    color: "#0077b6",
    colorOscuro: "#003d5c",
    logo: "assets/logos/lista17.svg",
  },
  {
    id: "listax",
    numero: "X",
    nombre: "Lista Peronista (por confirmar)",
    color: "#8d99ae",
    colorOscuro: "#4a5062",
    logo: "assets/logos/listax.svg",
  },
];

// Carreras de FMED UBA. Si falta alguna, agregar acá.
const CARRERAS = [
  "Medicina",
  "Nutrición",
  "Obstetricia",
  "Kinesiología",
  "Fonoaudiología",
  "Terapia Ocupacional",
  "Musicoterapia",
  "Tecnicatura",
];

// Días de votación — elección 20 al 24 de abril de 2026
const DIAS = [
  { id: "lunes", label: "Lunes 20" },
  { id: "martes", label: "Martes 21" },
  { id: "miercoles", label: "Miércoles 22" },
  { id: "jueves", label: "Jueves 23" },
  { id: "viernes", label: "Viernes 24" },
];

// Categorías de elección a cargar por urna
const CATEGORIAS = [
  { id: "cd", label: "Consejo Directivo", sublabel: "Claustro de Estudiantes" },
  { id: "ce", label: "Centro de Estudiantes", sublabel: "CECIM" },
];

// Campos numéricos que se cargan por categoría además de los votos por lista
const CAMPOS_EXTRA = [
  { id: "blancos", label: "En blanco" },
  { id: "nulos", label: "Nulos" },
  { id: "impugnados", label: "Impugnados" },
  { id: "recurridos", label: "Recurridos" },
  { id: "total_sobres", label: "Total sobres" },
  { id: "total_votantes", label: "Total votantes" },
];

// Emails con acceso al panel admin. En MVP esto se chequea solo en el cliente
// (NO es seguridad real — cuando agreguemos OAuth lo movemos al backend).
const ADMIN_EMAILS = [
  "pacusgarces@gmail.com", // 👈 REEMPLAZAR
];
