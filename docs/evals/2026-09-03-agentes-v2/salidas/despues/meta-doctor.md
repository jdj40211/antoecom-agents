**F | 24/100 | Confianza: media | TRM asumida 4.000**

| Métrica | Tu valor | Benchmark | Estado |
|---|---|---|---|
| ROAS | 1.4 | 2.19 (mediana ecommerce) | 🔴 −36% |
| CTR | 0.9% | 1.71% (Traffic) | 🔴 −47% |
| CPC | COP 960 | COP 2.800 ($0.70) | 🟢 −66% |
| CPM | COP 8.633 | COP 50.000 ($12.50 ecommerce) | 🟢 −83% |
| CVR | 1.97% | 7.72% (Leads, único CVR del benchmark base) | 🔴 −74% |
| CPA | COP 48.700 | Sin benchmark ecommerce directo — ver ROAS 2.19:1 | 🔴 atado a ROAS |
| Frecuencia | 3.8 | ≤3 (techo antes de fatiga/learning) | 🔴 +27% |

**Diagnóstico**
El value del evento Purchase que reporta Meta no cierra con las unidades vendidas: ROAS × gasto da COP 2.590.000 de revenue, pero 38 compras × COP 149.900 dan COP 5.696.200 — una diferencia de COP 3.106.200 que invalida el CPA y el ROAS hasta que se corrija el tracking.

**Próximas 48 horas**
1. Abre Events Manager y compara el value de las últimas 38 conversiones del Pixel/CAPI contra COP 149.900 por unidad.
2. Revisa la deduplicación Pixel-CAPI por event_id: ese es el origen de la diferencia de COP 3.106.200 en 7 días.
3. Saca el revenue real de la pasarela o el ecommerce de los últimos 7 días y compáralo compra por compra contra lo que atribuye Meta.

**Qué me falta**
Revenue real de la pasarela de los últimos 7 días (cierra el mismatch de COP 3.106.200); cantidad de creativos activos en el ad set (chequeo Andromeda, <10 dispara alerta); si el creativo o la landing resuelven el cambio de talla antes que el precio (objeción #1 en prenda de talla por contraentrega).

Confianza: media. Asumí TRM 4.000 para convertir CPC/CPM a USD; el precio COP 149.900 se usó en bruto contra el revenue de Meta, sin descontar IVA, porque el mismatch es de unidades × precio contra value de Purchase, no de margen.
