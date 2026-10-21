# Stock Quest — Java, React y PostgreSQL

Estado al 21 de octubre de 2026: tres microservicios Java y gateway independiente activos localmente. La separación del gateway fue validada por el usuario y el backend anterior quedó archivado fuera de los workspaces. Consultar [estado vigente](docs/ESTADO-ACTUAL.md) y [activación y retirada](docs/RETIRADA-LEGACY-20261021.md).

## Arquitectura activa

| Componente | Responsabilidad |
|---|---|
| services/personas-capacitacion | Identidad, usuarios, equipos y grupos |
| services/aprendizaje-evaluacion | Contenidos, evaluaciones, progreso y logros |
| services/simulacion-logistica | Escenarios, partidas, decisiones y resultados |
| gateway | Entrada /api, identidad delegada, validación y composición HTTP |
| frontend | React 18, TypeScript y Phaser 3 |
| legacy | Fuentes y herramientas históricas, sin ejecución ni instalación habitual |

Cada servicio y cada una de sus ocho capacidades contiene Application, domain e Infrastructure. Los nombres de las capacidades expresan el negocio; los puertos separan los casos de uso de Spring/JDBC/HTTP. Cada servicio Java tiene su propia base PostgreSQL y un único propietario de escritura. El gateway no importa Prisma ni accede a bases de datos.

Los eventos de simulación llegan al inbox de aprendizaje. Aprendizaje publica snapshots ProgresoActualizado y personas almacena su proyección local con inbox idempotente y versiones. Los informes inicializados siguen disponibles cuando aprendizaje cae; HTTP se usa para inicialización/reconstrucción y como modo explícito de recuperación. AG-05 está implementado, activado y validado por el usuario el 21 de octubre de 2026; véase [el resultado](docs/AG05-PROYECCIONES-20261021.md). Véanse [arquitectura actual](docs/ARQUITECTURA-ACTUAL.md) y [pendientes de desarrollo](docs/PENDIENTES-DESARROLLO.md).

## Arranque del equipo preparado

Requiere Node.js 22.18 o superior, JDK 21, PostgreSQL y los JAR ya compilados. Maven Wrapper está incluido por servicio. Desde la raíz:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'observabilidad'
node scripts/local-java.cjs start
node scripts/local-java.cjs status
```

El supervisor usa la configuración local cifrada con Windows DPAPI y el mismo usuario Windows. No copiarla al repositorio o a Vercel. Abre la interfaz en http://127.0.0.1:5174. El gateway escucha en 14600; las bases, roles y puertos de los tres Java se registran en status. El aprovisionamiento de un clon nuevo se describe en [fase 6](docs/FASE-6-INTEGRACION.md).

Para desarrollo manual del borde/interfaz, configurar los orígenes y tokens Java según [gateway/README.md](gateway/README.md) y ejecutar npm run dev. El proxy web predeterminado apunta a 14600; SQ_API_PROXY_TARGET permite indicar otro origen. Los secretos no se publican con prefijo VITE.

## Construcción y pruebas

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
node scripts/verify-gateway-isolation.cjs
node scripts/verify-legacy-retirement.cjs
node contracts/validar-inventario.cjs
```

Los comandos npm cubren gateway/frontend: 87 pruebas aprobadas en la retirada (64 del gateway y 23 de frontend). No construyen Java. Por cada servicio, ejecutar su mvnw.cmd con -f apuntando a su pom.xml y package; -Ppostgres-it verify agrega IT con bases exclusivas y variables de prueba. No usar las bases de aplicación para IT.

Los verificadores HTTP actuales son scripts/verify-java-gateway.cjs, scripts/verify-admin-deletion.cjs y scripts/verify-phase7-runtime.cjs. Requieren el entorno local preparado. Crean fixtures con identificadores propios y solo limpian esos registros. El último interrumpe brevemente el borde para comprobar entrega directa de eventos y lo recupera. Las pruebas y resultados de fases anteriores se conservan como evidencia histórica, sin sumarlos como pruebas únicas de esta entrega.

## Contenido y archivo histórico

El contenido compartido está en content/stockquest.json: nueve módulos, nueve microlecciones, nueve desafíos y dos escenarios. La aplicación incluye aprendizaje, desafíos, simulaciones, progreso, perfiles, grupos, informes y gestión pedagógica con eliminaciones protegidas. Faltan los vídeos propios aceptados como pendiente de RF11.

[legacy/README.md](legacy/README.md) conserva el backend anterior, sus pruebas, migraciones y plantillas. Se verificaron 42 fuentes por SHA-256 antes y después del traslado. Las dependencias Prisma, los scripts db:* y los comandos habituales legacy fueron retirados del proyecto activo. pg y bcrypt permanecen como dependencias de desarrollo de las herramientas locales de aprovisionamiento/prueba; no forman parte del proceso HTTP del gateway. No se borraron bases ni progreso del usuario.

## Despliegue y trabajo pendiente

La presentación temporal usa frontend estático en Vercel y un túnel hacia la API local. En la comprobación posterior a la retirada, la API local y el proxy web devolvieron 200; el dominio anterior del túnel no resolvió y la API pública Vercel devolvió 502. Esa conexión temporal necesita recuperación antes de otra presentación. No se modificó ni republicó Vercel durante la migración.

Las plantillas raíz Vercel/Render ahora usan el gateway sin Prisma y requieren orígenes/tokens de servicios Java accesibles; no alojan los Java ni sus bases. La configuración anterior se conserva en legacy. No se ejecutó despliegue permanente.

Jenkins, release, CloudFormation y operación continua permanecen aplazados por solicitud del usuario. AG-05 y el cierre técnico de la migración local quedaron validados expresamente por el usuario el 21 de octubre de 2026. Siguen abiertos el material de vídeos, controles RNF y consolidación/versionado. Consultar [pendientes globales](docs/PENDIENTES-ACEPTACION-GLOBAL.md), [despliegue](docs/DESPLIEGUE.md) y [evidencias de retirada](docs/verificaciones/retirada-legacy-20261021/RESULTADOS.md).
