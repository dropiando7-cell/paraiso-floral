# Plan de Desarrollo: Nuevos Módulos Planificados

Este documento consolida las especificaciones y el diseño preliminar para los dos nuevos módulos incorporados en el menú lateral: **Marketing IA** y **Cuentas por Cobrar**.

---

## 1. Módulo de Marketing IA
Este módulo consolidará herramientas de difusión y crecimiento comercial utilizando modelos generativos y automatización de redes sociales.

### Objetivos Principales
- **Automatización de Publicaciones (Scheduler)**: Estilo Hootsuite/Buffer. Programar y calendarizar contenido de productos directamente al catálogo web y a redes sociales enlazadas (Instagram, Facebook, LinkedIn).
- **Generación de Banners con IA**: Integrar herramientas de generación de imágenes (ej. DALL-E 3 / Stable Diffusion) para diseñar banners publicitarios de equipos médicos en promoción o de alta demanda, añadiendo textos persuasivos y logos institucionales de forma automática.
- **Videos UGC (User Generated Content) con Avatares IA**: 
  - Generación de videos 24/7 de promoción e inducción técnica de equipos.
  - Integración con APIs de síntesis de video (ej. HeyGen / D-ID) para renderizar avatares virtuales que presenten fichas técnicas y demuestren el funcionamiento de los consumibles y equipos en español.

### Arquitectura de Integración Propuesta
- **Base de Datos**: Tabla `MarketingPost` para guardar el estado del calendario, la imagen generada por IA y las métricas de clics/visitas.
- **Tareas Programadas (Cron Jobs)**: API endpoints seguros disparados por cron-jobs de Vercel para publicar en las redes sociales los posts planificados.
- **Frontend**: Vista de calendario de arrastrar y soltar (Drag and Drop Calendar) y panel de redacción enriquecido con sugerencias de copys optimizados para SEO.

---

## 2. Módulo de Cuentas por Cobrar (CxC)
Unificar en una sola interfaz todos los saldos pendientes de pago por parte de clientes y clínicas asociadas.

### Objetivos Principales
- **Consolidación de Saldos Pendientes**:
  - Facturas con saldo parcial o total pendiente de pago.
  - Rentas de equipos con cuotas de arrendamiento vencidas o acumuladas.
  - Servicios de soporte técnico y mantenimiento pendientes de liquidación.
- **Alertas y Semáforos de Vencimiento**:
  - Días de mora calculados dinámicamente.
  - Clasificación en carteras (Corriente, 1-30 días, 31-60 días, 90+ días de retraso).
- **Cobranza Automatizada vía WhatsApp**:
  - Botón de envío directo de recordatorio de pago estructurado a través de la API oficial de WhatsApp.
  - Envío automático de PDFs de estados de cuenta actualizados.

### Estructura de Datos Propuesta
- Agregar relación o vista agregada que conecte:
  - `Factura` (filtrando por estado `PENDIENTE` o `PARCIAL`).
  - `Renta` (calculando las cuotas mensuales no saldadas).
  - `Contacto` (asociado al saldo acumulado del cliente).

---

## 3. Servidor de Impresión Híbrido CEDI (Tickets POS + Formato Carta Epson)
Unificar en la estación de trabajo la capacidad de enviar impresiones tanto en formato Ticket (80mm térmica) como formato Carta (Epson) desde cualquier punto o dispositivo sin depender exclusivamente del diálogo de Chrome.

### Objetivos Principales
- **Convivencia / Servidor Unificado**:
  - Ampliar el script de Python actual (`scripts/print_server_tickets.py` o renombrado a `print_server_unificado.py`) para que exponga endpoints separados:
    - `/print/ticket`: Dirigido a la impresora térmica de recibos (Star BSC10 / 80mm).
    - `/print/carta`: Dirigido a la impresora de hojas sueltas tamaño Carta (Epson) mediante `win32print` o spooler local de Windows.
- **Modal de Impresión Dual y Amigable**:
  - Mantener la opción clásica de "Vista Previa en Navegador (Chrome)" para contingencias o guardar como PDF.
  - Ofrecer botones directos "Impresión Directa (Print Server)" para lanzar la impresión silenciosa e inmediata en la estación local.

