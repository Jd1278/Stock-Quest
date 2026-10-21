# Matriz de aceptación — fase 7

Fuente: Stock_Quest.docx, SHA-256 `620e3ec0b5fd00366f9a6c44571ea3fd17276dc6a39f988b1bb3db4ee31dd149`. Se extrajeron 20 RF y seis RNF. El estado validado-local describe evidencia funcional local, no una certificación de producción ni aceptación humana final.

| ID | Requisito | Estado | Evaluación |
|---|---|---|---|
| RF01 | Registro de Usuarios | validado-local | Registro público normaliza campos y crea solo aprendices; hash BCrypt. |
| RF02 | Inicio de Sesión y Verificación de Credenciales | validado-local | Firma, expiración, credenciales, cuenta activa y revocación. |
| RF03 | Identificación de Roles | validado-local | Rol consultado en la cuenta vigente; no se acepta el rol del cliente. |
| RF04 | Redirección por Rol | validado-local | Guardas y destino por rol; usuario confirmó acceso a los tres roles. |
| RF05 | Acceso al Módulo de Estudio | validado-local | Nueve módulos visibles y secuencia de desbloqueo, confirmados por el usuario. |
| RF06 | Ejecución de Simulaciones | validado-local | Dos escenarios, decisiones persistidas, concurrencia y ciclo de vida React corregido; usuario confirmó funcionamiento. |
| RF07 | Visualización de Tarjetas de Repaso | validado-local | Tarjetas/lecturas teóricas antes del desafío; usuario confirmó lectura. |
| RF08 | Visualización de Resultados de Simulación | validado-local | Reporte operativo y financiero e historial finalizado; usuario confirmó resultado. |
| RF09 | Recepción de Retroalimentación | validado-local | Feedback de faltantes, exceso y equilibrio; score determinista. |
| RF10 | Realización de Lecciones | validado-local | No completa sin respuestas correctas; progreso idempotente y desbloqueo confirmado. |
| RF11 | Estudio de Material Teórico | parcial | Texto cargado; soporte de IDs de vídeo implementado. Vídeos del proyecto no suministrados: pendiente expresamente aceptado por el usuario. |
| RF12 | Monitoreo de Progreso Personal | validado-local | XP, logros, intentos y simulaciones persistentes; consistencia tras reinicios. |
| RF13 | Consulta de Temáticas que Requieren Refuerzo | validado-local | Promedio por tema y recomendaciones de refuerzo; mejor nota para XP se calcula por separado. |
| RF14 | Consulta de Porcentaje de Progreso | validado-local | Porcentajes global y modular derivados de las lecciones publicadas. |
| RF15 | Acceso al Módulo de Contenidos | validado-local | Panel exclusivo del gestor; permisos en borde y propietario. |
| RF16 | Gestión de Contenido de Aprendizaje | validado-local | Crear/editar/ordenar contenido; eliminación adicional solicitada con confirmación y protección de historial. |
| RF17 | Gestión de Variables de Módulos | validado-local | Parámetros validados; snapshots conservan variables de partidas anteriores. |
| RF18 | Acceso al Módulo de Seguimiento | validado-local | Panel del líder y equipo propio; consulta manual confirmada. |
| RF19 | Visualización de Informes Detallados y Calificaciones | validado-local | Informes con avance, calificación por tema y actividades; autorización antes de consultar aprendizaje. |
| RF20 | Panel de Grupos de Trabajo y Gestión de Colaboradores | validado-local | Líder crea aprendices y administra grupos/miembros propios. Usuario confirmó asignación, retirada y eliminación. |
| RNF01 | Rendimiento y Velocidad | parcial | Muestra local API hasta 1231 ms, nueve temas y 11 aprendices. No prueba carga/render completo a 10 Mbps ni arranque frío. |
| RNF02 | Usabilidad | parcial | Usuario validó flujos y correcciones visuales. No se midió una curva de aprendizaje menor de 15 minutos. |
| RNF03 | Disponibilidad | pendiente | Health checks y recuperación probados. Sin ventana medida, monitorización ni evidencia de disponibilidad del 99 %. |
| RNF04 | Seguridad de Datos | parcial | BCrypt, JWT, permisos, revocación y secretos locales DPAPI verificados. Correo/documento/teléfono se guardan como campos normales; cifrado de datos personales en aplicación y almacenamiento/backup no certificado. |
| RNF05 | Compatibilidad Multiplataforma | pendiente | Diseño adaptable y revisión manual local. No hay matriz Chrome/Edge/Firefox/Safari con escritorio y móvil ejecutada. |
| RNF06 | Retroalimentación de Interfaz | validado-local | Confirmaciones y errores visuales, estados ocupados y cancelación; audio no exigido adicionalmente porque el requisito permite visual o sonoro. |

La [matriz JSON](verificaciones/fase7-20261019/matriz-requisitos.json) enlaza cada requisito con fuentes y pruebas concretas. Las ejecuciones de cierre se documentan en el informe de fase 7; citar el código de una prueba por sí solo no equivale a haberla ejecutado. El usuario confirmó manualmente los flujos de los tres roles y autorizó mantener los vídeos pendientes.
