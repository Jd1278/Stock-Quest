# Actualización PostgreSQL

Por instrucción del propietario del 15 de septiembre de 2026, el motor vigente es PostgreSQL con adaptador Node.js/pg. La descripción funcional siguiente se conserva; las referencias a MySQL explican el diseño original. Ver POSTGRESQL.md para la verificación actual.

# Arquitectura y decisiones

## Análisis del SRS

El archivo IEEE 830 es la referencia funcional. El prompt maestro es la instrucción de implementación y resuelve la elección tecnológica: Express y Prisma/MySQL prevalecen sobre las menciones generales a BaaS/Firestore. No se agregó un servicio de inteligencia artificial: la retroalimentación del MVP se genera mediante reglas verificables sobre consecuencias simuladas, tal como se solicita en el prompt.

El SRS menciona tanto cuatro meses como doce semanas. Se conserva como discrepancia de planificación, sin introducir una fecha de entrega inventada.

## Datos e integridad

- `User`: identidad, perfil, empresa, documento único, hash bcrypt, rol y versión de sesión. `leaderId` delimita la propiedad del equipo.
- `Role`: enum cerrado con APRENDIZ, LIDER y GESTOR_PEDAGOGICO; no requiere tabla mutable para tres valores fijos.
- `TrainingGroup` y `GroupMembership`: grupos del líder y relación muchos-a-muchos con aprendices propios.
- `Module`, `Lesson`, `Content`, `Challenge`: orden, material, referencias YouTube y evaluación.
- `LearningProgress`: clave compuesta usuario/lección; completar dos veces no duplica progreso ni XP.
- `ChallengeAttempt`: respuesta, nota, fecha y desafío. El número de intento se obtiene del historial, evitando un contador redundante.
- `SimulationScenario`: variables editables para nuevas partidas.
- `Simulation`: usuario, escenario, snapshot inmutable de variables, día y decisiones. Una actualización condicional por día impide procesar dos veces una decisión concurrente.
- `SimulationResult`: relación uno-a-uno, score, beneficio, servicio, bitácora y retroalimentación.
- `UserAchievement`: clave usuario/logro para impedir duplicados.
- `PerformanceMetric`: DTO calculado en el servicio de progreso; no se almacena una tabla de métricas derivadas que pueda quedar desactualizada.

Las referencias históricas usan Restrict; la desactivación de aprendices conserva resultados y revoca sesiones. Se mantienen índices de propiedad, orden, usuario y fecha. La migración SQL se generó desde el esquema Prisma y se aplicó en bases nuevas aisladas.

## Autenticación y autorización

El registro público crea exclusivamente aprendices y rechaza propiedades adicionales, incluido `role`. Solo un líder puede registrar aprendices bajo su propia responsabilidad. Las cuentas privilegiadas iniciales se aprovisionan por seed con variables privadas.

El JWT contiene `sub`, versión de sesión y reclamaciones temporales/de emisor/audiencia. En cada solicitud se vuelve a consultar estado, rol y versión del usuario en la base; un rol del cliente no concede permisos. HS256 está fijado explícitamente. La contraseña usa bcrypt con factor 12 y límite de 72 bytes.

El token Bearer se conserva en `sessionStorage` para persistir recargas dentro de la pestaña. Se elimina al cerrar la pestaña, cerrar sesión o recibir 401. Este almacenamiento es accesible al JavaScript del mismo origen; la aplicación no inyecta HTML de las lecciones. Las cabeceras CSP del frontend de producción reducen el riesgo de scripts inesperados. No se implementa refresh token ni inicio de sesión persistente entre sesiones de navegador.

Logout, desactivación y cambio de correo/contraseña incrementan la versión de sesión. Por simplicidad, revocan todas las sesiones del usuario. Los cambios sensibles requieren la contraseña actual.

Los líderes no pueden leer resultados de aprendices externos ni asignarlos a sus grupos. La API devuelve 404 para recursos ajenos. Las rutas de React complementan estas reglas sin sustituirlas.

## Reglas de aprendizaje

Los módulos publicados se ordenan por posición; dentro de ellos se ordenan las lecciones. La primera lección incompleta permanece disponible. Las posteriores están bloqueadas y la respuesta de ruta no entrega su cuerpo, video ni desafíos. Las lecciones completadas siguen siendo consultables.

Para completar una lección hay que registrar una respuesta correcta en cada desafío asociado. El servidor guarda cada intento, determina la nota y entrega una explicación. Completar una lección sin desafíos es válido para material de lectura.

La creación de una nueva lección anterior en el orden puede cambiar los siguientes desbloqueos. Los cambios pedagógicos no invalidan logros ya obtenidos. La edición de contenido publicado debe coordinarse con los grupos activos.

## Modelo de simulación

1. El usuario decide una cantidad entera entre cero y el máximo del escenario.
2. Se reciben pedidos cuyo plazo se cumple ese día.
3. Se atiende la demanda hasta agotar existencias; el resto se registra como venta perdida.
4. Se cobra adquisición del pedido nuevo, costo fijo si es mayor que cero, almacenamiento de stock al cierre y penalización de faltantes.
5. Se persiste el día junto con la decisión. Al cerrar el horizonte, se guarda un resultado único y se concede el logro.

Pedido en día 1 con plazo de 2 días: recepción al inicio del día 3. No existen entregas instantáneas ni backorders. La demanda es una secuencia configurada por el gestor; el aprendiz ve su rango, no la secuencia futura. Cada partida conserva su snapshot aunque el escenario se edite.

`beneficio = ingresos por ventas - costo de inventario inicial - compras - costos fijos de pedido - almacenamiento - penalizaciones`.

Los pedidos que llegan después del horizonte se pagan; no se vende ni liquida el inventario final. Esta es una convención pedagógica explícita, no un balance contable general. Los costos son valores de simulación en pesos colombianos, no precios de mercado.

`nivel de servicio = unidades vendidas / unidades demandadas`. Antes de cualquier demanda se muestra 100 % junto con la indicación de que aún no se evaluó demanda.

La puntuación asigna hasta 80 puntos al servicio y hasta 20 al resultado económico. El cálculo es determinista y se prueba con ejemplos de recepción, costos, faltantes y pedidos tardíos. La retroalimentación prioriza faltantes, luego exceso de stock y finalmente equilibrio.

## Gamificación

- 50 XP por lección única completada.
- Hasta 20 XP por desafío, usando el mejor intento.
- XP iguales al score de cada simulación finalizada.
- Nivel = `floor(XP / 250) + 1`.
- Aprobación: completar toda la ruta publicada y obtener al menos 70 en una simulación.
- Refuerzo temático: promedio de todos los intentos del tema inferior a 70. El indicador se distingue de la mejor nota usada para XP.

## Capa Phaser

`games/inventory/game.ts` recibe un estado e interfaz de interacción; no conoce identidad, tokens ni persistencia. El clic en el proveedor devuelve el foco al formulario de pedidos. El formulario accesible envía la decisión a Zustand y al servicio HTTP. Los eventos `inventory:state` actualizan estanterías, stock y día. El componente destruye la instancia y retira listeners al desmontarse.

## Límites del MVP

No se añadieron multiempresa compleja, correo transaccional, MFA, recuperación de contraseña, pagos ni IA externa. La empresa es un dato de perfil; el aislamiento administrativo efectivo depende de `leaderId`. No hay un rol superadministrador universal.

El archivo `.txt` se importa como texto, se revisa y se guarda como microlección. No se alojan PDF/DOCX binarios ni videos; el gestor puede relacionar un ID de YouTube con cada lección. Se debe configurar el canal/lista del proyecto antes de la entrega académica multimedia final.

