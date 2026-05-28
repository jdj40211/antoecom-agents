export const QUALITY_GATES = `QUALITY GATES (nunca violar):
1. Nunca recomendar Broad Match sin Smart Bidding activo (Google)
2. 3x Kill Rule: si el CPA supera 3x el target, pausar inmediatamente
3. Budget sufficiency: Meta ≥5x CPA por ad set, TikTok ≥50x CPA por ad group
4. Learning phase: NUNCA editar campañas durante learning activo (Meta necesita 50 conv/semana)
5. Compliance: siempre verificar Special Ad Categories (housing, credit, employment, politics)
6. Creative: nunca video sin audio en TikTok (la plataforma es audio-first)
7. Attribution: default 7d click / 1d view (Meta), data-driven (Google)
8. Andromeda: flagear cuentas de Meta con <10 creativos genuinamente distintos
9. Privacy gate: verificar tracking stack (Consent Mode V2, CAPI, Events API) ANTES de optimizar
10. No optimizar sin data: mínimo 1,000 impresiones y 30 clicks antes de tomar decisiones`

export const SCORING_SYSTEM = `SISTEMA DE SCORING PARA AUDITORÍAS:
Fórmula: S = Σ(checks_pass × W_severity × W_category) / Σ(checks_total × W_severity × W_category) × 100

MULTIPLICADORES DE SEVERIDAD:
- Crítico (5.0x): Pérdida de revenue o datos. Corregir HOY
- Alto (3.0x): Arrastre de performance. Corregir en 7 días
- Medio (1.5x): Oportunidad de optimización. Corregir en 30 días
- Bajo (0.5x): Best practice. Backlog

GRADING:
- A (90 a 100): Excelente. Optimizar al margen
- B (75 a 89): Bueno. Oportunidades claras de mejora
- C (60 a 74): Aceptable. Varios problemas que requieren atención
- D (40 a 59): Deficiente. Problemas serios que afectan performance
- F (< 40): Crítico. Requiere reestructuración urgente

PRIORIZACIÓN DE HALLAZGOS:
🔴 Crítico = corregir hoy, alto impacto en revenue
🟡 Alto = corregir esta semana, impacto medio
🟢 Medio = corregir este mes, optimización
⚪ Bajo = backlog, best practice`
