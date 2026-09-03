```liquid
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">

<div class="trust-badges" style="--spacing-desktop: {{ section.settings.spacing_desktop }}px; --spacing-mobile: {{ section.settings.spacing_mobile }}px; --tb-bg: {{ section.settings.background_color }}; --tb-text: {{ section.settings.text_color }};">
  <div class="trust-badges__grid">
    {% for block in section.blocks %}
      <div class="trust-badges__item" {{ block.shopify_attributes }}>
        <span class="trust-badges__icon">
          {% case block.settings.icon %}
            {% when 'truck' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 4h14v11H1z"/>
                <path d="M15 8h4l3 3v4h-7z"/>
                <circle cx="6" cy="18" r="2"/>
                <circle cx="17" cy="18" r="2"/>
              </svg>
            {% when 'shield' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/>
                <path d="M8.5 12l2.3 2.3 4.7-4.7"/>
              </svg>
            {% when 'lock' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="10" width="16" height="10" rx="1.5"/>
                <path d="M7 10V7a5 5 0 0110 0v3"/>
                <circle cx="12" cy="15" r="1.5"/>
              </svg>
            {% when 'cash' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="6" width="20" height="12" rx="1.5"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M5 9v6M19 9v6"/>
              </svg>
          {% endcase %}
        </span>
        <span class="trust-badges__label">{{ block.settings.text }}</span>
      </div>
    {% endfor %}
  </div>
</div>

<style>
  #shopify-section-{{ section.id }} .trust-badges {
    font-family: 'Manrope', sans-serif;
    background-color: var(--tb-bg);
    color: var(--tb-text);
    margin-left: var(--rpn);
    margin-right: var(--rpn);
    padding-left: var(--rpp);
    padding-right: var(--rpp);
    padding-top: var(--spacing-desktop);
    padding-bottom: var(--spacing-desktop);
  }

  #shopify-section-{{ section.id }} .trust-badges__grid {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 48px;
    max-width: 1100px;
    margin: 0 auto;
  }

  #shopify-section-{{ section.id }} .trust-badges__item {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    justify-content: center;
    text-align: left;
  }

  #shopify-section-{{ section.id }} .trust-badges__icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.92;
  }

  #shopify-section-{{ section.id }} .trust-badges__icon svg {
    width: 100%;
    height: 100%;
  }

  #shopify-section-{{ section.id }} .trust-badges__label {
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }

  @media (max-width: 50.625em) {
    #shopify-section-{{ section.id }} .trust-badges {
      padding-top: var(--spacing-mobile);
      padding-bottom: var(--spacing-mobile);
    }

    #shopify-section-{{ section.id }} .trust-badges__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px 16px;
    }

    #shopify-section-{{ section.id }} .trust-badges__item {
      justify-content: flex-start;
    }

    #shopify-section-{{ section.id }} .trust-badges__icon {
      width: 24px;
      height: 24px;
    }

    #shopify-section-{{ section.id }} .trust-badges__label {
      font-size: 12px;
    }
  }
</style>

{% schema %}
{
  "name": "Barra de confianza",
  "tag": "section",
  "class": "section",
  "settings": [
    {
      "type": "color",
      "id": "background_color",
      "label": "Color de fondo",
      "default": "#0B3D2E"
    },
    {
      "type": "color",
      "id": "text_color",
      "label": "Color de texto e íconos",
      "default": "#F5F1E8"
    },
    {
      "type": "range",
      "id": "spacing_desktop",
      "min": 20,
      "max": 100,
      "step": 5,
      "unit": "px",
      "label": "Espaciado desktop",
      "default": 60
    },
    {
      "type": "range",
      "id": "spacing_mobile",
      "min": 20,
      "max": 60,
      "step": 5,
      "unit": "px",
      "label": "Espaciado mobile",
      "default": 40
    }
  ],
  "blocks": [
    {
      "type": "badge",
      "name": "Badge",
      "settings": [
        {
          "type": "select",
          "id": "icon",
          "label": "Ícono",
          "options": [
            { "value": "truck", "label": "Camión" },
            { "value": "shield", "label": "Escudo" },
            { "value": "lock", "label": "Candado" },
            { "value": "cash", "label": "Efectivo" }
          ],
          "default": "truck"
        },
        {
          "type": "text",
          "id": "text",
          "label": "Texto (máx. 3 palabras)",
          "default": "Envío gratis"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Barra de confianza",
      "blocks": [
        { "type": "badge", "settings": { "icon": "cash", "text": "Pago contraentrega" } },
        { "type": "badge", "settings": { "icon": "truck", "text": "Envío gratis desde $150.000" } },
        { "type": "badge", "settings": { "icon": "shield", "text": "Garantía 30 días" } },
        { "type": "badge", "settings": { "icon": "lock", "text": "Pago seguro PSE/Nequi" } }
      ]
    }
  ]
}
{% endschema %}
```

**Instalación:** subí el archivo a `sections/trust-badges.liquid` desde el admin de Shopify (Editor de código > Sections > Agregar sección). En el editor de temas, agregala desde "Agregar sección" en cualquier plantilla de producto, justo debajo del hero.

**Settings:**
| Setting | Tipo | Default |
|---|---|---|
| Color de fondo | color | #0B3D2E |
| Color de texto e íconos | color | #F5F1E8 |
| Espaciado desktop | range | 60px |
| Espaciado mobile | range | 40px |
| Texto de cada badge (block) | text | según preset |

**Defaults:** el preset carga los 4 badges de vitalfit.com.co (contraentrega, envío gratis desde $150.000, garantía 30 días, PSE/Nequi), ninguno queda vacío.
