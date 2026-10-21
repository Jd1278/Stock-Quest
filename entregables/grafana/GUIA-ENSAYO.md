# Grafana y Prometheus en Stock Quest: guia de exposicion

Entrega prevista: 21 de octubre de 2026. Duracion orientativa: 7–8 minutos, ajustable a 5–10. Las ocho diapositivas incluyen notas del presentador. Usa PowerShell para todos los comandos de esta guia.

## Antes de exponer

Haz esta preparacion 15–20 minutos antes. No reinstales herramientas ni compiles durante la exposicion. Conserva PostgreSQL activo y las carpetas `C:\StockQuestTools` y `.stockquest-local`; contienen herramientas, configuracion local y el acceso cifrado del entorno. Usa tu mismo usuario de Windows.

Desde cualquier carpeta:

```powershell
Set-Location 'C:\Users\LENOVO\Documents\Codex\2026-09-05\files-mentioned-by-the-user-desarrrollo\outputs\Stock-Quest'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-observability-demo.ps1
```

Este nuevo script comprueba servicios activos o inicia el entorno con el perfil observabilidad, verifica readiness y metricas, inicia Prometheus/Grafana solo si sus puertos estan libres y espera tres objetivos Java UP. No instala, compila, crea cuentas ni elimina datos. Los procesos de herramientas se abren ocultos y escriben registros en `.stockquest-local\observability`. Si falla, revisa el mensaje antes de seguir. Su sintaxis se comprobo durante la preparacion; no se ejecutaron automaticamente sus operaciones de arranque.

Abre estas paginas:

- Dashboard: http://127.0.0.1:3000/d/stockquest-local-observabilidad
- Objetivos: http://127.0.0.1:9090/targets
- Aplicacion: http://127.0.0.1:5174

Inicia sesion en Grafana con el usuario y la contrasena que creaste. El dashboard ya importado debe conservarse en la carpeta de datos de Grafana. Si falta, importa `observability\stockquest-dashboard.json` y selecciona la fuente Prometheus configurada en http://127.0.0.1:9090.

Selecciona Last 15 minutes y refresco 5s. Espera al menos un minuto. Un dashboard vacio despues de reiniciar no significa necesariamente fallo: debe acumular nuevas muestras. Las caidas de hoy ya no apareceran manana en una ventana de 15 minutos, por eso se repetira el ensayo.

## Generar actividad antes de presentar

La mejor evidencia de uso es navegar por aprendizaje o el simulador. Para copiar al portapapeles la clave de la cuenta de aprendiz existente:

```powershell
node scripts/local-java.cjs credentials learner
```

El comando muestra el correo y copia la clave sin imprimirla. No muestres claves en la proyeccion ni las pegues en la terminal. La aplicacion usa su login propio, distinto del de Grafana y del de Jenkins.

Si necesitas una senal HTTP sencilla sin cambiar datos, puedes consultar readiness de forma secuencial:

```powershell
1..20 | ForEach-Object {
    foreach ($puerto in @(14630,14620,14610)) {
        Invoke-RestMethod "http://127.0.0.1:$puerto/health/ready" -TimeoutSec 5 | Out-Null
    }
    Start-Sleep -Milliseconds 500
}
```

Explica que este trafico es una comprobacion tecnica de salud. No es una prueba de carga ni una medicion del comportamiento de un usuario. No afirmes tiempos de negocio basandote en estas llamadas.

## Guion por diapositiva

| Diapositiva | Tiempo | Que explicar |
|---|---|---|
| 1. Grafana y Prometheus | 30 s | Stock Quest tiene tres servicios y necesita mostrar su estado de ejecucion |
| 2. Recorrido de metricas | 50 s | Actuator/Micrometer exponen, Prometheus recoge cada 15 s y Grafana consulta y representa |
| 3. Configuracion | 40 s | Instalacion nativa, perfil observabilidad y fuente de datos local; OSS no requiere cuenta Cloud |
| 4. Objetivos Java | 40 s | Tres objetivos UP y puertos. UP valida recoleccion, no el recorrido completo del usuario |
| 5. Ocho paneles | 50 s | Mostrar memoria, CPU, HTTP, p95, 5xx y conexiones. p95 requiere muestras y es una estimacion |
| 6. Caida | 40 s | Presentar captura del ensayo. Solo simulacion baja a cero y los otros dos mantienen UP |
| 7. Recuperacion | 40 s | Captura posterior e informes PASS. El historial conserva el cambio y readiness devuelve ok |
| 8. Demostracion | 2 min aprox. | Cambiar al navegador, ejecutar el script, explicar la caida y recuperarla. Cerrar con alcance local |

Si dispones solo de cinco minutos, resume las diapositivas 3–5 y dedica al menos 90 segundos al ensayo. Con diez minutos puedes explicar las graficas y responder preguntas.

## Comando del ensayo en vivo

Desde la raiz del proyecto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\demo-observability.ps1
```

1. El script exige que los tres servicios esten UP y valida el PID/JAR de simulacion.
2. En la primera pausa muestra los tres UP en Grafana. Pulsa Enter en PowerShell para detener simulacion.
3. Espera a que el script confirme la caida. Suele necesitar un ciclo de scrape de 15 s y el refresco de Grafana. El limite de espera del script es 45 s.
4. Muestra simulacion en rojo y el historial en cero. Personas y aprendizaje deben seguir UP. El script seguira esperando Enter: el servicio no se recupera hasta que lo pulses.
5. Pulsa Enter para recuperar. Espera PASS. Muestra los tres UP y el descenso con su recuperacion en el historial.
6. Conserva el informe JSON que imprime el script. Deja la terminal abierta hasta terminar.

Texto breve: «Prometheus consulta cada servicio por separado. Al detener simulacion, pierde su recoleccion y Grafana lo muestra. Los otros dos procesos conservan sus metricas. Reinicio simulacion, compruebo readiness y confirmo que Prometheus vuelve a recoger sus datos».

## Comprobacion y recuperacion

Estado de la aplicacion:

```powershell
node scripts/local-java.cjs status
```

Si se interrumpio la demostracion con simulacion detenida:

```powershell
node scripts/local-java.cjs restart simulation
Invoke-RestMethod 'http://127.0.0.1:14610/health/ready' -TimeoutSec 10
```

Espera despues un ciclo de Prometheus. No finalices todos los procesos Java ni reinicies PostgreSQL durante la presentacion.

Si la aplicacion estaba activa sin el perfil de metricas y `/actuator/prometheus` devuelve 404, haz esto ANTES de exponer:

```powershell
node scripts/local-java.cjs stop
# Solo si stop termino correctamente:
$env:SPRING_PROFILES_ACTIVE = 'observabilidad'
node scripts/local-java.cjs start
```

Repite el script de preparacion cuando el entorno este listo. Si PostgreSQL no responde, comprueba su servicio en Servicios de Windows. No crees otras bases ni cambies credenciales para arreglar un arranque.

Si falla la demo, conserva las capturas incluidas en las diapositivas 6 y 7 y presenta la evidencia de los dos ensayos anteriores con PASS, distinguiendola de lo ocurrido en vivo. No declares aprobada una nueva ejecucion fallida.

## Arranque manual de herramientas, si necesitas ver sus registros

Solo si el puerto correspondiente esta libre. No ejecutes estos comandos si el script ya arranco las herramientas.

Ventana PowerShell para Prometheus (dejar abierta):

```powershell
Set-Location 'C:\StockQuestTools\prometheus'
.\prometheus.exe `
    --config.file='C:\Users\LENOVO\Documents\Codex\2026-09-05\files-mentioned-by-the-user-desarrrollo\outputs\Stock-Quest\observability\prometheus-local.yml' `
    --web.listen-address=127.0.0.1:9090 `
    --storage.tsdb.path=.\data `
    --storage.tsdb.retention.time=2d `
    --storage.tsdb.retention.size=256MB
```

Otra ventana PowerShell para Grafana (dejar abierta):

```powershell
Set-Location 'C:\StockQuestTools\grafana'
$env:GF_SERVER_HTTP_ADDR = '127.0.0.1'
$env:GF_SERVER_HTTP_PORT = '3000'
.\bin\grafana.exe server --homepath 'C:\StockQuestTools\grafana'
```

## Preguntas frecuentes

- ¿Grafana almacena estas metricas? Prometheus guarda las series. Grafana guarda su configuracion de dashboards y consulta la fuente.
- ¿UP significa que todo funciona? Significa que el scrape fue correcto. Readiness y pruebas de flujos completan la comprobacion.
- ¿Por que no aumenta 5xx cuando detengo Java? El proceso apagado no puede responder HTTP. Se detecta con up=0; el gateway puede devolver 503 a sus propios clientes.
- ¿Esta demostrado el 99 % de disponibilidad? No. Requiere una ventana de observacion y criterios acordados.
- ¿Hay alertas automaticas? Todavia no. Esta entrega demuestra visualizacion y ensayo manual. Reglas y notificaciones quedan pendientes.
- ¿Se monitoriza Jenkins? No en este dashboard. Se monitorizan los tres servicios Java de Stock Quest.

## Evidencia usada

Capturas proporcionadas en `grafana -prometheus.docx`; dos informes del script de ensayo con PASS, readiness ok y secuencia 1/0/1 para simulacion. Pruebas JUnit de la preparacion: 40 personas, 29 aprendizaje y 37 simulacion, sin fallos. No se suman esas 106 pruebas como si fueran una nueva ejecucion de las 232 de fase 7.

Referencias oficiales: https://prometheus.io/docs/introduction/overview/ ; https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/ ; https://docs.spring.io/spring-boot/3.5/reference/actuator/metrics.html
