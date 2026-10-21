# Presentación temporal con Vercel y API local

Alcance acordado: publicar la interfaz en Vercel conservando los tres servicios Java, el gateway y PostgreSQL en el equipo del usuario. No es un despliegue completo de servicios en la nube. La aplicación local y cloudflared deben permanecer activos.

Estado al 21 de octubre de 2026: **publicado y validado por el usuario**. Proyecto Vercel real: `stock-quest`. URL: https://stock-quest-five.vercel.app. La CLI lo vinculó al proyecto existente por Git, en lugar de crear `stock-quest-presentacion`. Las instrucciones de creación siguientes sirven para una futura publicación aislada; no cambian el nombre del proyecto ya utilizado.

## Preparación comprobada

- Cloudflared instalado por el usuario y túnel iniciado hacia 127.0.0.1:14600.
- El asistente comprobó `/api/health` del túnel y obtuvo `status: ok`.
- Frontend compilado con `VITE_API_URL=/api`, TypeScript y Vite; advertencia de tamaño del chunk Phaser existente.
- `scripts/prepare-vercel-demo.cjs URL_HTTPS_DEL_TUNEL` prepara una carpeta nueva en `.stockquest-local/vercel-demo-*`. Solo copia archivos permitidos de `frontend/dist`; no copia fuentes del backend, bases, config DPAPI, secretos ni la función legacy api/index.js.
- El vercel.json generado desactiva instalación/build remoto, publica estáticos y reenvía `/api` y `/api/*` a la URL HTTPS del túnel. Conserva cabeceras de seguridad y fallback de React Router. La configuración raíz del repositorio permanece intacta.
- La ruta de la última carpeta preparada y su inventario con SHA-256 quedan en `.stockquest-local/latest-vercel-demo.json`. `deployed: false` describe únicamente el estado al prepararla, no consulta despliegues posteriores.
- El usuario completó la publicación, inició sesión en Stock Quest y confirmó aprendizaje, simulador, progreso y recarga de rutas. La auditoría posterior obtuvo HTTP 200 y status ok en `/api/health` público. La CLI indicó protección de Vercel; el acceso sin cuenta desde otro dispositivo/incógnito no se da por verificado.

## Autenticación y publicación por el usuario

Desde PowerShell en la raíz del repositorio:

```powershell
$demo = Get-Content '.stockquest-local/latest-vercel-demo.json' -Raw | ConvertFrom-Json
Set-Location -LiteralPath $demo.directory
npx.cmd vercel@latest login
```

Autorizar en el navegador sin compartir contraseñas ni tokens. Después de confirmar el inicio de sesión, publicar desde esa misma carpeta con `npx.cmd vercel@latest --prod`.

En el asistente, elegir la cuenta propia y crear un proyecto para la presentación, por ejemplo `stock-quest-presentacion`. Usar la carpeta actual `./`, framework Other/estático y sin build remoto. No vincular accidentalmente a un proyecto existente de producción ni cambiar facturación. Si aparecen opciones diferentes, revisar antes de continuar. El flag `--prod` asigna el dominio principal del proyecto de demostración; no certifica la aplicación como apta para producción.

## Validación posterior

Verificar la URL Vercel `/api/health`, abrir login, entrar como aprendiz, consultar módulos y completar una simulación. Recargar directamente una ruta de React y comprobar que conserva acceso. Probar desde otro dispositivo para descartar dependencia de localhost en el frontend. Las credenciales de la aplicación son las cuentas locales, distintas de Vercel. No subir contraseñas de BD o JWT a variables VITE.

## Cambios del túnel y cierre

La URL Quick Tunnel puede cambiar al reiniciar cloudflared. Si cambia, repetir el preparador con la nueva URL, entrar en la nueva carpeta y desplegar de nuevo. No es necesario recompilar la interfaz si sus fuentes y VITE_API_URL=/api no cambiaron. Vincular la nueva carpeta al mismo proyecto de demostración para actualizar su dominio.

Al terminar la presentación, cerrar el túnel con Ctrl+C. La interfaz publicada puede seguir accesible, pero su API dejará de funcionar. Para retirar también la interfaz, eliminar el despliegue/proyecto de demostración desde Vercel tras revisar su nombre. No eliminar bases ni configuración local.

Referencias: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/ y https://vercel.com/docs/cli/deploy
