# Tareas Pendientes: Módulo de Pedidos

*Documento creado para retomar el trabajo cuando haya descanso y mente fresca.*

## 1. Decodificador de Pedidos con IA (Human-in-the-loop)
- [ ] Crear el botón "✨ Pegar desde WhatsApp" en el módulo de pedidos (`inventario-ventas/pedidos`).
- [ ] Construir el Modal (UI) para pegar texto crudo o subir fotos de listas a mano.
- [ ] Desarrollar el Server Action (`actions.ts`) que conecte con `@google/genai` (Gemini 3.1 Pro) para extraer: Nombre de Cliente, Items (Cantidad y Nombre del producto) y Notas.
- [ ] Hacer que la respuesta de la IA precargue el formulario de nuevo pedido para que el usuario solo haga una **validación visual** rápida antes de enviarlo a CEDI.

## 2. Flujo Operativo 1: Pedidos Remotos
- [ ] Definir e implementar el rol de **Alistador**: Visualiza el pedido pendiente y marca los ítems físicamente recolectados.
- [ ] Definir e implementar el rol de **Chequeador**: Interfaz para terminal móvil (Landi) que hace *beeps* de éxito/error al escanear códigos de barras, garantizando que el pedido se armó correctamente.
- [ ] Conexión a Caja: Una vez el chequeador confirma el pedido, este cambia de estado a "Listo" y se muestra en la Bandeja de la Cajera para emisión rápida de Factura Fiscal.

## 3. Flujo Operativo 2: Compras Físicas en CEDI
- [ ] Definir con el usuario cuál de las 2 variantes se usará para clientes físicos:
  - *Variante A:* Estilo Supermercado (Cliente toma las flores y va directo a caja).
  - *Variante B:* Asesor de piso (El asesor arma el carrito con su terminal, genera ticket y el cliente pasa a pagar a caja con el número).

---
## 4. Vales de Caja Chica / Recibos de Egreso
- [ ] Crear el formato de impresión `ValeCajaChicaTemplate.tsx` para ticketera térmica.
- [ ] Agregar el botón "Imprimir Vale" en la tabla de Movimientos de Caja Chica.
- [ ] El ticket debe incluir: Monto, Concepto, Categoría, Beneficiario (Ej. chófer) y una línea para firma física de recibido.

---
*Nota: La arquitectura y los diagramas de flujo detallados se guardaron en los artefactos de la conversación actual para referencia futura.*
