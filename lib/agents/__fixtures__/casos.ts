/**
 * Casos de prueba realistas de ecommerce LATAM, uno por cada agente del catálogo.
 *
 * Sirven de input fijo para medir prompts (antes/después de una capa de writing
 * gates, contrato de salida, etc.) sin depender de lo que un usuario tipee en el
 * momento. Cada caso llena todos los campos `required` de `agent.inputSchema` y
 * los opcionales que le dan contexto real al caso, con valores de `enum` exactos
 * cuando el campo lo tiene.
 *
 * No se importa `getAllAgents()` acá para no crear un ciclo de validación en el
 * propio archivo de datos: la cobertura (que CASOS tenga exactamente los 28 slugs
 * del catálogo) y la validación de campos/enums las hace `dump-prompts.mts`.
 */

export interface CasoAgente {
  slug: string
  /** 1 línea: qué situación real representa y qué debería hacer bien el agente. */
  nota: string
  input: Record<string, string>
}

export const CASOS: readonly CasoAgente[] = [
  // ---------------------------------------------------------------- copy
  {
    slug: 'content-engine',
    nota: 'Marca de fajas postparto arranca calendario de contenido para Reels; el agente debe priorizar ganchos con datos concretos, no genéricos.',
    input: {
      niche: 'Fajas moldeadoras postparto en Colombia',
      platform: 'Instagram Reels',
      objective: 'Ventas',
      tone: 'Urgente',
      context:
        'Lanzamos línea nueva de fajas postparto con panel lumbar reforzado, precio COP 149.900, envío contraentrega en Bogotá y Medellín.',
    },
  },
  {
    slug: 'ugc-scripts',
    nota: 'Marca de colágeno hidrolizado necesita guiones de UGC tipo antes/después con beneficios verificables, sin relleno de "sinergia" ni "revolucionario".',
    input: {
      product: 'Colágeno hidrolizado en polvo sabor mango, frasco 300g',
      audience: 'Mujeres 30-45 años preocupadas por elasticidad de la piel y dolor articular',
      duration: '30 segundos',
      style: 'Antes/Después',
      benefits:
        'Piel más firme en 21 días, reduce dolor articular, mejora cabello y uñas, sin sabor a proteína',
    },
  },
  {
    slug: 'caption-generator',
    nota: 'Lanzamiento de gomitas de melatonina; el caption debe ir listo para pegar, con hook en la primera línea y sin preámbulo tipo "Claro, aquí tienes".',
    input: {
      platform: 'Instagram',
      topic: 'Lanzamiento de gomitas de melatonina para dormir mejor',
      tone: 'Promocional',
      cta: 'Comprá con envío contraentrega en 24-48h',
    },
  },
  {
    slug: 'hook-writer',
    nota: 'Mismo lanzamiento de melatonina pero para hooks de video; agente sin knowledge base debe igual devolver hooks con gatillo psicológico nombrado.',
    input: {
      topic: 'gomitas de melatonina para dormir mejor',
      niche: 'suplementos para el sueño',
      format: 'Video (spoken)',
    },
  },
  // ---------------------------------------------------------------- ads
  {
    slug: 'meta-doctor',
    nota: 'Campaña real de 7 días con ROAS bajo (1.4) y frecuencia alta (3.8); el diagnóstico debe usar los benchmarks, no una lista genérica de síntomas.',
    input: {
      campaignData:
        "Campaña 'Faja Postparto - Conversiones - COL', últimos 7 días: gasto COP 1.850.000, impresiones 214.300, CTR 0.9%, CPC COP 960, 38 compras, CPA COP 48.700, ROAS 1.4, frecuencia 3.8",
      budget: 'COP 280.000 diarios',
      objective: 'Conversiones',
      offer: 'Faja moldeadora postparto COP 149.900',
      vertical: 'Ecommerce',
      country: 'Colombia',
    },
  },
  {
    slug: 'ad-copy-generator',
    nota: 'Zapatillas ortopédicas con oferta 2x1; el copy debe respetar límites de caracteres reales de Meta, no solo "sonar bien".',
    input: {
      product: 'Zapatillas ortopédicas para fascitis plantar, marca PasoFirme',
      platform: 'Meta Ads',
      audience: 'Mujeres y hombres 45-65 años con dolor de talón o fascitis plantar en Colombia y México',
      offer: '2x1 en la segunda unidad, COP 189.900',
      tone: 'Aspiracional',
      framework: 'PAS',
      adFormat: 'Feed cuadrado 1080x1080',
    },
  },
  {
    slug: 'audience-analyzer',
    nota: 'Kit de skincare coreano necesita buyer personas con objeción y qué ya probó, no estereotipos vacíos.',
    input: {
      product: 'Kit de skincare coreano 5 pasos (limpiador, tónico, esencia, crema, protector solar)',
      industry: 'Belleza y cuidado facial',
      region: 'Colombia y México',
      price: 'COP 129.900 el kit completo',
    },
  },
  {
    slug: 'ad-creative-planner',
    nota: 'Cafetera portátil de oficina necesita brief creativo completo con prompt de imagen listo, no una idea abstracta.',
    input: {
      product: 'Cafetera portátil de goteo manual para oficina, marca BrewGo',
      platform: 'Meta Ads',
      objective: 'Conversiones',
      adFormat: 'Feed cuadrado 1080x1080',
      brandColors: '#2E2A24, #C9A227, #FAF7F2',
      references: 'Estética minimalista tipo Nespresso, fondo de mármol claro',
      variants: '5',
    },
  },
  {
    slug: 'ads-auditor',
    nota: 'Cuenta multi-campaña con presupuesto mensual real; la auditoría debe basarse en los números pegados, no en generalidades de "optimizá la segmentación".',
    input: {
      platform: 'Meta Ads',
      campaignData:
        "3 campañas activas: 'Prospecting - Interereses' (COP 3.200.000/mes, ROAS 1.2, frecuencia 2.1, 4 creativos), 'Retargeting - ATC 14d' (COP 1.800.000/mes, ROAS 3.4, frecuencia 5.6, 2 creativos), 'Advantage+ Catalog' (COP 4.000.000/mes, ROAS 1.6, frecuencia 3.0, 6 creativos). CTR general 0.8%, CPM COP 38.500, 3 audiencias solapadas al 40%+ según Meta.",
      budget: 'COP 9.000.000 mensuales',
      vertical: 'Ecommerce',
      country: 'Colombia',
    },
  },
  // ---------------------------------------------------------------- research
  {
    slug: 'product-hunter',
    nota: 'Masajeador de cuello con margen ajustado; el scoring debe marcar el margen real bajo (costo/precio) como flag, no ignorarlo.',
    input: {
      product: 'Masajeador de cuello y hombros con calor infrarrojo',
      source: 'Proveedor Dropi Colombia',
      cost: 'COP 42.000',
      price: 'COP 119.900',
      niche: 'Bienestar y relajación',
    },
  },
  {
    slug: 'competitor-watch',
    nota: 'Competidor ficticio verosímil (no marca real) en el mismo nicho de fajas postparto; agente sin knowledge base igual debe entregar matriz comparativa.',
    input: {
      competitor: 'Fajas Marielys (fajasmarielys.co)',
      url: 'https://fajasmarielys.co',
      yourProduct: 'Fajas moldeadoras postparto premium',
      focus: 'Análisis completo',
    },
  },
  {
    slug: 'niche-analyzer',
    nota: 'Nicho de bandas de resistencia; debe evaluar demanda/competencia/margen sin inventar tamaños de mercado que no tiene.',
    input: {
      niche: 'Bandas de resistencia para entrenamiento en casa',
      region: 'Colombia',
      model: 'Dropshipping',
    },
  },
  // ---------------------------------------------------------------- ugc
  {
    slug: 'image-prompts',
    nota: 'Prompt de producto para colágeno; debe salir en inglés, en bloque de código, listo para pegar en Midjourney.',
    input: {
      subject: 'Frasco de colágeno hidrolizado sabor mango sobre mármol claro con rodajas de mango',
      style: 'Fotografía de producto',
      usage: 'Anuncios',
      model: 'Midjourney',
    },
  },
  {
    slug: 'broll-generator',
    nota: 'Unboxing de cepillo de dientes eléctrico; shot list debe ser grabable con iPhone, no conceptos abstractos.',
    input: {
      product: 'Cepillo de dientes eléctrico sónico recargable',
      videoType: 'Unboxing',
      shots: '10',
      style: 'Limpio/Minimalista',
    },
  },
  {
    slug: 'ad-image-prompter',
    nota: 'Lámpara de escritorio con carga inalámbrica; el prompt de imagen y el texto sobre la imagen deben respetar límites de caracteres por bloque.',
    input: {
      product: 'Lámpara de escritorio LED con carga inalámbrica',
      adType: 'Feed estático',
      composition: 'Producto centrado',
      brandColors: '#1B1F3B, #F2C14E',
      mood: 'Minimalista/Clean',
      model: 'DALL-E 3',
    },
  },
  // ---------------------------------------------------------------- ecommerce
  {
    slug: 'shopify-assistant',
    nota: 'Pregunta técnica puntual de Shopify sobre contraentrega; la respuesta debe ser corta y con la ruta exacta de la interfaz, no un ensayo.',
    input: {
      question:
        '¿Cómo activo el pago contraentrega en mi tienda Shopify vitalfit.com.co para clientes en Colombia sin usar una app externa?',
    },
  },
  {
    slug: 'logistics-tracker',
    nota: 'Datos reales de 4 semanas con devolución alta (14%); el diagnóstico debe apuntar a la causa, no listar todos los síntomas por igual.',
    input: {
      logisticsData:
        'En las últimas 4 semanas: 320 pedidos, 68% contraentrega, tiempo promedio de entrega 6.5 días en Bogotá y 9 días en ciudades intermedias, tasa de devolución 14%, transportadora actual Coordinadora con 3 quejas por retraso esta semana',
      country: 'Colombia',
      mainIssue: 'Tiempos de entrega',
    },
  },
  {
    slug: 'supplier-finder',
    nota: 'Sourcing de proteína vegetal vía Dropi; el agente NO debe inventar precios ni nombres de proveedores puntuales, solo fórmulas y dónde verificar.',
    input: {
      product: 'Proteína vegetal en polvo sabor chocolate, bolsa 500g',
      platform: 'Dropi',
      volume: '200-500',
      destination: 'Colombia',
    },
  },
  {
    slug: 'product-descriptions',
    nota: 'Organizador de closet plegable; debe liderar con beneficio (espacio, orden) y no con la especificación técnica primero.',
    input: {
      product: 'Organizador de closet plegable con 12 compartimentos',
      category: 'Hogar y organización',
      price: 'COP 89.900',
      benefits:
        'Duplica el espacio del closet, tela transpirable resistente al polvo, se arma sin herramientas en 5 minutos',
      keywords: 'organizador de closet, orden armario, compartimentos plegables',
    },
  },
  {
    slug: 'shopify-section-builder',
    nota: 'Franja de trust badges para vitalfit.com.co; el output debe ser un solo bloque .liquid completo, sin recortes.',
    input: {
      sectionType: 'Trust badges',
      description:
        'Franja de confianza debajo del hero con contraentrega, envío gratis desde COP 150.000, garantía 30 días y pago seguro con PSE/Nequi, para la tienda vitalfit.com.co',
      approach: 'Liquid puro (sin JS)',
      style: 'Minimalista',
      responsive: 'Mobile-first',
      colorScheme: '#0B3D2E, #F5F1E8',
    },
  },
  {
    slug: 'landing-page-builder',
    nota: 'Landing de lanzamiento de faja postparto con trust signals reales; la estructura debe ir en orden de scroll con copy literal, no descripciones vagas.',
    input: {
      goal: 'Lanzamiento de producto',
      product: 'Faja moldeadora postparto con panel lumbar reforzado',
      audience: 'Mujeres 25-40 años en posparto en Bogotá y Medellín que buscan recuperar la figura sin cirugía',
      trust: 'Más de 1.240 reseñas verificadas, garantía de 30 días, pago contraentrega, envío en 24-48h',
      country: 'Colombia',
    },
  },
  // ---------------------------------------------------------------- analytics
  {
    slug: 'performance-tracker',
    nota: 'Caída de conversión semana a semana en vitalfit.com.co; el agente debe encontrar UNA causa probable, no listar todas las variables posibles.',
    input: {
      metrics:
        'Última semana tienda vitalfit.com.co: 4.120 visitas, tasa de conversión 1.6%, AOV COP 138.500, ROAS blended 1.9, 66 pedidos, tickets de soporte por demoras de envío subieron 30%',
      period: 'Última semana',
      question: '¿Por qué bajó la conversión respecto a la semana pasada que fue 2.1%?',
      platform: 'Tienda/General',
      vertical: 'Ecommerce',
    },
  },
  {
    slug: 'roi-calculator',
    nota: 'Masajeador de cuello con CPA alto relativo al margen; debe mostrar la fórmula de cada resultado, no solo el número final.',
    input: {
      cost: 'COP 42.000',
      price: 'COP 119.900',
      shipping: 'COP 12.000',
      adSpend: 'COP 28.000 por venta (CPA actual)',
      other: 'Pasarela de pago 3.5% + empaque COP 2.500',
    },
  },
  // ---------------------------------------------------------------- strategy
  {
    slug: 'business-planner',
    nota: 'Plan de negocio para tienda de bienestar en dropshipping con presupuesto y tiempo limitados; los milestones deben ser números, no intenciones.',
    input: {
      idea:
        'Tienda Shopify de accesorios de bienestar y recuperación física (masajeadores, bandas, fajas) para el mercado colombiano, empezando con dropshipping desde Dropi',
      budget: 'COP 6.000.000',
      experience: 'Algo de experiencia',
      time: 'Part-time (2-4h/día)',
    },
  },
  {
    slug: 'launch-checklist',
    nota: 'Lanzamiento de tienda nueva con fecha objetivo concreta; el checklist debe distinguir bloqueantes de optimización, no una lista plana.',
    input: {
      type: 'Nueva tienda',
      platform: 'Shopify',
      date: '15 de octubre de 2026',
      ready:
        'Dominio comprado, 8 productos cargados con fotos, pasarela Wompi conectada, cuenta de Meta Business verificada',
    },
  },
  {
    slug: 'campaign-architect',
    nota: 'Lanzamiento de cuenta nueva sin historial (0 a 1) con presupuesto en USD; la arquitectura debe incluir presupuesto mínimo viable, no solo el ideal.',
    input: {
      objective: 'Lanzamiento (0 a 1)',
      budget: 'USD 1.200 mensuales',
      product: 'Tienda vitalfit.com.co, accesorios de bienestar y recuperación física',
      currentPlatforms: 'Ninguna (empezando)',
      country: 'Colombia',
      aov: 'COP 135.000',
    },
  },
  // ---------------------------------------------------------------- cro
  {
    slug: 'cro-auditor',
    nota: 'Auditoría de PDP con conversión baja y problemas concretos ya identificados; el score debe basarse en esos hallazgos, no en genéricos.',
    input: {
      storeUrl: 'vitalfit.com.co',
      pageType: 'PDP (Producto)',
      currentCR: '1.6%',
      issues:
        'El botón de agregar al carrito queda debajo del fold en mobile, no hay reviews visibles, tiempo de carga de 5.2 segundos según PageSpeed',
      country: 'Colombia',
    },
  },
  {
    slug: 'landing-optimizer',
    nota: 'Landing con estructura débil (CTA solo al final) para la misma faja postparto; debe priorizar quick wins de alto impacto y bajo esfuerzo.',
    input: {
      currentStructure:
        'Hero con imagen de producto y headline genérico, luego 3 bullets de beneficios, galería de fotos, un bloque de FAQ y botón de compra al final de la página',
      product: 'Faja moldeadora postparto',
      traffic: 'Meta Ads',
      paymentMethods: 'PSE, Nequi, tarjeta de crédito, contraentrega',
      country: 'Colombia',
    },
  },
]
