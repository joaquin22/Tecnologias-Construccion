/**
 * worker.js - Web Worker para parseo de archivos CSV
 * 
 * Este worker procesa el contenido del archivo CSV en un hilo separado
 * de la interfaz de usuario, evitando bloqueos en la navegación y el renderizado.
 */

self.addEventListener('message', async (event) => {
    const { action, file, text } = event.data;

    if (action === 'parse') {
        const startTime = performance.now();

        try {
            let csvText = text;

            // Si se envió un objeto File/Blob directamente al worker
            if (!csvText && file) {
                // Notificar lectura
                self.postMessage({ type: 'STATUS', message: 'Leyendo archivo en Web Worker...' });
                csvText = await file.text();
            }

            if (!csvText || !csvText.trim()) {
                throw new Error('El archivo seleccionado está vacío.');
            }

            self.postMessage({ type: 'STATUS', message: 'Parseando datos CSV en Web Worker...' });

            const { headers, rows, delimiter } = parseCSV(csvText);

            const endTime = performance.now();
            const parseTimeMs = Math.round((endTime - startTime) * 100) / 100;

            self.postMessage({
                type: 'SUCCESS',
                headers,
                rows,
                stats: {
                    totalRows: rows.length,
                    totalColumns: headers.length,
                    parseTimeMs,
                    delimiter: delimiter === '\t' ? 'Tabulación (TSV)' : delimiter
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                message: error.message || 'Error desconocido al procesar el archivo CSV.'
            });
        }
    }
});

/**
 * Detecta el delimitador más probable evaluando la primera fila
 */
function detectDelimiter(text) {
    // Tomamos las primeras líneas para evaluar
    const sample = text.slice(0, 4096);
    const firstLine = sample.split(/\r\n|\n|\r/)[0] || '';
    const delimiters = [',', ';', '\t', '|'];

    let bestDelimiter = ',';
    let maxCount = -1;

    for (const delim of delimiters) {
        let count = 0;
        let inQuotes = false;

        for (let i = 0; i < firstLine.length; i++) {
            const char = firstLine[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes && char === delim) {
                count++;
            }
        }

        if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delim;
        }
    }

    return maxCount > 0 ? bestDelimiter : ',';
}

/**
 * Parser de CSV compatible con RFC 4180
 * Soporta comillas dobles, comillas escapadas (""), saltos de línea dentro de campos y distintos delimitadores.
 */
function parseCSV(text) {
    const delimiter = detectDelimiter(text);
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let fieldQuoted = false;

    let i = 0;
    const len = text.length;

    while (i < len) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                // Verificar si es comilla escapada: ""
                if (i + 1 < len && text[i + 1] === '"') {
                    currentField += '"';
                    i += 2;
                    continue;
                } else {
                    // Cierre de comillas
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                currentField += char;
                i++;
                continue;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                fieldQuoted = true;
                i++;
                continue;
            } else if (char === delimiter) {
                // Fin de campo
                currentRow.push(fieldQuoted ? currentField : currentField.trim());
                currentField = '';
                fieldQuoted = false;
                i++;
                continue;
            } else if (char === '\r') {
                // Manejar salto de línea CRLF (\r\n) o solo CR (\r)
                if (i + 1 < len && text[i + 1] === '\n') {
                    i++;
                }
                currentRow.push(fieldQuoted ? currentField : currentField.trim());
                currentField = '';
                fieldQuoted = false;

                // Evitar filas totalmente vacías
                if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                i++;
                continue;
            } else if (char === '\n') {
                // Salto de línea LF (\n)
                currentRow.push(fieldQuoted ? currentField : currentField.trim());
                currentField = '';
                fieldQuoted = false;

                if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                i++;
                continue;
            } else {
                currentField += char;
                i++;
                continue;
            }
        }
    }

    // Procesar el último campo y fila si existen
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(fieldQuoted ? currentField : currentField.trim());
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
            rows.push(currentRow);
        }
    }

    if (rows.length === 0) {
        throw new Error('El archivo no contiene filas válidas.');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return {
        headers,
        rows: dataRows,
        delimiter
    };
}
