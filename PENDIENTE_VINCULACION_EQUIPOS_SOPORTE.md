# 📌 PENDIENTE: Vinculación Centralizada de Inventario y Ficha Técnica en Soporte Técnico (/soporte/nuevo)

> **Estado:** PENDIENTE (Documentado para ejecución posterior a visita de clientes)  
> **Fecha de creación:** 11 de Agosto de 2026  
> **Módulo:** Soporte Técnico / Recepción de Equipos / Taller  

---

## 🎯 Objetivo de la Mejora

Optimizar el proceso de **Recepción de Equipos / Órdenes de Trabajo** (`/soporte/nuevo`) para eliminar la dependencia de campos de texto libre sueltos (*Nombre del Equipo, Marca, Modelo, N° Serie*), garantizando que **TODO equipo que ingrese al taller** quede vinculado o registrado automáticamente en el **Inventario General (`ActivoFijo`)** con su propia **Ficha Técnica y Código QR permanente**.

---

## 🔍 Situación Actual vs. Propuesta Mejorada

### ❌ Situación Actual (Texto libre aislado)
1. Al recepcionar un equipo desde `/soporte/nuevo`, los técnicos escriben a mano el nombre, marca, serie y modelo.
2. Si el mismo equipo regresa en 3 o 6 meses, no se puede consultar su historial previo porque fue escrito de forma diferente (ej. *"Concentrador 5L"* vs *"Concentrador de Oxígeno"*).
3. No hay detección automática de **Garantía Vigente** ni vinculación directa con ventas/rentas anteriores de Bioelectrónica.

### ✅ Propuesta Mejorada (Inventario Centralizado y Ficha Técnica Automática)
Transformar la sección **"Información del Equipo"** en el formulario `ReceptionForm.tsx` para ofrecer 2 modalidades claras:

#### 1. 🔍 Modo 1: Buscar y Vincular Equipo Existente en ERP
* **Buscador inteligente:** Por Código QR / Device Number, N° de Serie, Modelo, Marca o Cliente.
* **Auto-completado y Bloqueo:** Al seleccionar el equipo, se llenan y congelan los campos de *Nombre, Marca, Modelo y Serie*.
* **Carga de Historial y Alertas:** Carga automática de la Ficha Técnica, vigencia de garantía, mantenimientos preventivos previos y cliente asociado.
* **Badge Visual:** Muestra un indicador claro: `✅ Vinculado a Equipo ERP: BIO-EQ-001 - Concentrador Oxígeno (S/N: 12345)`.

#### 2. ➕ Modo 2: Registrar Nuevo Equipo en Inventario (Cliente Externo / 1ª Vez)
* Si el equipo es de un cliente y entra al taller por primera vez:
  * El técnico ingresa los datos básicos (*Nombre, Marca, Modelo, Serie*).
  * Al guardar la recepción, **el ERP crea automáticamente el registro de Inventario / Ficha Técnica** (clasificado como `CLIENTE_EXTERNO` o `TALLER`) asignándole su código QR único.
  * En futuras visitas, ese equipo **ya existirá en la base de datos** acumulando todo su historial técnico.

---

## 🛠️ Plan de Implementación Técnica (Para cuando se reanude)

### 1. Server Action en `src/app/(dashboard)/soporte/actions.ts`
* Crear `buscarEquiposInventarioGeneral(query: string)`:
  * Consulta en `prisma.activoFijo.findMany` filtrada por `organizationId`.
  * Filtro flexible por `idQr`, `serie`, `descripcionCorta`, `modelo`, `marca` y `codigoBarras`.
  * Incluye la relación con `cliente` (id, nombre, teléfono).

### 2. Frontend en `src/app/(dashboard)/soporte/components/ReceptionForm.tsx`
* Agregar toggle/selector de modalidad (Buscar equipo existente vs. Registrar nuevo equipo en inventario).
* Integrar componente modal/desplegable de búsqueda en tiempo real.
* Añadir manejo de estado `activoId` y botón de `[Desvincular Equipo]`.
* Conectar auto-completado de cliente y garantía con `getUltimaConfiguracionGarantia(activoId)`.

---

## 📋 Instrucciones para llamar este trabajo en el chat
Cuando desees retomar esta implementación, solo di en el chat:  
👉 *"Retomemos el pendiente de vinculación de inventario en soporte técnico desde PENDIENTE_VINCULACION_EQUIPOS_SOPORTE.md"*
