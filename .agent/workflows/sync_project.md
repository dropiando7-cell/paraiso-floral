---
description: Sincronizar de forma segura el proyecto con el repositorio remoto
---

Cuando el usuario pida sincronizar el proyecto, bajar cambios de otra computadora o use `/sync_project`:

1. **Revisar estado local**: Ejecutar `git status` para comprobar que no existan cambios locales sin guardar que puedan colisionar. Si los hay, resguardar de forma segura con `git stash push -m "cambios-locales-antes-de-sync"`.
2. **Fetch y comparación**: Ejecutar `git fetch origin --prune` y verificar qué commits nuevos existen con `git log --oneline HEAD..origin/main`.
3. **Pull limpio**: Ejecutar `git pull --ff-only origin main` para aplicar los cambios de manera limpia.
4. **Actualizar Prisma y Dependencias**:
   - Si se modificó `prisma/schema.prisma`, ejecutar `npx prisma generate`.
   - Si se modificó `package.json`, ejecutar `npm install`.
5. **Validar compilación**: Verificar con `npm run build` que la aplicación compila sin errores.
6. **Restaurar stash (si aplica)**: Reaplicar cambios locales con `git stash pop` si se resguardaron.
7. **Reportar**: Resumir los cambios descargados y el estado final del proyecto.
