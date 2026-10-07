---
name: sync-project
description: Sincroniza de forma segura el proyecto local con el repositorio remoto (GitHub), protegiendo cambios locales no guardados, actualizando ramas, ejecutando prisma generate si el esquema cambió, instalando dependencias si package.json cambió y validando la compilación. Usa esta skill cuando el usuario pida sincronizar el proyecto, bajar cambios de otra computadora o actualizar el repositorio de forma segura.
---

# Sincronización Segura del Proyecto (Sync Project)

Esta skill define el protocolo estricto para sincronizar el proyecto con el repositorio remoto (GitHub), evitando pérdida de cambios locales y asegurando que las dependencias, esquemas de Prisma y compilación se mantengan íntegros.

## Protocolo Paso a Paso

### 1. Verificación del Estado Local (Pre-check)
Antes de traer cualquier cambio remoto:
- Ejecutar `git status` para comprobar si hay cambios locales no guardados o archivos sin seguimiento.
- **Regla Crítica**: Si hay cambios locales pendientes:
  - Nunca ejecutar comandos destructivos (`git reset --hard`, `git checkout .`, `git clean -fd`).
  - Si es necesario resguardarlos temporalmente, usar un stash con nombre claro:
    `git stash push -m "cambios-locales-antes-de-sincronizar"`
  - Si no es necesario el stash porque el árbol de trabajo está limpio (`nothing to commit, working tree clean`), continuar directamente.

### 2. Obtención de Referencias Remotas (Fetch)
- Ejecutar:
  `git fetch origin --prune`
- Verificar el estado relativo a la rama remota:
  `git status`
  `git log --oneline HEAD..origin/<rama>`
- Si la rama local ya está al día (`Your branch is up to date`), informar al usuario que no hay cambios pendientes por descargar.

### 3. Fusión Segura (Pull)
- Si la rama local está simplemente detrás (`can be fast-forwarded`):
  `git pull --ff-only origin <rama>`
- Si existen commits tanto locales como remotos:
  - Evaluar la divergencia con `git log --oneline --graph --left-right HEAD...origin/<rama>`
  - Consultar o coordinar con el usuario antes de resolver merges o rebases.

### 4. Actualización de Prisma y Dependencias
Revisar si los commits recibidos afectaron archivos clave:
- **Si cambió `prisma/schema.prisma`**:
  - Ejecutar `npx prisma generate` para sincronizar los tipos del cliente Prisma en local.
  - Recordar la **Regla de Oro**: *Nunca ser destructivo en la base de datos ni tablas que ya existan, nunca RESET, solo aditivo*.
- **Si cambió `package.json` o `package-lock.json`**:
  - Ejecutar `npm install` para instalar cualquier dependencia nueva.

### 5. Verificación de Compilación y Estado
- Si hubo cambios en código o esquema, verificar que el proyecto compile correctamente:
  `npm run build` (o typecheck rápido).
- Si se había hecho un stash en el paso 1, restaurar los cambios locales:
  `git stash pop`
  y verificar que no haya marcas de conflicto.

### 6. Resumen Claro al Usuario
- Indicar los commits descargados (autor, mensaje y hash).
- Confirmar el estado de Prisma Client, dependencias y build.
- Confirmar que el entorno local quedó 100% sincronizado y listo para trabajar.
