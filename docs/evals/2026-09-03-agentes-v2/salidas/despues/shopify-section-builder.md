Franja de trust badges full-width para vitalfit.com.co: contraentrega, envío gratis desde COP 150.000, garantía 30 días y pago seguro con PSE/Nequi, en fila en desktop y grilla 2x2 en mobile. Liquid puro, sin JavaScript, con los 4 badges precargados en el preset.

```liquid
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">

<style>
  #shopify-section-{{ section.id }} .trust-badges {
    background: {{ section.settings.bg_color }};
    color: {{ section.settings.text_color }};
    font-family: 'Manrope', sans-serif;
    margin-left: var(--rpn);
    margin-right: var(--rpn);
    padding-left: var(--rpp);
    padding-right: var(--rpp);
    padding-top: {{ section.settings.spacing_desktop }}px;
    padding-bottom: {{ section.settings.spacing_desktop }}px;
    overflow: hidden;

    .trust-badges__container {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
    }

    .trust-badges__item {
      flex: 1 1 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 0 20px;
      position: relative;
    }

    .trust-badges__item + .trust-badges__item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 1px;
      background: color-mix(in srgb, {{ section.settings.text_color }} 18%, transparent);
    }

    .trust-badges__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid color-mix(in srgb, {{ section.settings.text_color }} 30%, transparent);
      transition: transform 0.25s ease, border-color 0.25s ease;
    }

    .trust-badges__icon svg {
      width: 22px;
      height: 22px;
    }

    .trust-badges__item:hover .trust-badges__icon {
      transform: translateY(-3px);
      border-color: {{ section.settings.text_color }};
    }

    .trust-badges__title {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.01em;
      line-height: 1.3;
    }

    .trust-badges__subtitle {
      margin: 0;
      font-size: 12.5px;
      font-weight: 500;
      line-height: 1.3;
      opacity: 0.75;
    }
  }

  @media (max-width: 50.625em) {
    #shopify-section-{{ section.id }} .trust-badges {
      padding-top: {{ section.settings.spacing_mobile }}px;
      padding-bottom: {{ section.settings.spacing_mobile }}px;

      .trust-badges__container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px 12px;
      }

      .trust-badges__item {
        padding: 0 8px;
      }

      .trust-badges__item::before {
        display: none;
      }

      .trust-badges__title {
        font-size: 13px;
      }

      .trust-badges__subtitle {
        font-size: 11.5px;
      }
    }
  }
</style>

<div class="trust-badges">
  <div class="trust-badges__container">
    {% for block in section.blocks %}
      <div class="trust-badges__item" {{ block.shopify_attributes }}>
        <span class="trust-badges__icon">
          {% case block.settings.icon %}
            {% when 'truck' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h13v10H1z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg>
            {% when 'box' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 7.5V16l9 4.5 9-4.5V7.5"/><path d="M12 12v8.5"/></svg>
            {% when 'shield' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z"/><path d="M9 12l2 2 4-4"/></svg>
            {% when 'lock' %}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          {% endcase %}
        </span>
        <p class="trust-badges__title">{{ block.settings.title }}</p>
        {% if block.settings.subtitle != blank %}
          <p class="trust-badges__subtitle">{{ block.settings.subtitle }}</p>
        {% endif %}
      </div>
    {% endfor %}
  </div>
</div>

{% schema %}
{
  "name": "Trust badges",
  "tag": "section",
  "class": "section-trust-badges",
  "max_blocks": 4,
  "settings": [
    {
      "type": "color",
      "id": "bg_color",
      "label": "Color de fondo",
      "default": "#0B3D2E"
    },
    {
      "type": "color",
      "id": "text_color",
      "label": "Color de texto e iconos",
      "default": "#F5F1E8"
    },
    {
      "type": "range",
      "id": "spacing_desktop",
      "min": 20,
      "max": 100,
      "step": 5,
      "unit": "px",
      "label": "Espaciado vertical (escritorio)",
      "default": 60
    },
    {
      "type": "range",
      "id": "spacing_mobile",
      "min": 20,
      "max": 60,
      "step": 5,
      "unit": "px",
      "label": "Espaciado vertical (mobile)",
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
          "label": "Icono",
          "options": [
            { "value": "truck", "label": "Camión" },
            { "value": "box", "label": "Caja" },
            { "value": "shield", "label": "Escudo" },
            { "value": "lock", "label": "Candado" }
          ],
          "default": "truck"
        },
        {
          "type": "text",
          "id": "title",
          "label": "Texto principal",
          "default": "Contraentrega"
        },
        {
          "type": "text",
          "id": "subtitle",
          "label": "Texto secundario",
          "default": "Paga al recibir"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Trust badges",
      "blocks": [
        {
          "type": "badge",
          "settings": { "icon": "truck", "title": "Contraentrega", "subtitle": "Paga al recibir" }
        },
        {
          "type": "badge",
          "settings": { "icon": "box", "title": "Envío gratis", "subtitle": "Desde COP 150.000" }
        },
        {
          "type": "badge",
          "settings": { "icon": "shield", "title": "Garantía 30 días", "subtitle": "Cambios y devoluciones" }
        },
        {
          "type": "badge",
          "settings": { "icon": "lock", "title": "Pago seguro", "subtitle": "PSE y Nequi" }
        }
      ]
    }
  ]
}
{% endschema %}
```

Instalación: guarda el archivo como `sections/trust-badges.liquid`. En el editor de temas, dentro de la plantilla de producto (justo debajo del hero), abre "Agregar sección" y busca "Trust badges". Los 4 bloques del preset se agregan solos, sin configuración extra.

Settings:
| Setting | Tipo | Default |
|---|---|---|
| Color de fondo | color | #0B3D2E |
| Color de texto e iconos | color | #F5F1E8 |
| Espaciado vertical (escritorio) | range | 60 |
| Espaciado vertical (mobile) | range | 40 |
| Icono (por bloque) | select | truck |
| Texto principal (por bloque) | text | según bloque |
| Texto secundario (por bloque) | text | según bloque |

Defaults: el preset trae los 4 badges completos con los datos que diste (contraentrega, envío gratis desde COP 150.000, garantía 30 días, PSE/Nequi), ninguno queda con placeholder genérico.

Confianza: alta
