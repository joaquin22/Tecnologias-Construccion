/**
 * main.js - Lógica principal del visor CSV y comunicación con el Web Worker
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const dropZone = document.getElementById('dropZone');
    const csvFileInput = document.getElementById('csvFileInput');
    const loadSampleBtn = document.getElementById('loadSampleBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingStatusText = document.getElementById('loadingStatusText');
    const resultsSection = document.getElementById('resultsSection');
    const emptyState = document.getElementById('emptyState');
    const fileProtocolWarning = document.getElementById('fileProtocolWarning');

    const statRows = document.getElementById('statRows');
    const statCols = document.getElementById('statCols');
    const statTime = document.getElementById('statTime');
    const statDelimiter = document.getElementById('statDelimiter');

    const dataTable = document.getElementById('dataTable');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    const searchInput = document.getElementById('searchInput');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicator = document.getElementById('pageIndicator');
    const resultsCount = document.getElementById('resultsCount');

    // Estado de la aplicación
    let worker = null;
    let headers = [];
    let allRows = [];
    let filteredRows = [];
    let currentPage = 1;
    let pageSize = 25;

    // Verificar protocolo file://
    if (window.location.protocol === 'file:') {
        fileProtocolWarning.style.display = 'flex';
    }

    // Inicializar Web Worker
    function initWorker() {
        try {
            worker = new Worker('worker.js');

            worker.onmessage = function (event) {
                const data = event.data;

                if (data.type === 'STATUS') {
                    loadingStatusText.textContent = data.message;
                } else if (data.type === 'SUCCESS') {
                    handleWorkerSuccess(data);
                } else if (data.type === 'ERROR') {
                    handleWorkerError(data.message);
                }
            };

            worker.onerror = function (error) {
                console.error('Error en el Web Worker:', error);
                handleWorkerError('Ocurrió un error en el Web Worker. Si abriste el archivo con file://, inicia un servidor web local.');
            };
        } catch (e) {
            console.error('No se pudo instanciar el Web Worker:', e);
            fileProtocolWarning.style.display = 'flex';
            handleWorkerError('El navegador impidió cargar el Web Worker. Asegúrate de ejecutar la página en un servidor HTTP local (ej: python3 -m http.server 8000).');
        }
    }

    initWorker();

    // Procesar archivo seleccionado
    function processFile(file) {
        if (!file) return;

        // Mostrar información del archivo
        fileName.textContent = file.name;
        fileSize.textContent = `(${formatBytes(file.size)})`;
        fileInfo.style.display = 'inline-flex';

        // Mostrar estado de carga
        showLoading('Enviando archivo al Web Worker...');

        if (!worker) {
            initWorker();
        }

        // Enviar archivo al Web Worker para ser procesado fuera del hilo de la UI
        try {
            worker.postMessage({
                action: 'parse',
                file: file
            });
        } catch (err) {
            // Si el navegador no permite transferir el objeto File directamente, leer como texto
            const reader = new FileReader();
            reader.onload = function(e) {
                worker.postMessage({
                    action: 'parse',
                    text: e.target.result
                });
            };
            reader.onerror = function() {
                handleWorkerError('No se pudo leer el archivo local.');
            };
            reader.readAsText(file);
        }
    }

    // Procesar texto directamente (por ejemplo el archivo de muestra)
    function processText(text, name = 'ejemplo.csv') {
        fileName.textContent = name;
        fileSize.textContent = `(${formatBytes(new Blob([text]).size)})`;
        fileInfo.style.display = 'inline-flex';

        showLoading('Enviando datos al Web Worker...');

        if (!worker) {
            initWorker();
        }

        worker.postMessage({
            action: 'parse',
            text: text
        });
    }

    // Respuesta exitosa del Web Worker
    function handleWorkerSuccess(data) {
        headers = data.headers;
        allRows = data.rows;
        filteredRows = allRows;

        // Actualizar métricas
        statRows.textContent = data.stats.totalRows.toLocaleString();
        statCols.textContent = data.stats.totalColumns.toLocaleString();
        statTime.textContent = `${data.stats.parseTimeMs} ms`;
        statDelimiter.textContent = data.stats.delimiter;

        // Resetear filtros y paginación
        searchInput.value = '';
        currentPage = 1;

        // Renderizar tabla
        renderTableHeaders();
        updatePaginationAndRender();

        // Ocultar carga y mostrar resultados
        hideLoading();
        emptyState.style.display = 'none';
        resultsSection.style.display = 'block';
    }

    // Error reportado por el Web Worker
    function handleWorkerError(message) {
        hideLoading();
        alert('Error: ' + message);
    }

    // Renderizar encabezados de la tabla
    function renderTableHeaders() {
        tableHead.innerHTML = '';
        const tr = document.createElement('tr');

        // Columna de numeración (#)
        const thNum = document.createElement('th');
        thNum.textContent = '#';
        thNum.style.width = '50px';
        thNum.style.textAlign = 'center';
        tr.appendChild(thNum);

        headers.forEach((headerText) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            tr.appendChild(th);
        });

        tableHead.appendChild(tr);
    }

    // Renderizar cuerpo de la tabla
    function renderTableBody(rowsToDisplay, startIndex = 0) {
        tableBody.innerHTML = '';

        if (rowsToDisplay.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = headers.length + 1;
            td.textContent = 'No se encontraron resultados para la búsqueda.';
            td.style.textAlign = 'center';
            td.style.padding = '2rem';
            td.style.color = 'var(--text-secondary)';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        const fragment = document.createDocumentFragment();

        rowsToDisplay.forEach((row, i) => {
            const tr = document.createElement('tr');

            // Número de fila
            const tdNum = document.createElement('td');
            tdNum.textContent = startIndex + i + 1;
            tdNum.style.textAlign = 'center';
            tdNum.style.color = 'var(--text-secondary)';
            tdNum.style.fontWeight = '500';
            tr.appendChild(tdNum);

            // Celdas de datos con protección XSS (textContent)
            headers.forEach((_, colIndex) => {
                const td = document.createElement('td');
                td.textContent = row[colIndex] !== undefined ? row[colIndex] : '';
                tr.appendChild(td);
            });

            fragment.appendChild(tr);
        });

        tableBody.appendChild(fragment);
    }

    // Actualizar paginación y renderizar la vista actual
    function updatePaginationAndRender() {
        const totalItems = filteredRows.length;
        const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize) || 1;

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        let rowsToDisplay;
        let startIndex = 0;

        if (pageSize === -1) {
            rowsToDisplay = filteredRows;
            pageIndicator.textContent = 'Todas las filas';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        } else {
            startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalItems);
            rowsToDisplay = filteredRows.slice(startIndex, endIndex);

            pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
            prevPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;
        }

        renderTableBody(rowsToDisplay, startIndex);

        // Contador de registros al pie
        resultsCount.textContent = `Mostrando ${rowsToDisplay.length} de ${totalItems} registro${totalItems !== 1 ? 's' : ''}${totalItems !== allRows.length ? ` (filtrados de un total de ${allRows.length})` : ''}`;
    }

    // Filtrar filas por término de búsqueda
    function filterRows(searchTerm) {
        const query = searchTerm.trim().toLowerCase();

        if (!query) {
            filteredRows = allRows;
        } else {
            filteredRows = allRows.filter(row => {
                return row.some(cell => String(cell).toLowerCase().includes(query));
            });
        }

        currentPage = 1;
        updatePaginationAndRender();
    }

    // Control de UI: Carga
    function showLoading(text) {
        loadingStatusText.textContent = text || 'Procesando...';
        loadingIndicator.style.display = 'flex';
        resultsSection.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // Formatear tamaño de archivo en bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // --- Event Listeners ---

    // Selector de archivo tradicional
    csvFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    });

    // Drag and Drop en Drop Zone
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });

    ['dragleave', 'dragend'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-active');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });

    // Cargar archivo de ejemplo
    loadSampleBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            showLoading('Descargando archivo de ejemplo...');
            const response = await fetch('ejemplo.csv');
            if (!response.ok) {
                throw new Error('No se pudo encontrar el archivo de ejemplo.');
            }
            const text = await response.text();
            processText(text, 'ejemplo.csv');
        } catch (error) {
            // Si fetch falla (por ejemplo en file:// sin servidor), cargar plantilla hardcodeada
            const fallbackSample = `ID,Nombre,Apellido,Cargo,Departamento,Salario,Ciudad,Fecha_Ingreso,Notas
101,Ana,García,Directora de Tecnología,Sistemas,4500000,"Bogotá, D.C.",2021-03-15,"Líder técnica y arquitecta principal"
102,Carlos,Rodríguez,"Ingeniero de Software ""Senior""",Sistemas,3800000,Medellín,2022-01-10,"Especialista en Web Workers y alto rendimiento"
103,María,Fernández,Diseñadora UX/UI,Producto,2900000,Cali,2022-07-22,"Rediseño de interfaz de usuario completado"
104,Juan,Martínez,Analista de Datos,Operaciones,3200000,"Barranquilla, Atlántico",2020-11-05,"Gestión de pipelines ETL y tableros BI"
105,Laura,López,Coordinadora de RRHH,Recursos Humanos,2800000,Bucaramanga,2023-02-01,"Plan de reclutamiento de talentos"
106,Andrés,Gómez,Desarrollador Frontend,Sistemas,2600000,Manizales,2023-06-18,"Optimización del tiempo de carga web"
107,Sofía,Pérez,Especialista en QA,Calidad,2700000,Pereira,2022-09-12,"Automatización de pruebas end-to-end"
108,Diego,Torres,Gerente de Proyectos,Operaciones,4100000,"Cartagena, Bolívar",2019-05-30,"Metodologías ágiles Scrum/Kanban"`;
            processText(fallbackSample, 'ejemplo.csv');
        }
    });

    // Búsqueda en tiempo real con debounce simple
    let searchDebounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            filterRows(e.target.value);
        }, 150);
    });

    // Cambio de tamaño de página
    pageSizeSelect.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value, 10);
        currentPage = 1;
        updatePaginationAndRender();
    });

    // Navegación de páginas
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePaginationAndRender();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredRows.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            updatePaginationAndRender();
        }
    });
});
