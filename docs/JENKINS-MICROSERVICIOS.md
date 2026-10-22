# Jenkins — primer pipeline de microservicios

Este job verifica y empaqueta los tres servicios Java secuencialmente. No inicia ni detiene la aplicación local, no usa DPAPI y no despliega. Es la primera parte de 8B: gateway/frontend y aceptación de CI completa siguen pendientes.

## Configuración del job

- Tipo: Pipeline; nombre sugerido: stockquest-java-ci.
- Definition: Pipeline script from SCM.
- SCM: Git; URL https://github.com/Jd1278/Stock-Quest.git.
- Rama: */codex/reestructuracion-stock-quest.
- Script Path: Jenkinsfile.
- Credencial Git: ninguna si el repositorio es público; usar una credencial de lectura si es privado.
- Agente: stockquest-windows, un ejecutor, conectado desde la terminal del usuario.

El usuario debe mantener sincronizada la contraseña de cada rol PostgreSQL con su credencial Jenkins. La conexión directa de personas ya fue comprobada por el usuario; eso no acredita todavía las otras dos conexiones ni el uso de credenciales desde Jenkins.

| Credencial Jenkins | Usuario | Base |
|---|---|---|
| sq-ci-people-db | sq_ci_people | sq_test_people_ci |
| sq-ci-learning-db | sq_ci_learning | sq_test_learning_ci |
| sq-ci-simulation-db | sq_ci_simulation | sq_test_simulation_ci |

Cada rol requiere LOGIN y permisos de propietario en su base dedicada, incluido CREATE y USAGE en public. Sin superusuario. Nunca usar bases de aplicación en este job.

## Ejecución

El checkout es propio de Jenkins. scripts/ci/test-java.ps1 valida el nombre de la base, requiere variables de conexión e invoca Maven Wrapper con clean verify y perfil postgres-it. Esto ejecuta Surefire, compilación/empaquetado y Failsafe; cualquier salida Maven distinta de cero falla el job. Los informes JUnit se publican por servicio, sin conservar propiedades, y se archivan los tres JAR y su manifiesto SHA-256 asociado al commit. No se publica release ni despliegue.

Se retienen tres ejecuciones y los artefactos de una. El chequeo de disco inferior a 1 GB detiene el pipeline, pero superar ese valor no garantiza espacio suficiente: debe vigilarse durante la primera ejecución. No se instala npm ni se duplican sus dependencias en este primer job.

Para probar en un checkout local con servicios activos, TestsOnly ejecuta test failsafe:integration-test failsafe:verify sin reempaquetar JAR abiertos por Windows. Requiere las variables SQ_PEOPLE_TEST_*, SQ_LEARNING_TEST_* o SQ_TEST_* según el servicio; no se guardan contraseñas en el script.

## Aceptación

Exigir SUCCESS, cero fallos/errores y revisar omisiones; informes de los tres servicios y tres JAR/checksums. Un resultado local no equivale a una ejecución Jenkins. Este Jenkinsfile queda pendiente de validación real por Jenkins; no se dispone de sesión API autenticada desde el asistente. Un 403 no debe resolverse desactivando la autenticación.

Ante error de credenciales, corregir la credencial Jenkins conservando su ID. Ante error de compilación, detener promoción, conservar logs y corregir por nuevo commit. No cambiar hba a trust, no dar superusuario a CI ni borrar bases para resolver el error.

## Resultado de preparación local

Se ejecutó el script con TestsOnly sobre las tres bases históricas exclusivas de pruebas: 68 casos de personas, 52 de aprendizaje y 44 de simulación (164 total), cero fallos, errores u omisiones. Todos los reportes utilizados se regeneraron durante esta ejecución. Incluye pruebas de PostgreSQL real, dominio, HTTP y arquitectura según las suites de cada servicio. No se empaquetaron JAR para evitar los bloqueos Windows de la aplicación activa. El empaquetado clean verify y la sintaxis del Jenkinsfile en el servidor siguen pendientes de la primera ejecución Jenkins. [Evidencia saneada](verificaciones/jenkins-java-local/resultado.json).
