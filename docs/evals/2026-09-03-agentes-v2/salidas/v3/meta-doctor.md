F — 18/100. TRM asumida COP 4.000 para convertir CPC y CPM; CTR, ROAS y frecuencia se comparan como ratio y no la necesitan.

| Métrica | Tu valor | Benchmark | Estado |
|---|---|---|---|
| CTR | 0.9% | 1.71% (Traffic) | 🔴 −47% |
| CPC | COP 960 | COP 2.800 (~US$0.70) | 🟢 −66% |
| CPM | COP 8.632 | COP 50.000 (~US$12.50 Ecommerce) | 🟢 −83% |
| Frecuencia | 3.8 | <3 (umbral de fatiga) | 🔴 +27% |
| Compras (7 días) | 38 | 50 (mínimo learning/semana) | 🔴 −24% |
| CPA | COP 48.700 | COP 45.000 (asumido) | 🟡 +8% |
| ROAS | 1.4 | 2.19 (mediana ecommerce) | ⚪ no confiable |

**Diagnóstico:** el value del evento Purchase o el mapeo del CAPI está mal: el ROAS reportado factura COP 2.590.000 (gasto × ROAS) cuando las 38 compras a COP 149.900 valen COP 5.696.200, 2.2 veces más.

**Próximas 48 horas**
1. Audita el evento Purchase en Events Manager y corrige el value o el mapeo del CAPI: hoy reporta COP 2.590.000 en vez de los COP 5.696.200 que corresponden a las 38 compras.
2. Sube 3 piezas creativas nuevas al ad set sin tocar el presupuesto: la frecuencia está en 3.8, por encima del umbral de fatiga de 3, y no podés escalar gasto sobre esa base.
3. Reescribe el headline principal y lanza 2 variantes: el CTR de 0.9% queda 47% debajo del benchmark de tráfico (1.71%) y explica el CPA alto pese al CPC barato.

**Qué me falta:** margen real del producto para fijar el CPA target sin asumir 30% (usé COP 45.000, sin descontar IVA 19%); confirmación de que el value del Purchase quedó corregido, para recalcular el ROAS real; si el producto se vende por tallas S/M/L y hay cambio de talla, porque es la objeción #1 en fajas vendidas por contraentrega.

Confianza: media. Asumí TRM COP 4.000 y CPA target COP 45.000 (30% del precio, sin descontar IVA).
