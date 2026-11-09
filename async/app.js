/**
 * ==============================================================================
 * Explorador de Países - Consumo asíncrono con fetch y async/await
 * API de referencia: https://countries.dev/docs
 * Tecnologías de Construcción
 * ==============================================================================
 */

// Constante de URL base de la API pública countries.dev
const API_BASE_URL = 'https://countries.dev';

// Mapeo amigable de nombres de regiones en inglés a español
const REGION_LABELS = {
    'Africa': 'África (Africa)',
    'Americas': 'América (Americas)',
    'Antarctic': 'Antártida (Antarctic)',
    'Antarctic Ocean': 'Océano Antártico (Antarctic Ocean)',
    'Asia': 'Asia (Asia)',
    'Europe': 'Europa (Europe)',
    'Oceania': 'Oceanía (Oceania)',
    'Polar': 'Región Polar (Polar)'
};

// Estado local de la aplicación (con memoria caché para optimizar rendimiento)
const state = {
    regions: [],
    selectedRegion: '',
    countriesByRegion: {}, // Caché en memoria: { 'Americas': [ ...países ], ... }
    currentCountryList: [],
    selectedCountry: null,
    lastFailedAction: null
};

// Referencias a elementos del DOM
const DOM = {
    // Selectores y spinners
    regionSelect: document.getElementById('regionSelect'),
    countrySelect: document.getElementById('countrySelect'),
    regionSpinner: document.getElementById('regionSpinner'),
    countrySpinner: document.getElementById('countrySpinner'),
    
    // Alertas y estados visuales
    errorAlert: document.getElementById('errorAlert'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    placeholderState: document.getElementById('placeholderState'),
    loadingState: document.getElementById('loadingState'),
    loadingText: document.getElementById('loadingText'),
    
    // Contenedor principal de detalles
    countryDetailsSection: document.getElementById('countryDetailsSection'),
    
    // Cabecera del país
    countryFlagImg: document.getElementById('countryFlagImg'),
    countryFlagEmoji: document.getElementById('countryFlagEmoji'),
    countryCodeBadge: document.getElementById('countryCodeBadge'),
    countryName: document.getElementById('countryName'),
    countryNativeNameBadge: document.getElementById('countryNativeNameBadge'),
    countryRegionBadge: document.getElementById('countryRegionBadge'),
    
    // Tabla 1: Requerida (Country, Native Name, Languages)
    mainFlagIcon: document.getElementById('mainFlagIcon'),
    mainCountryName: document.getElementById('mainCountryName'),
    mainNativeNameText: document.getElementById('mainNativeNameText'),
    mainLanguagesContainer: document.getElementById('mainLanguagesContainer'),
    
    // Tabla 2: Desglose de Idiomas
    languagesTableBody: document.getElementById('languagesTableBody'),
    languagesCountBadge: document.getElementById('languagesCountBadge'),
    
    // Ficha de Datos Geográficos Complementarios
    cellCapital: document.getElementById('cellCapital'),
    cellRegion: document.getElementById('cellRegion'),
    cellPopulation: document.getElementById('cellPopulation'),
    cellCurrencies: document.getElementById('cellCurrencies')
};

// ==============================================================================
// 1. Capa de Servicios Asíncronos (Fetch API & async/await)
// ==============================================================================

/**
 * Obtiene la lista completa de regiones desde la API countries.dev.
 * Endpoint: GET https://countries.dev/regions
 * @returns {Promise<Array<string>>} Lista de nombres de regiones
 */
async function fetchRegions() {
    const response = await fetch(`${API_BASE_URL}/regions`);
    
    if (!response.ok) {
        throw new Error(`Error en el servidor al obtener regiones (${response.status}: ${response.statusText})`);
    }
    
    const regions = await response.json();
    return regions;
}

/**
 * Obtiene la lista de países para una región seleccionada.
 * Utiliza caché en memoria para no repetir peticiones si el usuario cambia de región varias veces.
 * Endpoint: GET https://countries.dev/region/{region}
 * @param {string} region Nombre de la región (ej. "Americas", "Africa", "Asia")
 * @returns {Promise<Array<Object>>} Lista de países con sus detalles
 */
async function fetchCountriesByRegion(region) {
    // Si ya consultamos esta región antes, retornar directamente desde la memoria caché
    if (state.countriesByRegion[region]) {
        return state.countriesByRegion[region];
    }

    const encodedRegion = encodeURIComponent(region);
    const response = await fetch(`${API_BASE_URL}/region/${encodedRegion}`);
    
    if (!response.ok) {
        throw new Error(`Error al obtener países para la región "${region}" (${response.status}: ${response.statusText})`);
    }

    const countries = await response.json();

    // Ordenar los países alfabéticamente por nombre común para una mejor experiencia de usuario
    countries.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));

    // Guardar en la caché
    state.countriesByRegion[region] = countries;
    return countries;
}

// ==============================================================================
// 2. Controladores de Eventos y Flujo de la Aplicación
// ==============================================================================

/**
 * Función inicial: obtiene las regiones disponibles y puebla el primer selector.
 */
async function initApp() {
    hideError();
    showRegionSpinner(true);
    DOM.regionSelect.disabled = true;
    DOM.regionSelect.innerHTML = '<option value="">Cargando regiones...</option>';

    try {
        const regions = await fetchRegions();
        state.regions = regions;

        // Limpiar y poblar el selector de región
        DOM.regionSelect.innerHTML = '<option value="">-- Selecciona una región --</option>';
        
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = REGION_LABELS[region] || region;
            DOM.regionSelect.appendChild(option);
        });

        DOM.regionSelect.disabled = false;
    } catch (error) {
        console.error('Error al inicializar la lista de regiones:', error);
        showError(
            'Error al cargar regiones',
            'No fue posible conectar con la API https://countries.dev/docs. Por favor verifica tu conexión a internet.',
            initApp
        );
        DOM.regionSelect.innerHTML = '<option value="">Error al cargar regiones</option>';
    } finally {
        showRegionSpinner(false);
    }
}

/**
 * Se activa cuando el usuario cambia la opción del selector de Región.
 * Resetea y carga los países correspondientes a la región elegida.
 */
async function handleRegionChange() {
    const selectedRegion = DOM.regionSelect.value;
    state.selectedRegion = selectedRegion;
    state.selectedCountry = null;

    // Ocultar sección de detalles del país
    hideCountryDetails();

    // Si vuelve a la opción vacía
    if (!selectedRegion) {
        DOM.countrySelect.disabled = true;
        DOM.countrySelect.innerHTML = '<option value="">-- Primero selecciona una región --</option>';
        showPlaceholder(
            'Selecciona una región para comenzar',
            'Elige una región del primer menú desplegable para cargar los países disponibles.'
        );
        return;
    }

    // Preparar estado de carga en el selector de país
    DOM.countrySelect.disabled = true;
    DOM.countrySelect.innerHTML = `<option value="">Cargando países de ${escapeHtml(selectedRegion)}...</option>`;
    showCountrySpinner(true);
    hideError();
    showPlaceholder(
        'Cargando países...',
        `Consultando los países de ${REGION_LABELS[selectedRegion] || selectedRegion} en la API...`
    );

    try {
        const countries = await fetchCountriesByRegion(selectedRegion);
        state.currentCountryList = countries;

        // Llenar el selector de país
        DOM.countrySelect.innerHTML = '<option value="">-- Selecciona un país --</option>';
        
        countries.forEach((country, index) => {
            const option = document.createElement('option');
            // Usamos el índice numérico en el arreglo para un acceso O(1) directo y seguro
            option.value = index;
            const flagEmoji = country.flag ? `${country.flag} ` : '';
            option.textContent = `${flagEmoji}${country.name}`;
            DOM.countrySelect.appendChild(option);
        });

        DOM.countrySelect.disabled = false;
        showPlaceholder(
            '¡Países listos!',
            `Se encontraron ${countries.length} países para ${REGION_LABELS[selectedRegion] || selectedRegion}. Ahora selecciona un país para ver su tabla de idiomas y nombre nativo.`
        );
    } catch (error) {
        console.error('Error cargando países de la región:', error);
        showError(
            'Error al cargar países',
            `No se pudieron obtener los países para la región "${selectedRegion}". Intenta nuevamente.`,
            handleRegionChange
        );
        DOM.countrySelect.innerHTML = '<option value="">Error al cargar países</option>';
    } finally {
        showCountrySpinner(false);
    }
}

/**
 * Se activa cuando el usuario selecciona un país del segundo selector.
 * Muestra la tabla de información requerida: Languages y Native Name.
 */
function handleCountryChange() {
    const selectedIndex = DOM.countrySelect.value;

    if (selectedIndex === '' || selectedIndex === null) {
        state.selectedCountry = null;
        hideCountryDetails();
        showPlaceholder(
            'Selecciona un país',
            'Elige un país de la lista desplegable para ver su nombre nativo, idiomas y datos generales.'
        );
        return;
    }

    const country = state.currentCountryList[selectedIndex];
    if (!country) return;

    state.selectedCountry = country;
    renderCountryDetails(country);
}

// ==============================================================================
// 3. Renderizado de Datos en la Interfaz (Tablas y Fichas)
// ==============================================================================

/**
 * Renderiza todos los datos del país en las tablas correspondientes,
 * destacando claramente "Languages" y "native name".
 * @param {Object} country Datos del país obtenidos de la API
 */
function renderCountryDetails(country) {
    // 1. Mostrar contenedor de detalles y ocultar placeholders
    DOM.placeholderState.style.display = 'none';
    DOM.loadingState.style.display = 'none';
    DOM.countryDetailsSection.style.display = 'flex';

    // 2. Cabecera visual del país
    DOM.countryName.textContent = country.name || 'Desconocido';
    DOM.countryCodeBadge.textContent = `${country.alpha2Code || ''} • ${country.alpha3Code || ''}`.trim() || 'ISO';

    // Bandera (SVG, PNG o Emoji)
    const flagUrl = (country.flags && (country.flags.svg || country.flags.png)) || '';
    if (flagUrl) {
        DOM.countryFlagImg.src = flagUrl;
        DOM.countryFlagImg.alt = `Bandera de ${country.name}`;
        DOM.countryFlagImg.style.display = 'block';
        DOM.countryFlagEmoji.style.display = 'none';
    } else if (country.flag) {
        DOM.countryFlagImg.style.display = 'none';
        DOM.countryFlagEmoji.textContent = country.flag;
        DOM.countryFlagEmoji.style.display = 'block';
    } else {
        DOM.countryFlagImg.style.display = 'none';
        DOM.countryFlagEmoji.textContent = '🏳️';
        DOM.countryFlagEmoji.style.display = 'block';
    }

    const nativeName = country.nativeName || 'N/A';
    DOM.countryNativeNameBadge.innerHTML = `Nombre nativo: <strong>${escapeHtml(nativeName)}</strong>`;
    
    const subregionText = country.subregion ? ` • ${country.subregion}` : '';
    DOM.countryRegionBadge.textContent = `${country.region || ''}${subregionText}`;

    // 3. TABLA 1: Tabla Principal Requerida [Country, Native Name, Languages]
    DOM.mainFlagIcon.textContent = country.flag ? `${country.flag} ` : '';
    DOM.mainCountryName.textContent = country.name || 'N/A';
    DOM.mainNativeNameText.textContent = nativeName;

    const languages = Array.isArray(country.languages) ? country.languages : [];
    if (languages.length > 0) {
        DOM.mainLanguagesContainer.innerHTML = languages.map(lang => {
            const nativeSuffix = lang.nativeName && lang.nativeName !== lang.name
                ? ` (<span class="lang-pill-native">${escapeHtml(lang.nativeName)}</span>)`
                : '';
            return `<span class="lang-pill">${escapeHtml(lang.name)}${nativeSuffix}</span>`;
        }).join(' ');
    } else {
        DOM.mainLanguagesContainer.innerHTML = '<span class="text-muted">No registrados</span>';
    }

    // 4. TABLA 2: Desglose Detallado de Idiomas (Languages Breakdown)
    renderLanguagesTable(languages);

    // 5. Datos Geográficos y Demográficos Complementarios
    DOM.cellCapital.textContent = country.capital || 'No registrada';
    DOM.cellRegion.textContent = `${country.region || 'N/A'}${subregionText ? ` (${country.subregion})` : ''}`;
    DOM.cellPopulation.textContent = country.population ? Number(country.population).toLocaleString('es-ES') : 'No disponible';

    // Monedas
    if (Array.isArray(country.currencies) && country.currencies.length > 0) {
        DOM.cellCurrencies.textContent = country.currencies.map(c => {
            const sym = c.symbol ? ` [${c.symbol}]` : '';
            return `${c.name || c.code} (${c.code}${sym})`;
        }).join(', ');
    } else {
        DOM.cellCurrencies.textContent = 'No registrada';
    }

    // Scroll suave hacia la sección de resultados en dispositivos móviles
    if (window.innerWidth < 768) {
        DOM.countryDetailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Llena el cuerpo de la tabla detallada de idiomas.
 * Muestra para cada idioma: nombre en inglés, nombre nativo (nativeName) y códigos ISO.
 * @param {Array<Object>} languages Lista de idiomas oficiales del país
 */
function renderLanguagesTable(languages) {
    DOM.languagesTableBody.innerHTML = '';

    const count = languages.length;
    DOM.languagesCountBadge.textContent = `${count} ${count === 1 ? 'idioma registrado' : 'idiomas registrados'}`;

    if (count === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                No se registran idiomas oficiales en la base de datos para este país.
            </td>
        `;
        DOM.languagesTableBody.appendChild(emptyRow);
        return;
    }

    languages.forEach((lang, index) => {
        const row = document.createElement('tr');
        
        const langName = escapeHtml(lang.name || 'Desconocido');
        const langNativeName = escapeHtml(lang.nativeName || lang.name || 'N/A');
        const iso1 = lang.iso639_1 ? `<span class="code-badge">${escapeHtml(lang.iso639_1)}</span>` : '<span class="text-muted">-</span>';
        const iso2 = lang.iso639_2 ? `<span class="code-badge">${escapeHtml(lang.iso639_2)}</span>` : '<span class="text-muted">-</span>';

        row.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td><strong>${langName}</strong></td>
            <td class="cell-highlight">${langNativeName}</td>
            <td>${iso1}</td>
            <td>${iso2}</td>
        `;

        DOM.languagesTableBody.appendChild(row);
    });
}

// ==============================================================================
// 4. Funciones Auxiliares de Interfaz y Sanitización
// ==============================================================================

function hideCountryDetails() {
    DOM.countryDetailsSection.style.display = 'none';
}

function showPlaceholder(title, text) {
    DOM.placeholderState.querySelector('h3').textContent = title;
    DOM.placeholderState.querySelector('p').textContent = text;
    DOM.placeholderState.style.display = 'block';
}

function showRegionSpinner(visible) {
    DOM.regionSpinner.style.display = visible ? 'block' : 'none';
}

function showCountrySpinner(visible) {
    DOM.countrySpinner.style.display = visible ? 'block' : 'none';
}

function showError(title, message, retryAction = null) {
    DOM.errorTitle.textContent = title;
    DOM.errorMessage.textContent = message;
    state.lastFailedAction = retryAction;
    
    if (retryAction) {
        DOM.retryBtn.style.display = 'inline-block';
    } else {
        DOM.retryBtn.style.display = 'none';
    }
    DOM.errorAlert.style.display = 'flex';
}

function hideError() {
    DOM.errorAlert.style.display = 'none';
}

/**
 * Escapa caracteres especiales en strings para prevenir XSS.
 * @param {string} str Cadena a escapar
 * @returns {string} Cadena sanitizada
 */
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==============================================================================
// 5. Asignación de Event Listeners y Arranque
// ==============================================================================

DOM.regionSelect.addEventListener('change', handleRegionChange);
DOM.countrySelect.addEventListener('change', handleCountryChange);

DOM.retryBtn.addEventListener('click', () => {
    hideError();
    if (typeof state.lastFailedAction === 'function') {
        state.lastFailedAction();
    } else {
        initApp();
    }
});

// Inicializar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initApp);
