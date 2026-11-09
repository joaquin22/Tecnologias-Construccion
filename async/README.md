# Explorador de Países — API countries.dev (JavaScript Asíncrono)

Proyecto desarrollado para la asignatura **Tecnologías de Construcción**, correspondiente al módulo de programación asíncrona en JavaScript (`async/await`, `fetch`, manipulación del DOM y consumo de APIs REST).

Este proyecto interactúa en tiempo real con la API pública de **[countries.dev](https://countries.dev/docs)**.

---

## 🎯 Requisitos Implementados

1. **Dos Listas Desplegables en Cascada (Dropdowns dependientes):**
   - **Región (Region):** Carga de forma asíncrona las regiones disponibles (`Americas`, `Asia`, `Europe`, `Africa`, `Oceania`, etc.) consumiendo el endpoint `GET https://countries.dev/regions`.
   - **País (Country):** Al seleccionar una región, este segundo desplegable se actualiza dinámicamente con los países correspondientes a dicha región (ej. Gambia en África, Perú en América, etc.) a través de `GET https://countries.dev/region/{region}`.
2. **Tabla de Información Detallada:**
   - Al seleccionar un país, se despliega una interfaz con tablas que presentan de manera clara y destacada:
     - **`Native Name` (Nombre Nativo del País y de los idiomas):** Ej. `Perú` para Peru, `Gambia` para Gambia, `España` para Spain.
     - **`Languages` (Idiomas Oficiales):** Presentados tanto en la tabla principal como en una tabla detallada con su denominación en inglés, su nombre nativo (`nativeName`) y sus códigos ISO 639-1 e ISO 639-2.
   - **Información complementaria:** Bandera en formato vectorial (SVG/PNG) y emoji, capital, subregión, población formateada y monedas.

---

## 📁 Estructura del Proyecto

```text
async/
├── index.html       # Estructura semántica HTML5 y contenedores de tablas
├── style.css        # Hoja de estilos moderna, accesible y responsiva (CSS Variables, Flexbox, CSS Grid)
├── app.js           # Lógica asíncrona con fetch, async/await, caché en memoria y renderizado DOM
└── README.md        # Documentación técnica del proyecto
```

---

## 🚀 ¿Cómo Ejecutar la Aplicación?

Dado que la API de `countries.dev` cuenta con cabeceras CORS permisivas (`Access-Control-Allow-Origin: *`), tienes dos formas sencillas de ejecutar el proyecto:

### Opción 1: Servidor Local (Recomendado)

En la terminal, dentro de la carpeta `async`, ejecuta cualquier servidor HTTP ligero:

**Con Python 3:**
```bash
python3 -m http.server 8000
```
Luego abre tu navegador en:
```text
http://localhost:8000
```

**Con Node.js (`npx serve` o similar):**
```bash
npx serve .
```

### Opción 2: Directamente desde el explorador

Puedes hacer doble clic en el archivo `index.html` o abrirlo con tu navegador preferido (Chrome, Firefox, Edge, Safari):
```text
file:///ruta/a/async/index.html
```

---

## 🔌 Endpoints de la API Utilizados

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `https://countries.dev/regions` | Obtiene la lista de nombres de todas las regiones disponibles. |
| `GET` | `https://countries.dev/region/{region}` | Obtiene todos los países pertenecientes a una región dada, incluyendo `languages`, `nativeName`, `flags`, `capital`, etc. |

---

## 💡 Aspectos Técnicos Destacados

1. **Uso de `async` / `await`:** Toda la comunicación HTTP se gestiona con la sintaxis moderna de `async/await` dentro de bloques `try/catch` para un control robusto de excepciones.
2. **Caché en Memoria:** Cuando se descarga una región, los países se almacenan en un objeto en memoria (`state.countriesByRegion`). Si el usuario cambia entre regiones previamente consultadas, los datos se recuperan instantáneamente sin realizar peticiones de red redundantes.
3. **Manejo de Estados de UI:**
   - **Spinners de Carga:** Indicadores visuales durante la petición de regiones y países.
   - **Manejo de Errores con Reintento:** Si ocurre un corte de red, se muestra una alerta amigable con botón "Reintentar".
   - **Placeholder Inicial:** Guía interactiva antes de realizar la selección.
4. **Diseño Responsivo y Limpio:**
   - Compatible con pantallas de escritorio, tablets y dispositivos móviles.
   - Tipografía Inter, soporte para banderas de alta resolución y etiquetas visuales.
   - Sanitización de strings (`escapeHtml`) para prevenir ataques de Cross-Site Scripting (XSS).
