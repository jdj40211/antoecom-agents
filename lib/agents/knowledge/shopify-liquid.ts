export const LIQUID_SECTION_RULES = `REGLAS PARA GENERAR SECCIONES SHOPIFY LIQUID:

ESTRUCTURA DE ARCHIVO (.liquid):
1. HTML semántico con nomenclatura BEM (section-name__element, section-name__element--modifier)
2. <style> con CSS scoped: #shopify-section-{{ section.id }} .section-name { ... }
3. <script> (opcional): IIFE pattern, vanilla JS puro, solo para interacciones
4. {% schema %} al final: JSON con name, tag, class, settings[], blocks[], presets[]

REGLAS ESTRICTAS:
- Archivos self-contained (no CSS/JS externos)
- NO usar frameworks (Tailwind, Bootstrap, Alpine)
- JavaScript mínimo: solo para interacciones (carousel, accordion, tabs)
- Mobile breakpoint: @media (max-width: 50.625em)
- Siempre incluir settings de spacing_desktop (range 20-100, default 60) y spacing_mobile (range 20-60, default 40)
- Incluir presets en schema para activación instantánea en el editor
- Usar variables del tema: var(--rpn) para margen negativo, var(--rpp) para padding del tema
- Imágenes siempre con loading="lazy" y sizes attribute
- Nunca pushear a Shopify directamente (usuario sube manualmente)
- Cada sección funciona independiente del tema

NOMENCLATURA BEM:
- Bloque: .section-hero
- Elemento: .section-hero__title, .section-hero__image
- Modificador: .section-hero__title--small, .section-hero__card--featured`

export const LIQUID_SETTINGS_TYPES = `TIPOS DE SETTINGS PARA SCHEMA SHOPIFY:

TEXTO:
- "type": "text" (una línea, max 255 chars)
- "type": "textarea" (múltiples líneas)
- "type": "richtext" (con formato: bold, italic, links)
- "type": "html" (HTML libre, para código embed)
- "type": "inline_richtext" (richtext sin wrapping <p>)

MEDIA:
- "type": "image_picker" (selector de imagen de Shopify)
- "type": "video" (video de Shopify hosted)
- "type": "video_url" (YouTube/Vimeo URL)

VALORES:
- "type": "number" (entero)
- "type": "range" (slider con min, max, step, unit)
- "type": "color" (color picker)
- "type": "color_background" (gradiente o color)

SELECCIÓN:
- "type": "select" (dropdown con options[])
- "type": "checkbox" (boolean)
- "type": "radio" (radio buttons con options[])

REFERENCIAS:
- "type": "url" (URL picker)
- "type": "link_list" (menú de navegación)
- "type": "page" (selector de página)
- "type": "blog" (selector de blog)
- "type": "collection" (selector de colección)
- "type": "product" (selector de producto)
- "type": "product_list" (múltiples productos)
- "type": "collection_list" (múltiples colecciones)

CADA SETTING NECESITA: id, type, label. Opcionales: default, info, placeholder`

export const LIQUID_PATTERNS = `PATRONES DE CÓDIGO LIQUID COMUNES:

1. FULL-WIDTH (romper padding del tema):
   margin-left: var(--rpn);
   margin-right: var(--rpn);
   padding-left: var(--rpp);
   padding-right: var(--rpp);

2. DOS COLUMNAS → STACK EN MOBILE:
   .container { display: flex; gap: 50px; align-items: center; }
   @media (max-width: 50.625em) { .container { flex-direction: column; gap: 24px; } }

3. CAROUSEL HORIZONTAL (touch scroll):
   .viewport { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
   .viewport::-webkit-scrollbar { display: none; }
   .track { display: flex; gap: 8px; }
   .card { flex: 0 0 270px; scroll-snap-align: start; }

4. ACCORDION NATIVO (single-open con JS):
   HTML: <details><summary>Pregunta</summary><div class="content">Respuesta</div></details>
   JS: details.forEach(d => d.addEventListener('toggle', () => { if(d.open) others.forEach(o => o.removeAttribute('open')); }));

5. GRID RESPONSIVE (2x2 → 1 col):
   .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
   @media (max-width: 50.625em) { .grid { grid-template-columns: 1fr; } }

6. IMAGEN RESPONSIVE LIQUID:
   {{ section.settings.image | image_url: width: 800 | image_tag: loading: 'lazy', sizes: '(max-width: 810px) 100vw, 400px', widths: '400,600,800', alt: section.settings.image.alt }}

7. BLOCKS DINÁMICOS (para items repetibles):
   {% for block in section.blocks %}
     <div {{ block.shopify_attributes }}>
       {{ block.settings.title }}
     </div>
   {% endfor %}

8. CONDICIONALES DE VISIBILIDAD:
   {% if section.settings.show_badge %}
     <span class="badge">{{ section.settings.badge_text }}</span>
   {% endif %}`
