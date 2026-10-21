# AG-05 — Resultados

21 de octubre de 2026. Implementación y activación local completadas; cierre validado expresamente por el usuario el 21 de octubre de 2026. Esta aceptación no constituye una nueva ejecución de las pruebas registradas debajo ni certifica producción.

- 120 casos Java aprobados de personas y aprendizaje: 82 unitarios/HTTP/arquitectura y 38 IT PostgreSQL. Se cuentan una vez por caso a partir de reportes de distintas ejecuciones, sin sumar repeticiones.
- 87 pruebas Node aprobadas (64 gateway, 23 frontend).
- Ocho grupos HTTP específicos y once del gateway aprobados.
- Doce aprendices inicializados; proyecciones coincidentes con la fuente y nueve respuestas de línea base conservadas.
- JAR empaquetados correctamente después de detener los procesos que bloqueaban los archivos. Sus pruebas se ejecutaron por separado.
- Lectura activa projection; publicación de snapshots habilitada.
- Sin cambios de fuente en simulación Java ni reejecución de su suite Maven. Sin restauración completa de dumps ni certificación de producción.

[Resumen y checksums](evidencia.json), [JUnit](junit-summary.json), [integración AG-05](integration.json), [gateway](gateway-integration.json), [inicialización](warmup.json), [comparación](comparison.json), [línea base](baseline-comparison.json).

Los datos privados de backups y credenciales permanecen fuera del repositorio. Los registros de prueba se eliminaron únicamente por sus IDs nuevos y el entorno quedó operativo.
