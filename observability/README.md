# Demostración local de Stock Quest con Prometheus y Grafana

Actualización del 21 de octubre de 2026. Demostración local implementada y ensayada para una exposición de 5 a 10 minutos. Jenkins está instalado; su pipeline y la entrega operativa completa siguen pendientes. Esta demostración no certifica disponibilidad de producción.

## Estado de la preparación

- Usuario comprobó Prometheus 3.13.4 en 9090 con su propio objetivo UP.
- Usuario inició Grafana OSS en 3000 y confirmó la consulta correcta de la API Prometheus desde su fuente de datos.
- Entorno integrado Java reportado activo: personas 14630, aprendizaje 14620 y simulación 14610.
- Fuentes preparadas: Actuator y registro Prometheus en los tres POM, perfil optativo `observabilidad` y `prometheus-local.yml` con tres objetivos Java.
- Validación ejecutada por el asistente: XML de POM y presencia de dependencias, `promtool check config observability/prometheus-local.yml` aprobado.
- Usuario compiló los tres servicios con JDK 21: 40 pruebas de personas, 29 de aprendizaje y 37 de simulación, sin fallos/errores/omitidas; no incluyeron las IT PostgreSQL. Reinició con el perfil observabilidad y comprobó HTTP 200 y métricas JVM en los tres servicios.
- Usuario conectó los tres objetivos en Prometheus, importó `stockquest-dashboard.json` y ejecutó dos ensayos con PASS mediante `scripts/demo-observability.ps1`: simulación up 1/0/1, otros dos servicios UP y readiness recuperado.
- Capturas y presentaciones basadas en su material: `entregables/grafana`. Guía con comandos y recuperación: `entregables/grafana/GUIA-ENSAYO.md`. El nuevo script `scripts/start-observability-demo.ps1` tiene sintaxis comprobada; su arranque completo no se declaró ejecutado por el asistente.
- En la auditoría del 21 de octubre Grafana y Prometheus no respondían; su configuración y las pruebas históricas no implican arranque permanente. Consultar el estado antes de exponer.

## Procedimiento reproducible de activación

Desde la raíz del repositorio, detener el supervisor con `node scripts/local-java.cjs stop`, conservar los JAR anteriores fuera de target y compilar secuencialmente mediante cada `mvnw.cmd -B -ntp package`. Sin `-DskipTests`: ejecutar JUnit. El perfil PostgreSQL se validará por separado si el cambio lo requiere; `package` sin ese perfil no ejecuta las IT.

El supervisor hereda variables cuando se inicia. Para activar métricas, establecer `$env:SPRING_PROFILES_ACTIVE = 'observabilidad'` y ejecutar `node scripts/local-java.cjs start` después de detenerlo completamente. Reiniciar solo un hijo del supervisor antiguo no incorpora nuevas variables. El perfil publica únicamente health y prometheus, sin detalles de salud ni descubrimiento, y fuerza `server.address=127.0.0.1`. Está destinado a la demostración local.

Comprobar `/health/ready` y `/actuator/prometheus` en los tres puertos antes de cambiar Prometheus. Reiniciar después Prometheus con `prometheus-local.yml` como ruta absoluta, almacenamiento en `C:\StockQuestTools\prometheus\data`, escucha 127.0.0.1:9090 y retención 2d/256MB. Conservar el prometheus.yml distribuido. No iniciar dos procesos en 9090.

## Lectura correcta de los datos

`up{job="stockquest-java"}` comprueba el éxito de la recolección de métricas. No garantiza el estado de la base, el login o un flujo de usuario. Complementar con la comprobación de readiness y un recorrido real de la aplicación.

Micrometer incorpora métricas HTTP y JVM. Las series HTTP aparecen tras recibir solicitudes. La latencia de `/health/ready` no equivale a la latencia de una simulación. Usar operaciones de la interfaz para generar tráfico representativo y distinguir errores esperados de permisos de los fallos 5xx.

El dashboard, las capturas, las presentaciones y el ensayo de simulación están realizados. Continúan pendientes alertas/notificaciones verificadas, continuidad operativa y ensayos equivalentes si se quiere ampliar cobertura a otras dependencias. No usar cuentas, tokens, contraseñas ni datos personales como etiquetas de métricas o capturas.

## Recuperación

Si falla la compilación, detener el procedimiento y revisar Maven sin reiniciar con artefactos parciales. Para volver al estado anterior, restaurar solo los JAR guardados, retirar la variable SPRING_PROFILES_ACTIVE de la sesión y arrancar el supervisor. Las bases y la configuración DPAPI permanecen intactas. El YAML original de Prometheus se conserva para volver a la recolección inicial.

Referencias: https://docs.spring.io/spring-boot/3.5/reference/actuator/metrics.html y https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html
