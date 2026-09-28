# Manual Práctico de Facturación Avanzada: Proformas y Notas de Crédito
**Paraíso Floral - Guía Operativa para Cajeros y Asesores**

Este manual tiene como objetivo estandarizar el uso de los documentos de **Factura Pro Forma** y **Notas de Crédito** en el sistema, asegurando el correcto manejo del inventario, los saldos de clientes y el cumplimiento de los procesos de venta.

---

## 1. Facturas Pro Forma (Proformas)

### ¿Qué es una Proforma?
La Proforma es un documento oficial interno que sirve como una **"promesa de venta"**. Se encuentra en el punto intermedio entre una simple Cotización y una Factura Oficial del SAR.

### ¿Cuál es la diferencia en el Sistema?
* **Cotización:** No resta inventario. Se usa cuando el cliente solo está preguntando precios y no es seguro que compre.
* **Pro Forma:** **SÍ descuenta inventario de bodega**. Se usa cuando el cliente ya confirmó que va a comprar, y necesitas "apartar" o bloquear esas flores/productos para que nadie más los venda.
* **Factura Oficial:** Es la factura legal final (con CAI) que se entrega cuando el cliente ya pagó o firmó el crédito.

### Casos de Uso (Cuándo usarla)
* **Caso A (El Cliente va al Banco):** El cliente viene a la tienda, escoge sus arreglos y dice: *"Guárdamelos, voy al banco a retirar efectivo y regreso"*. 
  * *Acción:* Le haces una Proforma para que el inventario se descuente y asegures su producto. Cuando regrese, la conviertes a Factura.
* **Caso B (Trámite de Empresa):** Una empresa te pide un arreglo para un evento, pero te dice: *"Mi departamento de contabilidad me exige una factura para poderme emitir el cheque, pero no me des la factura del SAR todavía hasta que te pague"*. 
  * *Acción:* Le envías la Proforma. Con eso la empresa tramita su cheque y el inventario de la flor queda reservado.

### ¿Cómo hacerlo en el Sistema?
1. **Creación Directa:** Ve a *Nueva Factura*, arriba selecciona el ícono violeta de **Pro Forma**, llena los productos y emite el documento.
2. **Por Conversión (El Flujo Ideal):** 
   - Si el cliente tenía una *Cotización* y regresó a confirmar, busca la cotización, haz clic en los opciones (tres puntos) y selecciona **Convertir a Pro Forma**.
   - Cuando el cliente finalmente te pague esa Proforma, la buscas, haces clic en opciones y seleccionas **Convertir a Factura Oficial**. El sistema jalará todos los datos y le asignará su número CAI sin descontar el inventario doble.

---

## 2. Notas de Crédito

### ¿Qué es una Nota de Crédito?
Es el documento legal y contable que se utiliza cuando hay que **"echar para atrás"** parcial o totalmente una factura oficial que ya fue emitida. Sirve para reconocer un saldo a favor del cliente.

### Impacto en el Sistema (Muy Importante)
1. **Restaura el Inventario:** Al contrario de la Factura (que resta inventario), la Nota de Crédito **suma y devuelve** los productos a la bodega. El sistema asume que el cliente te está regresando el producto físico. *(Nota: Si el producto está dañado y se botará, el administrador deberá sacarlo después mediante un "Ajuste por Merma" en el módulo de Inventario).*
2. **Abona a la Deuda (CxC):** Si el cliente debía la factura original (crédito), emitirle una Nota de Crédito automáticamente le hará un **abono a favor**, reduciendo lo que te debe en su cuenta.

### Casos de Uso y Ejemplos
* **Ejemplo 1 (Devolución por mala calidad):** El cliente compró 10 paquetes de rosas. Al día siguiente llama diciendo que 2 paquetes llegaron marchitos.
  * *Acción:* Haces una Nota de Crédito por la cantidad de "2" paquetes de rosas al precio que se le cobró.
* **Ejemplo 2 (Descuento posterior):** Al cliente se le prometió un descuento de L. 500, pero el cajero olvidó aplicarlo en la factura oficial.
  * *Acción:* En lugar de anular toda la factura, se le hace una Nota de Crédito por el monto del descuento para cuadrar su saldo.

### ¿Cómo hacer una Nota de Crédito en el Sistema?
1. Entra al creador de Facturas.
2. En la parte superior, cambia el tipo de documento a **Nota de Crédito** (ícono morado).
3. Busca al cliente y agrega a la tabla **exactamente lo que se le está devolviendo** o compensando.
4. **Campo Obligatorio (Notas):** Siempre debes escribir en el campo de Notas por qué se está emitiendo y a qué factura pertenece. 
   * *Ejemplo:* `"Devolución por flor marchita. Referencia a Factura FAC-0003120"`.
5. Haz clic en Emitir. El sistema devolverá los productos a bodega y aplicará el saldo a favor al cliente.

---
**Recuerde:** Las Notas de Crédito tienen una numeración independiente (comienzan por NC-) para no interferir ni saltar los correlativos de facturación del SAR.
