# Visor de Archivos CSV con Web Workers

Una aplicación web moderna, rápida y ligera que permite cargar archivos CSV y mostrarlos en una tabla HTML interactiva utilizando **Web Workers** para realizar el parseo y procesamiento de los datos en segundo plano sin congelar la interfaz de usuario.

---

## 🚀 Características

- **Web Workers multihilo**: El procesamiento, lectura y parseo del archivo CSV se ejecuta en un hilo de trabajo separado (`worker.js`). La interfaz permanece 100% fluida incluso con archivos pesados.
- **Parser RFC 4180 robusto**:
  - Detección automática del separador (coma `,`, punto y coma `;`, tabulación `\t`, barra `|`).
  - Soporte completo para valores entrecomillados con comas o saltos de línea internos.
  - Soporte de comillas dobles escapadas (`""`).
- **Métricas de rendimiento**: Muestra el tiempo exacto que le tomó al Web Worker parsear los datos en milisegundos (`performance.now()`), cantidad total de filas, columnas y delimitador detectado.
- **Carga interactiva**:
  - Zona de arrastrar y soltar (*Drag & Drop*).
  - Selector de archivos nativo.
  - Botón integrado para cargar un archivo de prueba (`ejemplo.csv`) con un solo clic.
- **Visualización eficiente**:
  - Paginación configurable (10, 25, 50, 100 o todas las filas) para evitar saturar el DOM.
  - Búsqueda / filtro instantáneo en tiempo real sobre todas las columnas.
  - Encabezados fijos (*sticky headers*) para facilitar la lectura.
  - Sanitización automática de celdas contra ataques XSS.

---

## 📁 Estructura del Proyecto

```plaintext
web-workers/
├── index.html     # Estructura principal y controles de usuario
├── style.css      # Estilos modernos y responsivos
├── main.js        # Hilo principal: interfaz, eventos y comunicación con el Worker
├── worker.js      # Hilo secundario (Web Worker): algoritmo de parseo CSV
├── ejemplo.csv    # Archivo CSV de prueba con casos especiales
└── README.md      # Documentación
```

---

## 🛠️ Cómo ejecutar el proyecto

Por restricciones de seguridad de los navegadores (política CORS / Same-Origin), los Web Workers requieren ser servidos a través del protocolo HTTP/HTTPS en lugar de abrir directamente el archivo `file://`.

Puedes iniciar un servidor web local con cualquiera de las siguientes opciones desde la carpeta del proyecto:

### Opción 1: Con Python (Recomendado)
```bash
python3 -m http.server 8000
```
Luego abre tu navegador en: [http://localhost:8000](http://localhost:8000)

### Opción 2: Con Node.js / npx
```bash
npx serve .
```

### Opción 3: Con la extensión Live Server en VS Code
Haz clic derecho en `index.html` y selecciona **"Open with Live Server"**.

---

## 🔄 Flujo de Comunicación (Web Worker)

```
[ Usuario selecciona CSV ]
         │
         ▼
    [ main.js ]  (Hilo Principal UI)
         │
         │  postMessage({ action: 'parse', file/text })
         ▼
   [ worker.js ] (Hilo Secundario en Background)
         │  - Detecta delimitador
         │  - Parsea campos y comillas (RFC 4180)
         │  - Calcula métricas de tiempo
         │
         │  postMessage({ type: 'SUCCESS', headers, rows, stats })
         ▼
    [ main.js ]
         │  - Actualiza contadores y estadísticas
         │  - Renderiza la tabla HTML paginada
         ▼
[ Interfaz actualizada ]
```
