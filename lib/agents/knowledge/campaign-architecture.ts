export const CAMPAIGN_ARCHITECTURE = `ARQUITECTURA DE CAMPAÑAS POR PLATAFORMA:

GOOGLE ADS (Ecommerce):
├── Brand Search (always-on, proteger marca)
├── PMax: Best Sellers (productos probados, mayor presupuesto)
├── PMax: New Arrivals (productos nuevos, presupuesto test)
├── PMax: Sale Items (promociones activas)
├── Standard Shopping (price-sensitive queries, control de bids)
└── Search Non-Brand (category terms, intent alto)

META ADS (Ecommerce):
├── Advantage+ Sales Campaign (150+ creativos: image+video+UGC)
│   └── Dejar que Andromeda optimice (no segmentar manualmente)
├── Prospecting: Lookalike 1 a 3% + Interest stacks
├── Retargeting:
│   ├── ViewContent 7d (tibio)
│   ├── AddToCart 14d (caliente)
│   └── Purchasers 180d (exclusión o upsell)
└── Testing: nuevos creativos, audiencias, formatos

TIKTOK ADS (Ecommerce):
├── TikTok Shop (si aplica, CVR >10%)
├── Smart+ Campaigns (automático, dejar aprender)
├── Spark Ads (contenido orgánico con tracción)
└── Standard In-feed (product demos, UGC, tutoriales)

REGLAS DE ESTRUCTURA:
- Máximo 3 a 5 campañas activas por plataforma (evitar fragmentación)
- Cada campaña debe tener presupuesto suficiente para salir de learning
- Separar prospecting de retargeting (presupuestos independientes)
- No crear ad sets/groups con audiencias que se solapan >30%`

export const BUDGET_MIX = `DISTRIBUCIÓN DE PRESUPUESTO RECOMENDADA:

ECOMMERCE (DISTRIBUCIÓN POR PLATAFORMA):
- Meta Ads: 50 a 68% (motor principal de ventas en LATAM)
- Google Shopping/PMax: 23 a 30% (capturar intent de compra)
- TikTok Ads: 5 a 15% (awareness + conversiones en audiencia joven)
- Email/Retention: 5% (flows automatizados, no requiere ad spend pero sí herramientas)
- Microsoft Ads: 2 a 5% (audiencia complementaria, CPCs bajos)

DISTRIBUCIÓN POR ETAPA DE FUNNEL:
- TOFU (Awareness): 20 a 30% del budget total
- MOFU (Consideration): 30 a 40% del budget total
- BOFU (Conversión): 30 a 40% del budget total
- Retención: 5 a 10% del budget total

DISTRIBUCIÓN POR OBJETIVO DE NEGOCIO:
- Lanzamiento (mes 1 a 3): 70% prospecting, 20% retargeting, 10% brand
- Escala (post PMF): 50% prospecting, 35% retargeting, 15% brand
- Madurez: 40% prospecting, 40% retargeting, 20% brand/retention

REGLAS DE BUDGET:
- Nunca poner más del 70% en una sola plataforma (diversificar riesgo)
- El presupuesto de testing debe ser 15 a 20% del total
- Reasignar budget de plataformas con CPA >2x target hacia las ganadoras
- Picos estacionales: aumentar 30 a 50% en temporadas (BF, Día Madre, etc.)`

export const CAMPAIGN_SCALING = `ESTRATEGIA DE ESCALAMIENTO:

CUÁNDO ESCALAR:
- CPA estable por 7+ días consecutivos
- ROAS por encima del target por 5+ días
- La campaña salió de learning phase exitosamente
- Hay margen de crecimiento en la audiencia (frequency <2.5)

CÓMO ESCALAR (reglas):
- Incrementar budget máximo 20% cada 48 a 72 horas
- Nunca duplicar budget de golpe (rompe el learning)
- Si ROAS cae >20% tras escalar, volver al budget anterior
- Escalar horizontalmente: agregar nuevas audiencias, no solo más budget a las mismas
- Para Advantage+: agregar más creativos es mejor que subir budget

SEÑALES DE QUE NO DEBES ESCALAR:
- Frequency >3 (audiencia saturada)
- CPM subiendo >15% semana a semana
- CTR cayendo >20% vs la semana anterior
- Conversiones planas a pesar de más impresiones`
