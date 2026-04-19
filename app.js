        const SCROLL_OFFSET_PREVIEW = 100; const SCROLL_OFFSET_DOWNLOAD = 70;
        const markdownInput = document.getElementById('markdownInput');
        const generateBtn = document.getElementById('generateBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const insertAccordionBtn = document.getElementById('insertAccordionBtn');
        const insertImageBtn = document.getElementById('insertImageBtn');
        const imageFileInput = document.getElementById('imageFileInput');
        const mainContentPreview = document.getElementById('mainContentPreview');
        const indiceNavPreview = document.getElementById('indiceNavPreview');
        const htmlOutputBody = document.getElementById('htmlOutputBody');
        const personalizationInputs = document.querySelectorAll('#personalizationOffcanvas input[type="color"]');
        const indiceContenidoPreviewContainer = document.getElementById('indiceContenidoPreview');
        const themeSelector = document.getElementById('themeSelector');
        let scrollSpyInstance = null;
        
        let accordionContentPlaceholders = {};
        let imageStore = {}; // Objeto para almacenar Base64 de imágenes { 'img-id-123': 'data:image/png;base64,...' }
        let imageIdCounter = 0; // Para generar IDs únicos para las imágenes

        // --- Helper Functions ---
        function slugify(text) { if (!text) return ''; return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-\u00C0-\u017F]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, ''); }
        function getAppliedVariables() { const appliedVariables = { ...defaultCssVariables }; const rootStyles = getComputedStyle(document.documentElement); personalizationInputs.forEach(input => { const varName = input.dataset.cssVar; if (varName && appliedVariables.hasOwnProperty(varName)) { try { const currentValue = rootStyles.getPropertyValue(varName).trim(); if(currentValue) { appliedVariables[varName] = currentValue; } } catch(e) {} } }); return appliedVariables; }
        function generateCssForDownload() { const appliedVars = getAppliedVariables(); let variablesString = ':root {\n'; for (const [key, value] of Object.entries(appliedVars)) { if (value) { variablesString += `    ${key}: ${value};\n`; } else { variablesString += `    ${key}: ${defaultCssVariables[key] || 'inherit'};\n`; } } variablesString += '}\n\n'; const allStyles = document.querySelector('head > style').innerHTML; const startIndex = allStyles.indexOf('/* === INICIO ESTILOS UNIFICADOS'); const endIndexMarker = '/* === FIN ESTILOS UNIFICADOS === */'; let endIndex = allStyles.indexOf(endIndexMarker); if (endIndex === -1) { endIndex = allStyles.length; } let staticStyles = ''; if (startIndex !== -1) { staticStyles = allStyles.substring(startIndex, endIndex + endIndexMarker.length); } else { staticStyles = ""; } return variablesString + staticStyles; }
        function addCopyButtons(container) { const preBlocks = container.querySelectorAll('pre'); preBlocks.forEach((pre) => { if (pre.querySelector('.copy-code-btn')) { pre.querySelector('.copy-code-btn').remove(); } const copyButton = document.createElement('button'); copyButton.className = 'btn btn-sm copy-code-btn'; copyButton.setAttribute('aria-label', 'Copiar código'); const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/></svg>`; const successSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/></svg> Copiado!`; copyButton.innerHTML = iconSvg; copyButton.addEventListener('click', () => { const codeElement = pre.querySelector('code'); const textToCopy = codeElement ? codeElement.innerText : pre.innerText; navigator.clipboard.writeText(textToCopy).then(() => { copyButton.innerHTML = successSvg; copyButton.classList.add('copied'); setTimeout(() => { copyButton.innerHTML = iconSvg; copyButton.classList.remove('copied'); }, 2000); }).catch(err => { console.error('Error al copiar: ', err); copyButton.innerHTML = 'Error'; setTimeout(() => { copyButton.innerHTML = iconSvg; }, 2000); }); }); pre.style.position = pre.style.position || 'relative'; pre.appendChild(copyButton); }); }

// --- INICIO CAMBIOS PARA IMÁGENES ---
function cleanupImageStore() {
    const currentMarkdown = markdownInput.value;
    const activeImageIds = new Set();
    const imgPlaceholderRegex = /<img\s+data-img-id="([^"]+)"/g;
    let match;
    while ((match = imgPlaceholderRegex.exec(currentMarkdown)) !== null) {
        activeImageIds.add(match[1]);
    }
    for (const storedId in imageStore) {
        if (!activeImageIds.has(storedId)) {
            delete imageStore[storedId];
            // console.log(`Imagen ${storedId} eliminada del store.`);
        }
    }
}

function preprocessImagePlaceholders(markdown) {
    let processedMarkdown = markdown;
    const imgPlaceholderRegex = /<img\s+data-img-id="([^"]+)"\s+alt="([^"]*)"\s+src="#image-placeholder"\s*(class="[^"]*")?\s*\/?>/g;

    processedMarkdown = processedMarkdown.replace(imgPlaceholderRegex, (match, imgId, altText, classAttr) => {
        if (imageStore[imgId]) {
            const base64Src = imageStore[imgId];
            const classes = classAttr ? classAttr.trim() : 'class="img-fluid"';
            return `<img src="${base64Src}" alt="${altText}" ${classes}>`;
        }
        console.warn(`Image with ID ${imgId} not found in store.`);
        return `<p style="color:red; border:1px solid red; padding: 0.5em;">[Error: Imagen ${imgId} no encontrada en el almacén. Placeholder original: ${match}]</p>`;
    });
    return processedMarkdown;
}
// --- FIN CAMBIOS PARA IMÁGENES ---


function preprocessMarkdown(markdownText) {
    let processedText = markdownText;
    
    // --- PRIMERO, procesar los placeholders de imágenes ---
    processedText = preprocessImagePlaceholders(processedText);
    // --- FIN DEL PROCESAMIENTO DE IMÁGENES ---

    const accordionRegex = /^\+\+S\s+(.*?)\s*$([\s\S]*?)^\+\+E\s*$/gm;
    let accordionGroupCounter = 0;
    accordionContentPlaceholders = {}; 

    processedText = processedText.replace(accordionRegex, (match, title, content) => {
        accordionGroupCounter++;
        const accordionId = `custom-accordion-${Date.now()}-${accordionGroupCounter}`;
        const headingId = `heading-${accordionId}-item1`;
        const collapseId = `collapse-${accordionId}-item1`;
        const placeholderId = `accordion-content-placeholder-${accordionId}`; 
        
        const escapedTitle = title.trim().replace(/"/g, '"');
        accordionContentPlaceholders[placeholderId] = content.trim();

        const accordionHtml =
`<div class="accordion" id="${accordionId}">
<div class="accordion-item">
<h2 class="accordion-header" id="${headingId}">
<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
${escapedTitle}
</button>
</h2>
<div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headingId}" data-bs-parent="#${accordionId}">
<div class="accordion-body" data-accordion-placeholder-id="${placeholderId}">
</div>
</div>
</div>
</div>\n`;
        return accordionHtml;
    });
    return processedText;
}

        function generateJsForDownload(targetId = '#indiceContenido', bodySelector = '.generated-html-body', offset = SCROLL_OFFSET_DOWNLOAD) {
            return `
            document.addEventListener('DOMContentLoaded', () => {
                const scrollSpyTarget = document.querySelector('${targetId}');
                const scrollSpyBody = document.querySelector('${bodySelector}');
                const scrollOffset = ${offset};
                let currentScrollSpy = null;

                function initOrRefreshScrollSpy() {
                    if (!scrollSpyBody || !scrollSpyTarget) {
                        console.warn('ScrollSpy target or body not found.');
                        return;
                    }
                    try {
                        if (typeof bootstrap !== 'undefined' && bootstrap.ScrollSpy) {
                            if (currentScrollSpy) {
                                currentScrollSpy.dispose();
                            }
                            currentScrollSpy = new bootstrap.ScrollSpy(scrollSpyBody, {
                                target: scrollSpyTarget,
                                offset: scrollOffset,
                                rootMargin: '0px 0px -25%'
                            });
                        } else {
                            console.warn('Bootstrap ScrollSpy component not found.');
                        }
                    } catch (e) {
                        console.error('Error initializing ScrollSpy:', e);
                    }
                }


                initOrRefreshScrollSpy();

                document.querySelectorAll('${targetId} a[href^="#"]').forEach(anchor => {
                    anchor.addEventListener('click', function (e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('href');
                        try {
                            const targetElement = document.querySelector(targetId);
                            if (targetElement) {
                                const elementPosition = targetElement.getBoundingClientRect().top;
                                const offsetPosition = elementPosition + window.pageYOffset - scrollOffset + 5;
                                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                            } else { console.warn('Scroll target element not found:', targetId); }
                        } catch (err) { console.error('Error scrolling to element:', err); }
                    });
                });

                const mainContentElement = document.querySelector('#mainContent');
                if (mainContentElement && typeof addCopyButtons === 'function') {
                    addCopyButtons(mainContentElement);
                } else if (!mainContentElement) {
                     console.warn('#mainContent not found for adding copy buttons.');
                } else {
                     console.warn('addCopyButtons function not found.');
                }

                let resizeTimeout;
                window.addEventListener('resize', () => {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(initOrRefreshScrollSpy, 250);
                });

                setTimeout(() => initOrRefreshScrollSpy(), 500);
            });`;
        }

        function generateToc(contentContainer, tocContainer) {
            tocContainer.innerHTML = '';
            const headings = contentContainer.querySelectorAll(
                'h1:not(.accordion-body h1), h2:not(.accordion-body h2), h3:not(.accordion-body h3), h4:not(.accordion-body h4), h5:not(.accordion-body h5), h6:not(.accordion-body h6)'
            );
            let usedIds = new Set();

            headings.forEach((heading, index) => {
                const level = parseInt(heading.tagName.substring(1));
                let baseId = heading.getAttribute('id');

                if (!baseId) {
                    baseId = slugify(heading.textContent);
                } else {
                    baseId = slugify(baseId);
                }

                let id = baseId || `section-${index + 1}`;
                const originalIdAttempt = id; 

                if (/^\d/.test(id)) {
                    id = 'h-' + id;
                }
                
                let i = 1;
                while (usedIds.has(id) || document.getElementById(id)) {
                    id = `${originalIdAttempt || 'section'}-${index + 1}-${i}`;
                    if (/^\d/.test(id)) {
                         id = 'h-' + id;
                    }
                    i++;
                }

                if (heading.getAttribute('id') !== id) {
                    heading.setAttribute('id', id);
                }
                usedIds.add(id);

                const link = document.createElement('a');
                link.classList.add('nav-link');
                if (level > 1) {
                    link.classList.add(`ps-${Math.min(level + 1, 6)}`);
                }
                link.href = `#${id}`;
                link.textContent = heading.textContent.trim() || `Sección ${index + 1}`;
                link.title = heading.textContent.trim() || `Sección ${index + 1}`;
                tocContainer.appendChild(link);
            });
        }

        function updateColorPickers(variables) { personalizationInputs.forEach(input => { const varName = input.dataset.cssVar; if (varName && variables[varName]) { try { let colorValue = variables[varName]; if (!/^#([0-9a-fA-F]{3}){1,2}$/i.test(colorValue)) { colorValue = defaultCssVariables[varName] || '#000000'; } input.value = colorValue; } catch(e) { input.value = defaultCssVariables[varName] || '#000000'; } } }); }
        function applyTheme(themeIndex) {
            if (themeIndex < 0 || themeIndex >= themes.length) { return; }
            const themeVariables = themes[themeIndex].variables;
            const root = document.documentElement;
            for (const [key, value] of Object.entries(themeVariables)) { root.style.setProperty(key, value); }
            updateColorPickers(themeVariables);
            const textColor = getComputedStyle(root).getPropertyValue('--text-color').trim().toLowerCase();
            const bgColor = getComputedStyle(root).getPropertyValue('--body-bg-color').trim().toLowerCase();
            const isLikelyDark = (textColor.startsWith('#f') || textColor === 'white' || textColor.startsWith('#e')) && (bgColor.startsWith('#0') || bgColor.startsWith('#1') || bgColor.startsWith('#2') || bgColor.startsWith('#3') || bgColor === 'black');

            if (isLikelyDark) {
                root.setAttribute('data-bs-theme', 'dark');
            } else {
                 root.removeAttribute('data-bs-theme');
                 const offcanvasClose = document.querySelector('.offcanvas-header .btn-close');
                 if(offcanvasClose) { offcanvasClose.style.display = 'none'; offcanvasClose.offsetHeight; offcanvasClose.style.display = ''; }
            }
        }

function generateHtmlPreview() {
    cleanupImageStore(); // Limpia el imageStore
    const markdownText = markdownInput.value;
    const preprocessedMarkdown = preprocessMarkdown(markdownText); 

    marked.setOptions({ gfm: true, breaks: false, pedantic: false, smartLists: true, smartypants: false });
    const rawHtml = marked.parse(preprocessedMarkdown); 
    
    const cleanHtml = DOMPurify.sanitize(rawHtml, { 
        USE_PROFILES: { html: true }, 
        ADD_TAGS: ['button'], 
        ADD_ATTR: ['data-bs-toggle', 'data-bs-target', 'aria-controls', 'aria-expanded', 'aria-labelledby', 'data-bs-parent', 'aria-label', 'role', 'class', 'alt', 'src', 'id', 'style', 'data-accordion-placeholder-id', 'data-img-id'], // data-img-id podría no ser necesario aquí ya que se resuelve antes
        FORCE_REL_FOR_EXTERNAL_LINKS: true 
    });
    
    mainContentPreview.innerHTML = cleanHtml;

    const accordionBodyPlaceholders = mainContentPreview.querySelectorAll('[data-accordion-placeholder-id]');
    accordionBodyPlaceholders.forEach(bodyElement => {
        const placeholderId = bodyElement.dataset.accordionPlaceholderId;
        if (accordionContentPlaceholders[placeholderId]) {
            const accordionMarkdownContent = accordionContentPlaceholders[placeholderId];
            // El contenido del acordeón (accordionMarkdownContent) ya ha pasado por preprocessImagePlaceholders
            // porque se tomó de 'processedText' después de la llamada a preprocessImagePlaceholders.
            // Así que las imágenes dentro del acordeón ya deberían tener su src Base64.
            const accordionRawHtml = marked.parse(accordionMarkdownContent);
            bodyElement.innerHTML = DOMPurify.sanitize(accordionRawHtml, { 
                USE_PROFILES: { html: true }, 
                ADD_TAGS: ['button'],
                ADD_ATTR: ['data-bs-toggle', 'data-bs-target', 'aria-controls', 'aria-expanded', 'aria-labelledby', 'data-bs-parent', 'aria-label', 'role', 'class', 'alt', 'src', 'id', 'style']
            });
        }
        bodyElement.removeAttribute('data-accordion-placeholder-id');
    });

    generateToc(mainContentPreview, indiceNavPreview);
    addCopyButtons(mainContentPreview); 

    if (scrollSpyInstance) {
        scrollSpyInstance.dispose();
        scrollSpyInstance = null;
    }

    if (htmlOutputBody && indiceContenidoPreviewContainer && mainContentPreview.innerHTML.trim() !== '' && indiceNavPreview.hasChildNodes()) {
         try {
            if (typeof bootstrap !== 'undefined' && bootstrap.ScrollSpy) {
                scrollSpyInstance = new bootstrap.ScrollSpy(htmlOutputBody, {
                     target: '#indiceContenidoPreview',
                     offset: SCROLL_OFFSET_PREVIEW,
                     rootMargin: '0px 0px -25%'
                });
                setTimeout(() => {
                     if (scrollSpyInstance) {
                         scrollSpyInstance.refresh();
                         window.dispatchEvent(new Event('scroll'));
                     }
                }, 300);
            } else {
                console.warn("Bootstrap or ScrollSpy not loaded.");
            }
        } catch(e) {
            console.error("Error initializing ScrollSpy:", e);
            scrollSpyInstance = null;
         }
    } else if (!mainContentPreview.innerHTML.trim()) {
        indiceNavPreview.innerHTML = '';
    } else {
         console.warn("ScrollSpy not initialized. Check if content generates valid headings for the TOC.");
    }
}


function downloadHtml() {
    cleanupImageStore(); // Limpia el imageStore
    const markdownText = markdownInput.value;
    if (!markdownText.trim()) { alert("No hay contenido Markdown para descargar."); return; }
    
    const preprocessedMarkdown = preprocessMarkdown(markdownText); 

    marked.setOptions({ gfm: true, breaks: false, pedantic: false, smartLists: true, smartypants: false });
    const rawHtmlSkeleton = marked.parse(preprocessedMarkdown);
    
    const cleanHtmlSkeleton = DOMPurify.sanitize(rawHtmlSkeleton, { 
        USE_PROFILES: { html: true }, 
        ADD_TAGS: ['button'], 
        ADD_ATTR: ['data-bs-toggle', 'data-bs-target', 'aria-controls', 'aria-expanded', 'aria-labelledby', 'data-bs-parent', 'aria-label', 'role', 'class', 'alt', 'src', 'id', 'style', 'data-accordion-placeholder-id', 'data-img-id'], // Igual que en preview
        FORCE_REL_FOR_EXTERNAL_LINKS: true 
    });
    
    const tempContent = document.createElement('div');
    tempContent.innerHTML = cleanHtmlSkeleton;

    const accordionBodyPlaceholdersInTemp = tempContent.querySelectorAll('[data-accordion-placeholder-id]');
    accordionBodyPlaceholdersInTemp.forEach(bodyElement => {
        const placeholderId = bodyElement.dataset.accordionPlaceholderId;
        if (accordionContentPlaceholders[placeholderId]) {
            const accordionMarkdownContent = accordionContentPlaceholders[placeholderId];
            const accordionRawHtml = marked.parse(accordionMarkdownContent);
            bodyElement.innerHTML = DOMPurify.sanitize(accordionRawHtml, { 
                USE_PROFILES: { html: true }, 
                ADD_TAGS: ['button'], 
                ADD_ATTR: ['data-bs-toggle', 'data-bs-target', 'aria-controls', 'aria-expanded', 'aria-labelledby', 'data-bs-parent', 'aria-label', 'role', 'class', 'alt', 'src', 'id', 'style']
            });
        }
        bodyElement.removeAttribute('data-accordion-placeholder-id');
    });

    const tempTocNav = document.createElement('nav');
    tempTocNav.classList.add('nav', 'nav-pills', 'flex-column');
    tempTocNav.id = 'indiceNav'; 
    generateToc(tempContent, tempTocNav); 
    
    const cssToEmbed = generateCssForDownload();
    const jsToEmbed = generateJsForDownload('#indiceContenido', '.generated-html-body', SCROLL_OFFSET_DOWNLOAD);
    const addCopyButtonsFuncStringForDownload = addCopyButtons.toString();
    
    const firstHeadingElement = tempContent.querySelector('h1:not(.accordion-body h1), h2:not(.accordion-body h2), h3:not(.accordion-body h3), h4:not(.accordion-body h4), h5:not(.accordion-body h5), h6:not(.accordion-body h6)');
    const pageTitle = firstHeadingElement ? firstHeadingElement.textContent.trim() : 'Documento Generado';
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const htmlAttributes = isDark ? `data-bs-theme="dark"` : '';
    const bodyClass = `generated-html-body`;

    const sidebarToggleJs = `
    // --- Sidebar toggle ---
    (function() {
        var toggleBtn = document.getElementById('sidebarToggleBtn');
        var sidebarCol = document.getElementById('sidebarCol');
        var mainCol = document.getElementById('mainCol');
        if (!toggleBtn || !sidebarCol || !mainCol) return;
        var STORAGE_KEY = 'sidebar-collapsed';
        var saved = localStorage.getItem(STORAGE_KEY);
        var startCollapsed = saved !== null ? saved === '1' : false;
        function apply(collapsed) {
            sidebarCol.classList.toggle('collapsed', collapsed);
            if (collapsed) { mainCol.className = 'col-12'; toggleBtn.classList.add('floating'); toggleBtn.title = 'Mostrar índice'; }
            else { mainCol.className = 'col-md-8 col-lg-9'; toggleBtn.classList.remove('floating'); toggleBtn.title = 'Ocultar índice'; }
        }
        apply(startCollapsed);
        toggleBtn.addEventListener('click', function() {
            var isCollapsed = sidebarCol.classList.contains('collapsed');
            var newState = !isCollapsed;
            apply(newState);
            localStorage.setItem(STORAGE_KEY, newState ? '1' : '0');
        });
    })();`;

    const sidebarToggleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z"/><path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="es" ${htmlAttributes}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <style>
/* Embedded CSS */
${cssToEmbed}
    </style>
</head>
<body class="${bodyClass}" data-bs-spy="scroll" data-bs-target="#indiceContenido" data-bs-offset="${SCROLL_OFFSET_DOWNLOAD + 10}" style="position:relative;">
    <div class="container-fluid mt-4">
        <button id="sidebarToggleBtn" class="sidebar-toggle-btn" type="button" title="Mostrar/ocultar índice" aria-label="Mostrar/ocultar índice">${sidebarToggleSvg}</button>
        <div class="row">
            <div id="sidebarCol" class="col-md-4 col-lg-3 sidebar-col">
                <nav id="indiceContenido">
                    <h5 class="mb-3">Índice</h5>
                    ${tempTocNav.outerHTML}
                </nav>
            </div>
            <div id="mainCol" class="col-md-8 col-lg-9">
                <main id="mainContent">
                    ${tempContent.innerHTML}
                </main>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"><\/script>
    <script>
// Embedded JS
${addCopyButtonsFuncStringForDownload}
${jsToEmbed}
${sidebarToggleJs}
    <\/script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filenameBase = firstHeadingElement ? slugify(firstHeadingElement.textContent.trim()) : 'documento';
    a.download = `${filenameBase || 'generado'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

        function insertAccordionTemplate() {
            const textarea = markdownInput;
            const startPos = textarea.selectionStart;
            const endPos = textarea.selectionEnd;
            const textToInsert =
`++S Título del Acordeón
Aquí va el contenido que estará inicialmente oculto.
Puedes usar **Markdown** aquí dentro.
++E
`;
            textarea.value = textarea.value.substring(0, startPos) + textToInsert + textarea.value.substring(endPos);
            const titlePlaceholder = 'Título del Acordeón';
            const cursorPos = startPos + textToInsert.indexOf(titlePlaceholder);
            const cursorEnd = cursorPos + titlePlaceholder.length;
            textarea.selectionStart = cursorPos;
            textarea.selectionEnd = cursorEnd;
            textarea.focus();
        }

        // --- INICIO CAMBIOS PARA IMÁGENES ---
        function insertImagePlaceholderInTextarea(altText = "Imagen insertada") {
            const textarea = markdownInput;
            const startPos = textarea.selectionStart;
            const endPos = textarea.selectionEnd;

            imageIdCounter++;
            const uniqueImageId = `embedded-img-${Date.now()}-${imageIdCounter}`;
            // Escapar comillas dobles en altText para el atributo HTML
            const safeAltText = altText.replace(/"/g, '&quot;'); 

            // Este es el placeholder que se insertará en el textarea
            const textToInsert = `\n<img data-img-id="${uniqueImageId}" alt="${safeAltText}" src="#image-placeholder" class="img-fluid">\n`;

            textarea.value = textarea.value.substring(0, startPos) + textToInsert + textarea.value.substring(endPos);
            const cursorPos = startPos + textToInsert.length;
            textarea.selectionStart = cursorPos;
            textarea.selectionEnd = cursorPos;
            textarea.focus();
            return uniqueImageId; // Devuelve el ID para usarlo en imageStore
        }

        function handleImageFileSelect(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                // Primero inserta el placeholder y obtiene el ID
                const imageId = insertImagePlaceholderInTextarea(file.name); 
                
                const reader = new FileReader();
                reader.onload = function(loadEvent) {
                    imageStore[imageId] = loadEvent.target.result; // Guarda el Base64 en el store
                    generateHtmlPreview(); // Ahora genera la vista previa, ya que el Base64 está listo
                }
                reader.onerror = function(errorEvent) {
                    console.error("Error leyendo el archivo de imagen:", errorEvent);
                    alert("Hubo un error al intentar leer el archivo de imagen.");
                    // Opcional: remover el placeholder si la lectura falla
                    markdownInput.value = markdownInput.value.replace(new RegExp(`<img data-img-id="${imageId}"[^>]*>`, 'g'), '');
                }
                reader.readAsDataURL(file);
            } else if (file) {
                alert("Por favor, selecciona un archivo de imagen válido (jpg, png, gif, svg, webp, etc.).");
            }
            event.target.value = null; // Resetea el input
        }
        // --- FIN CAMBIOS PARA IMÁGENES ---

        // --- Sidebar toggle (preview) ---
        function initSidebarToggle() {
            const toggleBtn = document.getElementById('sidebarToggleBtnPreview');
            const sidebarCol = document.getElementById('sidebarColPreview');
            const mainCol = document.getElementById('mainColPreview');
            if (!toggleBtn || !sidebarCol || !mainCol) return;

            const STORAGE_KEY = 'sidebar-collapsed';
            const saved = localStorage.getItem(STORAGE_KEY);
            // Default: collapsed en pantallas grandes para peso visual bajo
            const startCollapsed = saved !== null ? saved === '1' : false;

            function applySidebarState(collapsed) {
                sidebarCol.classList.toggle('collapsed', collapsed);
                if (collapsed) {
                    mainCol.className = 'col-12';
                    toggleBtn.classList.add('floating');
                    toggleBtn.title = 'Mostrar índice';
                } else {
                    mainCol.className = 'col-md-8 col-lg-9';
                    toggleBtn.classList.remove('floating');
                    toggleBtn.title = 'Ocultar índice';
                }
            }

            applySidebarState(startCollapsed);

            toggleBtn.addEventListener('click', () => {
                const isCollapsed = sidebarCol.classList.contains('collapsed');
                const newState = !isCollapsed;
                applySidebarState(newState);
                localStorage.setItem(STORAGE_KEY, newState ? '1' : '0');
                // Refresh ScrollSpy after transition
                setTimeout(() => {
                    if (scrollSpyInstance) {
                        scrollSpyInstance.refresh();
                    }
                }, 350);
            });
        }

        function initializeApp() {
            themes.forEach((theme, index) => { const option = document.createElement('option'); option.value = index; option.textContent = theme.name; themeSelector.appendChild(option); });
            personalizationInputs.forEach(input => {
                const varName = input.dataset.cssVar;
                input.addEventListener('input', (event) => {
                    if (varName) {
                        document.documentElement.style.setProperty(varName, event.target.value);
                        generateHtmlPreview(); 
                    }
                });
            });
            themeSelector.addEventListener('change', (event) => {
                const selectedIndex = parseInt(event.target.value, 10);
                if (!isNaN(selectedIndex) && selectedIndex >= 0) {
                    applyTheme(selectedIndex);
                    generateHtmlPreview();
                }
            });
            generateBtn.addEventListener('click', generateHtmlPreview);
            downloadBtn.addEventListener('click', downloadHtml);
            insertAccordionBtn.addEventListener('click', insertAccordionTemplate);
            insertImageBtn.addEventListener('click', () => { imageFileInput.click(); });
            imageFileInput.addEventListener('change', handleImageFileSelect); // Usará el nuevo handleImageFileSelect
            
            applyTheme(0);
            themeSelector.value = "0";
            initSidebarToggle();
            generateHtmlPreview();
        }

        document.addEventListener('DOMContentLoaded', initializeApp);
