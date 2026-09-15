# Verificación de la entrega

Fecha: 5 de septiembre de 2026.

## Resultado ejecutado

| Comprobación | Resultado |
|---|---|
| Generación Prisma y compilación TypeScript del backend | Correcto |
| TypeScript frontend y build Vite de producción | Correcto |
| ESLint backend/frontend | Correcto, sin advertencias |
| Jest backend: middleware, validadores y motor | 15 pruebas aprobadas |
| Jest + React Testing Library: roles, hooks, autenticación y simulación | 10 pruebas aprobadas |
| Supertest con base real: flujo completo y aislamiento | 6 pruebas aprobadas |
| Migración inicial en base de aplicación | Aplicada |
| Migración inicial en base aislada de integración | Aplicada y sin migraciones pendientes |
| Seed de contenido y cuentas privilegiadas locales | Ejecutado |
| Frontend local por HTTP | 200 en la vista previa |

Total: **31 pruebas aprobadas**. Las seis de integración se ejecutaron por separado contra una base exclusiva; por diseño, `npm test` sin `RUN_DB_TESTS=1` las muestra como omitidas.

## Qué comprueban las pruebas

- Registro real, hash bcrypt, login y perfil sin hash expuesto.
- JWT ausente, adulterado, expirado, revocado y usuario desactivado.
- Rechazo del campo rol en el registro público.
- Prohibición de gestión pedagógica para el aprendiz.
- Desbloqueo de lecciones y evaluación de respuestas en servidor.
- Completar dos veces una lección no duplica el registro de progreso.
- Pedidos recibidos antes de demanda según plazo, costos, ventas perdidas, stock no negativo, costo inicial y pedidos posteriores al horizonte.
- Snapshot de escenario preservado cuando el gestor modifica sus variables.
- Dos decisiones simultáneas para el mismo día: una se procesa y otra devuelve 409.
- Resultado único persistido y consulta posterior de progreso/logros.
- Líder restringido a aprendices propios; no puede incorporar un aprendiz ajeno al grupo.
- Un aprendiz no puede consultar la partida de otro.
- Gestor puede consultar contenido y actualizar escenarios.
- Renderizado condicional por rol, carga/error de hooks, login fallido, limpieza de sesión y bloqueo de doble envío.
- Una respuesta tardía del simulador no restaura datos de una sesión anterior después de logout.

## Trazabilidad funcional

| Requisito | Implementación del MVP |
|---|---|
| RF01 Autenticación | JWT Bearer, expiración, rol leído de la base y revocación |
| RF02 Usuarios | Registro público y por líder, edición y desactivación/reactivación |
| RF03 Contenido | CRUD de creación/edición, orden, publicación, microlecciones e importación TXT |
| RF04 Aprendizaje | Nueve temas, secuencia y desbloqueo, evaluación y progreso |
| RF05 Simulaciones | Phaser 3, decisiones diarias, consecuencias y retroalimentación persistidas |
| RF06 Gamificación | XP, nivel, logros y aprobación derivados de actividad real |
| RF07 Grupos | Crear, renombrar, eliminar, asignar y retirar miembros propios |
| RF08 Informes | Perfil individual, resumen del equipo, promedios por temática y refuerzo |
| RF09 Perfil | Nombre, correo, teléfono y contraseña; reautenticación sensible |
| HU10/HU11 | Formularios de contenido y configuración de variables de escenarios |

RF03 se implementa mediante importación de `.txt` como microlección, no como repositorio de archivos binarios. La gestión de usuarios utiliza baja lógica para preservar el historial. Los videos se vinculan por ID mediante YouTube IFrame API; faltan los videos del canal específico del proyecto.

## Entorno y límites de lo verificado

La ejecución real utilizó Node 24.15, Prisma 6.19 y XAMPP/MariaDB 10.4.32 en el puerto 3310. El esquema usa proveedor MySQL y el workflow declara MySQL 8. **MySQL 8 en GitHub Actions no se ejecutó desde esta sesión**; la prueba local de persistencia fue sobre MariaDB.

El frontend compilado separa Phaser en un chunk diferido de aproximadamente 340 KB gzip. La carga base JavaScript es aproximadamente 62 KB gzip. Son tamaños de build, no mediciones del requisito de 3 segundos. Se mostró una advertencia de tamaño de chunk de Phaser, que se carga al entrar en una partida.

La configuración nativa de Vite y límites de concurrencia/memoria permitieron completar el build en este entorno Windows. No se cambió el stack ni se simuló el resultado de compilación. La DLL de Prisma requiere detener la API antes de regenerarse en Windows.

No se ejecutó una matriz visual de Chrome, Edge, Firefox y Safari, una auditoría WCAG formal, reproducción del canal YouTube del usuario, pruebas de carga a 10 Mbps, monitorización de 99 % de disponibilidad ni un despliegue en nube. Estos criterios permanecen pendientes para la validación del entorno final.
