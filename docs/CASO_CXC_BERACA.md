# Caso de Revisión CXC vs Facturación: INVERSIONES Y VARIEDADES BERACA S. DE R. L.

**Fecha de diagnóstico:** 17 de octubre de 2026  
**Cliente:** `INVERSIONES Y VARIEDADES BERACA S. DE R. L.` (`id: 99208dda-89f6-4ff3-8439-4f58e0831667`)  
**RTN:** `05019021343875` — Choloma, Cortés

---

## 1. Resumen de la Discrepancia

- **Suma de facturas con etiqueta `Pendiente` en Registro de Facturas:** **L. 15,505.00**
- **Saldo Pendiente mostrado en Estado de Cuenta (CXC):** **L. 7,995.00**
- **Diferencia exacta:** **L. 7,510.00** (`15,505.00 - 7,995.00 = 7,510.00`)

---

## 2. Detalle de Facturas Pendientes en Facturación (L. 15,505.00)

En el módulo **Registro de Facturas**, la columna **MONTO TOTAL** muestra el valor original de emisión de cada factura:

| Correlativo | Fecha Emisión | Monto Total | Saldo Pendiente (BD) | Estado en Facturación |
| :--- | :--- | ---: | ---: | :--- |
| `000-001-01-00003509` | 12 oct 2026 | L. 2,570.00 | L. 1,930.00 | Pendiente (`PARCIAL`) |
| `000-001-01-00003591` | 13 oct 2026 | L. 700.00 | L. 460.00 | Pendiente |
| `000-001-01-00003646` | 15 oct 2026 | L. 5,320.00 | L. 5,320.00 | Pendiente |
| `000-001-01-00003717` | 16 oct 2026 | L. 1,000.00 | L. 1,000.00 | Pendiente |
| `000-001-01-00003770` | 17 oct 2026 | L. 5,915.00 | L. 5,915.00 | Pendiente |
| **TOTAL** | | **L. 15,505.00** | | |

---

## 3. Detalle de los 4 Abonos Registrados en CXC (L. 24,850.00)

| # | Correlativo | Fecha | Monto | Método / Notas | Factura(s) a las que se aplicó (`PagoDetalleFactura`) |
| :--- | :--- | :--- | ---: | :--- | :--- |
| 1 | `AB-02342` | 07 oct 2026 | **L. 5,060.00** | Efectivo (Ficohsa) | `#000-001-01-00003410` (L. 5,060.00) |
| 2 | `AB-02343` | 07 oct 2026 | **L. 2,210.00** | Efectivo (Ficohsa) | `#000-001-01-00003350` (L. 2,210.00) |
| 3 | *(Sin correlativo)* | 14 oct 2026 | **L. 5,060.00** | Efectivo — *"Pago rápido registrado desde Historial de Facturas"* | `#000-001-01-00003410` (L. 5,060.00) ⚠️ **Duplicado sobre la misma factura** |
| 4 | `AB-00084` | 17 oct 2026 | **L. 12,520.00** | Efectivo — *"ABONO A FACTURAS"* | `#3221` (1,450) + `#3243` (5,090) + `#3350` (2,210 ⚠️ **ya estaba pagada con AB-02343**) + `#3354` (600) + `#3494` (2,930) + `#3509` (240 parcial) |

---

## 4. Causa Exacta de los L. 7,510.00 de Diferencia

1. **L. 5,060.00 — Doble pago sobre la factura `#000-001-01-00003410` (de L. 5,060.00):**
   - El `07 oct 2026` se abonó con `AB-02342` (`L. 5,060.00`).
   - El `14 oct 2026` se registró un *"Pago rápido desde Historial de Facturas"* (`id: 8981e669-f0ce-493b-ba6e-c89b70cbedbc`) por otros `L. 5,060.00` apuntando a la misma factura `#000-001-01-00003410`.
2. **L. 2,210.00 — Doble aplicación sobre la factura `#000-001-01-00003350` (de L. 2,210.00):**
   - El `07 oct 2026` ya se había pagado con `AB-02343` (`L. 2,210.00`).
   - El `17 oct 2026`, el abono `AB-00084` (`L. 12,520.00`) volvió a aplicar `L. 2,210.00` a esa misma factura `#3350` en lugar de aplicarlos en cascada a `#3509` y `#3591`.
3. **L. 240.00 — Abono parcial en la factura `#000-001-01-00003509` (de L. 2,570.00):**
   - Del abono `AB-00084` se aplicaron `L. 240.00` a la factura `#3509`. En el listado de Facturación la columna muestra el monto original (`L. 2,570.00`) con etiqueta `Pendiente`.

$$\text{L. } 5,060.00 + \text{L. } 2,210.00 + \text{L. } 240.00 = \mathbf{L.\ 7,510.00}$$

---

## 5. Opciones de Solución (Pendiente de Confirmar)

- **Opción A (Si el Pago Rápido de L. 5,060.00 del 14 de oct fue duplicado por error):**
  1. Anular el pago `8981e669-f0ce-493b-ba6e-c89b70cbedbc` de `L. 5,060.00` del 14 de oct.
  2. Reasignar los `L. 2,210.00` de `AB-00084` (que se aplicaron por segunda vez a `#3350`) hacia la factura `#000-001-01-00003509`, dejándola con `L. 2,450.00` abonados y `L. 120.00` pendientes.
  3. **Resultado:** El Saldo Pendiente real quedará en **L. 13,055.00** tanto en CXC como en Facturación.

- **Opción B (Si los 4 pagos por L. 24,850.00 sí se recibieron realmente):**
  1. Mantener los 4 pagos (`L. 24,850.00`) y reasignar en cascada FIFO los `L. 7,270.00` (`5,060 + 2,210`) sobrepagados en `#3410` y `#3350` hacia las facturas `#3509`, `#3591` y `#3646`.
  2. **Resultado:** El Saldo Pendiente se mantiene en **L. 7,995.00** y las facturas ya cubiertas pasarán a `Pagada` en el Registro de Facturas.
