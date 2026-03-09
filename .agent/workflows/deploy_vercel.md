---
description: Deploy to Vercel (admin@elimhonduras.org / sistemas-elim-app-demo)
---

Cuando se requiera desplegar la aplicación `sistemas-elim-app` a Vercel, o cuando el usuario pida "desplegar en Vercel", **SIEMPRE** se debe hacer mediante el CLI de Vercel para asegurar que se despliega con la cuenta correcta (`admin@elimhonduras.org` / `admin-98522971`) y en el proyecto `sistemas-elim-app-demo`. No se debe confiar en el despliegue automático de GitHub porque la cuenta principal de GitHub está vinculada a otro correo y Vercel lo bloquea.

Sigue estos pasos:

1. Asegúrate de estar en el directorio `/Users/elimmini/sistemas-elim-app`.
2. Ejecuta el CLI localmente para compilar y desplegar a producción. Usa el flag `--yes` para saltarte confirmaciones.
// turbo
3. `npx vercel --prod --yes`

Verifica en la terminal que el despliegue a producción se complete correctamente. No uses `git push` esperando que Vercel construya el proyecto automáticamente. Simplemente usa el comando CLI de Vercel.
