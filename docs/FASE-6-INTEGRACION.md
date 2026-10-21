# Fase 6 — Integración y datos

El usuario autorizó continuar con fase 6 después de revisar 5C y sus correcciones. Esta fase no retira componentes anteriores ni autoriza publicaciones o despliegues. La aceptación visual y humana permanece explícita.

Actualización: tras validar los tres roles y las nuevas opciones de gestión, el usuario autorizó pasar a [fase 7](FASE-7-ACEPTACION.md). Su informe distingue lo demostrado localmente de las brechas globales. El entorno local de fase 7 entrega eventos directamente de simulación a aprendizaje; el proxy de compatibilidad anterior se conserva sin ser el destino activo del productor.

## Entorno local preparado

| Componente | Dirección | Datos |
|---|---|---|
| Frontend React/Phaser | http://127.0.0.1:5174 | Proxy `/api` hacia 14600 |
| Borde Express | http://127.0.0.1:14600 | Tres propietarios Java; Prisma sin conexión utilizable |
| Simulación | http://127.0.0.1:14610 | Base y credencial propias |
| Aprendizaje | http://127.0.0.1:14620 | Base y credencial propias |
| Personas | http://127.0.0.1:14630 | Base y credencial propias |

Las bases preparadas son `stockquest_phase6_people_20261020`, `stockquest_phase6_learning_20261020` y `stockquest_phase6_simulation_20261020`; el sufijo de preparación usa la fecha UTC. Cada una pertenece a un rol independiente sin permisos de superusuario, creación de roles ni bases. Se retira CONNECT de PUBLIC y solo se concede a su propietario. La comprobación de aislamiento intenta y rechaza las conexiones entre propietarios. No hay consultas SQL cruzadas en los servicios.

Los procesos anteriores de 4000, 4010 y 5173 se conservan. Se puede revisar Java en 5174 sin convertir ni borrar las cuentas/resultados previos. El cambio definitivo de acceso habitual queda sujeto a revisión; no existe sincronización de escrituras hacia legacy.

## Arranque y recuperación

Desde la raíz del repositorio, con Node y Java disponibles:

```powershell
node scripts/local-java.cjs status
node scripts/local-java.cjs start
node scripts/local-java.cjs stop
# Solo uno de los tres procesos Java propios:
node scripts/local-java.cjs restart learning
```

`start` exige los tres JAR compilados; no ejecuta Maven ni pruebas automáticamente. `stop` detiene solo los hijos del supervisor local y espera su cierre. No borra bases, tablas ni datos. Para actualizar un JAR: detener este entorno, construir el servicio y volver a iniciar. Los límites locales de memoria permiten coexistir con la aplicación anterior en un equipo de 8 GB; no son parámetros de producción.

La preparación ya se ejecutó en esta máquina. Para otro entorno nuevo, configurar en la terminal `SQ_LOCAL_DB_ADMIN_USER` y `SQ_LOCAL_DB_ADMIN_PASSWORD`, opcionalmente `SQ_LOCAL_SUFFIX`, y ejecutar `node scripts/local-java.cjs prepare`. El script exige nombres nuevos y nunca sobrescribe una configuración ni reutiliza bases arbitrarias. Ante una preparación parcial, inspeccionar su manifiesto y los objetos existentes; no hay borrado automático de recuperación.

Tokens, claves JWT, contraseñas de base y de cuentas locales se guardan exclusivamente cifrados con Windows DPAPI en `.stockquest-local/config.dpapi`, excluido de Git. Solo el mismo usuario de Windows puede descifrarlos; no se publica ese archivo ni se imprime su contenido. El supervisor recibe los secretos en memoria y sus procesos por variables de entorno. Un canal de control en loopback requiere un token privado y solo controla los procesos creados por ese supervisor.

## Cuentas para la revisión

| Cuenta | Correo | Comando que copia su contraseña al portapapeles |
|---|---|---|
| Aprendiz | learner.fase6@example.test | `node scripts/local-java.cjs credentials learner` |
| Líder | leader.fase6@example.test | `node scripts/local-java.cjs credentials leader` |
| Gestor | manager.fase6@example.test | `node scripts/local-java.cjs credentials manager` |

Abrir http://127.0.0.1:5174/login y pegar la contraseña de la cuenta elegida. La cuenta aprendiz pertenece al líder. Los verificadores crean cuentas adicionales de pruebas y conservan sus resultados para inspección; sus credenciales no se incluyen en los informes públicos.

## Contenido y transición de datos

`content/stockquest.json` conserva sin cambios los textos, preguntas, respuestas y parámetros originales: nueve temas, nueve lecciones, nueve desafíos y dos escenarios. La carga Java utiliza los endpoints del gestor; el bootstrap excepcional de cuentas privilegiadas escribe únicamente en la base de personas, con su credencial propia. No hay API pública para crear gestores o elevar roles.

La carga inicial admite recuperación tras interrupción y conserva registros existentes; ante una posición ocupada por otro contenido exige revisión. Al completar, valida las cantidades y guarda un inventario sin secretos. El seed legacy también usa este JSON, evitando dos versiones del contenido. No se importaron los usuarios ni los resultados de las bases anteriores, conforme al acuerdo de desarrollo con datos descartables; dichas bases siguen intactas.

El contenido original no tenía identificadores de vídeos. No se inventaron ni descargaron vídeos: la revisión de vídeos continúa pendiente. Los informes siguen consultando aprendizaje mediante HTTP. No se activaron proyecciones de personas ni se declara implementado AG-05; deben verificarse entrega, inbox, snapshots y replay antes de depender de ellas.

## Verificación y cierre

Durante la revisión se añadió, a petición del usuario, la eliminación de módulos y escenarios sin uso: seleccionar el registro y utilizar Eliminar al final del formulario. Tiene confirmación y protección del historial; detalle y pruebas en [ELIMINACION-CONTENIDO.md](verificaciones/fase6-20261019/ELIMINACION-CONTENIDO.md).

La opción se extendió también a lecciones y desafíos sin uso, con conservación de su módulo y protección de intentos/progreso. Reglas, resultados y límites: [ELIMINACION-LECCIONES-DESAFIOS.md](verificaciones/fase6-20261019/ELIMINACION-LECCIONES-DESAFIOS.md).

El recorrido reproducible es `node scripts/verify-phase6.cjs`; utiliza únicamente el entorno preparado y deja sus resultados en `.stockquest-local/verification/<runId>/report.json`. Crea un aprendiz nuevo en cada ejecución y conserva sus datos; las repeticiones aumentan el tamaño del equipo. El límite de peticiones del borde sigue vigente: no ejecutar repetidamente el verificador sin respetarlo. Los informes que se entregan en documentación excluyen credenciales.

El recorrido visual guiado de referencia comprende:

1. Aprendiz: acceso, nueve temas en orden, desafío, finalización de lección, simulador Phaser, decisiones, resultado y perfil.
2. Líder: equipo, informe individual, creación/edición de grupo, asignación/retirada y límites de acceso.
3. Gestor: inventario de contenidos, edición, creación y publicación de un escenario de revisión.
4. Cierre de sesión, errores visibles y recuperación de navegación después de reiniciar servicios.

El usuario confirmó manualmente el flujo del aprendiz, incluidos cierre de simulación, progreso e historial, y las funciones del líder con informes, grupos y miembros. Después confirmó los estilos corregidos y declaró validado el módulo de gestión tras añadir las cuatro opciones de eliminación. Se registra su aceptación funcional del módulo; no se inventan ejecuciones visuales automatizadas ni una certificación entre navegadores.

Las pruebas de API, componentes y build no sustituyen este recorrido. El control automatizado del navegador falló al inicializarse (`failed to write kernel assets`), por lo que esa comprobación automatizada no se declara ejecutada. Antes del cierre global se revisan AG-01 a AG-09 y su tratamiento explícito. La validación de este módulo no cierra automáticamente la fase 6 ni inicia la fase 7.
