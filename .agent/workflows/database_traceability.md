---
description: Estándares de Trazabilidad en Base de Datos
---

# Trazabilidad en Modelos de Base de Datos (Prisma)

Como regla general del sistema ERP de Bioelectrónica, todo modelo de base de datos transaccional OBLIGATORIAMENTE debe incluir columnas de trazabilidad para auditar el rendimiento y registrar las acciones del personal.

## Columnas Estándar (Requeridas en toda tabla nueva)

Cuando el Agente o el Desarrollador cree un nuevo `model` en `prisma/schema.prisma`, **deben inyectarse las siguientes columnas relacionales** si el registro es modificado o procesado por un Empleado:

1. **`creadoPorId` (o equivalente como `vendedorId`, `attendendById`)**
   - Sirve para asociar quién ingresó originalmente el dato.
   - Relación con el modelo `User`.

2. **Borrado Lógico y Auditoría de Cancelación**
   - NUNCA uses métodos destructivos o eliminación dura (excepto en catálogos base muy simples).
   - Inyecta `anuladaPorId` o `deletedById` relacionando al modelo `User`.
   - Inyecta `anuladaAt` o `deletedAt` (DataTime?).
   - Asegúrate de agregar el estatus ("ANULADA" / "ELIMINADA") en las columnas lógicas correspondientes.

## Ejemplo de Inyección de Trazabilidad

```prisma
model TransaccionNueva {
  // ... campos básicos ...
  
  // Trazabilidad Estándar
  creadoPorId              String?          @db.Uuid
  creadoPor                User?            @relation("CreatedModelName", fields: [creadoPorId], references: [id])
  anuladaPorId             String?          @db.Uuid
  anuladaPor               User?            @relation("AnuladaModelName", fields: [anuladaPorId], references: [id])
  anuladaAt                DateTime?
}
```

No olvides inyectar las columnas recíprocas correspondientes dentro del `model User`.

## Regla de Oro
**NUNCA SE BORRAN DATOS TRANSACCIONALES DE LA BASE DE DATOS.** Solo se cambian de estado y se registra el autor de la cancelación.
