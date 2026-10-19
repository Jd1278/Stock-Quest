import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const ROOT = process.cwd();
const BUILD = path.join(ROOT, '.newrelic-slides-build');
const SKILL = 'C:/Users/LENOVO/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations';
const PYTHON = 'C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
process.env.RUNTIME_NODE_MODULES = 'C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const OUTPUT = path.join(ROOT, 'entregables/Stock-Quest_New-Relic_Baja-Escala.pptx');
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
const C = {navy:'#0B233F', orange:'#E9850C', ink:'#152D43', muted:'#526575', pale:'#EFF3F5', white:'#FFFFFF', green:'#087E74'};
const FONT = 'Arial';
const p = Presentation.create({ slideSize: {width:1280,height:720} });
const sources = {
  install:'https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/',
  config:'https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/',
  intro:'https://docs.newrelic.com/docs/apm/agents/nodejs-agent/getting-started/introduction-new-relic-nodejs/',
  browser:'https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/',
  csp:'https://docs.newrelic.com/docs/browser/new-relic-browser/getting-started/compatibility-requirements-browser-monitoring/',
  nrql:'https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/',
  alerts:'https://docs.newrelic.com/docs/alerts/create-alert/create-alert-condition/create-nrql-alert-conditions/',
  ping:'https://docs.newrelic.com/docs/synthetics/synthetic-monitoring/using-monitors/add-edit-monitors/',
  pricing:'https://newrelic.com/pricing',
};
function text(s, content, x,y,w,h,size=28,color=C.ink,bold=false,font=FONT){
  const a=s.shapes.add({geometry:'textbox',name:content.slice(0,65),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  a.text=content;
  a.text.style={typeface:font,fontSize:size,color,bold,wrap:'square',autoFit:'none',insets:0,verticalAlignment:'top'};
  return a;
}
function slide(title, dark=false){
  const s=p.slides.add();s.background.fill=dark?C.navy:C.white;
  text(s,title,72,55,1136,115,48,dark?C.white:C.navy,true);
  text(s,'Stock-Quest',72,677,450,22,16,dark?'#B2C1CF':C.muted);
  text(s,String(p.slides.items.length).padStart(2,'0'),1170,677,40,22,16,dark?'#B2C1CF':C.muted);
  return s;
}
function note(s,body,refs=[]){s.speakerNotes.text=body+'\n\nFuentes consultadas el 19 de octubre de 2026:\n'+refs.join('\n');}
function row(s,n,title,body,y,dark=false){
  text(s,n,72,y,70,50,38,C.orange,true);
  text(s,title,166,y,1020,45,30,dark?C.white:C.navy,true);
  text(s,body,166,y+48,1010,68,26,dark?'#D9E3EA':C.muted);
}
function table(s,vals,widths,y=190,height=360,size=25){
  const t=s.tables.add({rows:vals.length,columns:vals[0].length,left:72,top:y,width:1136,height,columnWidths:widths,values:vals});
  t.styleOptions={headerRow:true,bandedRows:false};
  t.borders.assign({fill:'#D7E0E6',width:0.6,style:'solid'});
  t.cells.block({row:0,column:0,rowCount:vals.length,columnCount:vals[0].length}).assign({textStyle:{typeface:FONT,fontSize:size,color:C.ink},margins:{top:15,bottom:12,left:18,right:18},anchor:'center'});
  for(let r=0;r<vals.length;r++){
    t.rows[r].height=r===0?62:(height-62)/(vals.length-1);
    for(let c=0;c<vals[0].length;c++){
      const cell=t.getCell(r,c);cell.fill=r===0?C.navy:(r%2===0?C.pale:C.white);
      cell.text.style={typeface:FONT,fontSize:r===0?24:size,color:r===0?C.white:C.ink,bold:r===0};
    }
  }
  return t;
}

// 01: portada con el activo original del proyecto.
{
  const s=p.slides.add();s.background.fill=C.white;
  text(s,'New Relic en\nStock-Quest',72,138,710,184,68,C.navy,true);
  text(s,'Plan de implementación\npara una aplicación de baja escala',76,361,690,110,32,C.muted);
  text(s,'Fase de monitoreo del ciclo de vida del software',76,541,740,65,24,C.ink);
  text(s,'Integración pendiente de ejecutar y validar',76,624,850,40,23,C.green,true);
  const data=await fs.readFile(path.join(ROOT,'frontend/public/stock-quest-logo.png'));
  s.images.add({blob:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),contentType:'image/png',alt:'Logo original de Stock Quest',fit:'contain',position:{left:825,top:190,width:370,height:275}});
  note(s,'Esta presentación describe cómo se va a implementar New Relic. El propietario confirmó que aún no existe monitoreo con esta herramienta y pidió una solución de baja escala. El objetivo inicial es observar la API existente con una configuración pequeña y verificable. Los pasos, las alertas y las consultas son propuestas. No se presentan capturas de una cuenta ni mejoras de rendimiento ya medidas. La presentación de ciclo de vida aportada ubica New Relic en la etapa 8, Monitoreo.',[path.join(ROOT,'README.md'),'C:/Users/LENOVO/Downloads/HERRAMIENTAS CICLO DE VIDA DEL SW (3).pptx, diapositiva 10']);
}
// 02: evidencia de partida.
{
  const s=slide('Punto de partida');
  table(s,[['Componente','Estado verificado','Qué falta'],['Frontend','React y Vite','Agente Browser opcional'],['API','Express, Node.js y Prisma','Instalar el agente APM'],['Base de datos','PostgreSQL','Observar consultas desde la API'],['Monitoreo','Sin integración New Relic','Conectar la cuenta y validar datos']],[260,410,466],185,390,25);
  text(s,'El servicio Java de simulación continúa separado en desarrollo.',72,603,1136,48,25,C.muted);
  note(s,'La revisión de esta copia encontró React y Vite en el frontend, Express y Prisma en el backend y PostgreSQL como persistencia. No se encontró la dependencia newrelic, un agente Browser ni configuración NEW_RELIC en los archivos versionados revisados. El script actual de inicio es node dist/server.js. El servicio Java de simulación existe en desarrollo, pero aún no sustituye el tráfico de Express. Por eso la primera integración se concentrará en la API Node.js.',[path.join(ROOT,'backend/package.json'),path.join(ROOT,'frontend/package.json'),path.join(ROOT,'backend/src/server.ts'),path.join(ROOT,'services/simulacion-logistica/README.md')]);
}
// 03: alcance pequeño y explícito.
{
  const s=slide('Alcance inicial del monitoreo',true);
  text(s,'1 API',72,188,510,88,74,C.orange,true);
  text(s,'Instrumentar el backend Express\ncon New Relic APM.',72,294,500,116,32,C.white);
  text(s,'1 panel',704,188,500,88,74,C.orange,true);
  text(s,'Reunir tiempos de respuesta,\nerrores y volumen de solicitudes.',704,294,500,116,32,C.white);
  text(s,'Dos alertas iniciales y un responsable para atenderlas.',72,493,1136,55,30,C.white,true);
  text(s,'Browser y disponibilidad sintética se añadirán si hacen falta.',72,569,1136,65,26,'#D9E3EA');
  note(s,'El alcance propuesto mantiene pequeño el esfuerzo de configuración y de operación. APM significa monitoreo del rendimiento de la aplicación. Se instalará un agente en el proceso Node.js y se usará un solo panel para revisar la experiencia que ofrece la API. Se comenzará con dos alertas: lentitud y errores. Un integrante del equipo revisará cada aviso. Browser será una segunda etapa para estudiar problemas del navegador. El servicio Java requerirá su propia integración cuando participe en el flujo real.',[sources.intro,path.join(ROOT,'services/simulacion-logistica/README.md')]);
}
// 04: comando aplicable al workspace existente.
{
  const s=slide('Instalación del agente en la API');
  text(s,'Instalar desde la raíz del repositorio',72,181,1136,44,30,C.navy,true);
  text(s,'npm install newrelic -w @stock-quest/api',72,241,1136,62,30,C.green,true,'Consolas');
  text(s,'Actualizar el script start de backend/package.json',72,338,1136,46,30,C.navy,true);
  text(s,'"start": "node -r newrelic dist/server.js"',72,402,1136,66,30,C.green,true,'Consolas');
  text(s,'El agente debe cargarse antes que Express para instrumentar las solicitudes.',72,527,1136,93,30,C.muted);
  note(s,'Estos comandos son una propuesta y todavía no se han ejecutado. La instalación añade newrelic como dependencia del workspace de la API y actualiza el archivo de bloqueo. El backend compila TypeScript a CommonJS, por lo que corresponde precargar el agente con -r newrelic. Se modificará el script start existente y se conservará la entrada dist/server.js. No se cambiarán las rutas ni la lógica de aprendizaje. Se usará una versión del agente compatible con Node.js y se fijará con el archivo package-lock.json.',[sources.install,path.join(ROOT,'backend/tsconfig.json'),path.join(ROOT,'backend/package.json')]);
}
// 05: configuración server-side; sin exponer secretos.
{
  const s=slide('Configuración del entorno');
  text(s,'Variables propuestas para el servicio backend',72,173,1136,44,30,C.navy,true);
  const lines=['NEW_RELIC_APP_NAME=StockQuest-API','NEW_RELIC_LICENSE_KEY=<secreto del servidor>','NEW_RELIC_NO_CONFIG_FILE=true','NEW_RELIC_LOG=stdout','NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED=false'];
  lines.forEach((v,i)=>text(s,v,72,240+i*49,1140,45,27,i===1?C.orange:C.green,false,'Consolas'));
  text(s,'La clave APM se guarda en el proveedor del backend.\nSe desactiva el envío automático de logs durante la primera etapa.',72,526,1136,100,28,C.muted);
  note(s,'La configuración se realizará mediante variables del servicio, disponibles antes de iniciar Node.js. NEW_RELIC_NO_CONFIG_FILE permite trabajar sin un archivo de configuración local. NEW_RELIC_APP_NAME identifica la API en la cuenta. La licencia APM se obtiene de la cuenta de New Relic y se conserva como secreto del backend, nunca en variables VITE_ ni en Git. NEW_RELIC_LOG=stdout dirige el registro propio del agente a la salida estándar. La variable APPLICATION_LOGGING_FORWARDING_ENABLED desactiva el reenvío automático de los logs de la aplicación para reducir el volumen inicial. Se revisará que los atributos y registros no incluyan contraseñas, tokens ni datos personales.',[sources.config,path.join(ROOT,'render.yaml')]);
}
// 06: despliegue sin afirmar ejecución.
{
  const s=slide('Activación en el entorno de prueba');
  row(s,'01','Preparar la cuenta','Crear la aplicación APM y obtener la clave de ingesta.',176);
  row(s,'02','Publicar la API como servicio Node.js','Usar el proceso persistente previsto en Render y configurar sus variables.',318);
  row(s,'03','Iniciar y generar tráfico','Ejecutar los flujos habituales y confirmar la entidad StockQuest-API.',460);
  note(s,'La primera validación se hará en un entorno de prueba. El repositorio incluye configuración para un servicio Node.js en Render y documentación de un frontend en Vercel. Se aprovechará el inicio del workspace de la API, que precargará el agente tras el cambio del script. La base de datos por sí sola no publica la API. Después de iniciar el proceso se generarán solicitudes y se esperará la recepción de telemetría. El ejemplo corresponde al servicio Node.js persistente. Si se usa la función serverless de Vercel como backend, se revisará primero el procedimiento apropiado para ese entorno.',[sources.install,path.join(ROOT,'render.yaml'),path.join(ROOT,'docs/DESPLIEGUE.md'),path.join(ROOT,'vercel.json')]);
}
// 07: panel de métricas realista.
{
  const s=slide('Un panel para las funciones principales');
  table(s,[['Indicador','Qué muestra','Aplicación en Stock-Quest'],['Latencia p95','Percentil 95 de duración','Login, módulos y simulaciones'],['Errores de API','Porcentaje de errores','Fallas al consultar o guardar'],['Solicitudes/min','Volumen de actividad','Picos y períodos de poco uso'],['Tiempo en BD','Consultas desde la API','Operaciones lentas']],[265,400,471],181,410,25);
  text(s,'El panel comenzará sin valores hasta recibir tráfico real.',72,613,1136,38,24,C.green,true);
  note(s,'Se creará un panel con cuatro indicadores y filtros por nombre de transacción. Las rutas de interés incluyen /api/auth/login, /api/modules, /api/simulations y /api/progress. El p95 ayuda a observar el extremo lento de la distribución. La métrica de errores depende de la clasificación del agente; no todos los rechazos de autenticación implican una falla del servicio. Las consultas PostgreSQL se observarán en la medida en que el driver y la instrumentación produzcan los segmentos correspondientes. Esto no sustituye métricas internas del servidor PostgreSQL. No se incluyen valores ni gráficos inventados.',[sources.intro,sources.nrql,path.join(ROOT,'backend/src/routes/index.ts')]);
}
// 08: consulta lista para usar, sin resultados ficticios.
{
  const s=slide('Consulta del tiempo de respuesta',true);
  text(s,'Ejemplo NRQL para el panel de la API',72,181,1136,44,30,C.white,true);
  const q=["FROM Transaction","SELECT percentile(duration, 95)","WHERE appName = 'StockQuest-API'","SINCE 30 minutes ago","TIMESERIES"];
  q.forEach((v,i)=>text(s,v,72,252+i*49,1136,45,32,i===1?'#F2A443':'#D9E3EA',false,'Consolas'));
  text(s,'Muestra la evolución de la latencia p95 en segundos.\nLa consulta solo devolverá resultados cuando existan datos.',72,553,1136,87,28,C.white);
  note(s,'NRQL es el lenguaje de consultas de New Relic. Este ejemplo consulta eventos Transaction, filtra por el nombre propuesto de la aplicación y calcula el percentil 95 de duration. El atributo duration se expresa en segundos. SINCE delimita la ventana de análisis del panel y TIMESERIES produce una serie temporal. La consulta se pegará en el explorador de consultas o en un widget del dashboard después de que la API reporte datos. Para una condición de alerta se usará la misma agregación sin SINCE ni TIMESERIES, porque el motor de alertas define su propia ventana. El fragmento es un ejemplo de configuración, no una medición.',[sources.nrql,sources.alerts]);
}
// 09: reglas propuestas ajustadas a poco tráfico.
{
  const s=slide('Alertas iniciales para baja escala');
  table(s,[['Señal','Umbral de partida','Respuesta del equipo'],['Lentitud','p95 superior a 2 segundos\ndurante 5 minutos','Revisar la transacción lenta\ny el acceso a PostgreSQL'],['Errores','Más de 5 % de errores\ndurante 5 minutos','Revisar la falla y el\núltimo cambio publicado']],[240,450,446],188,300,26);
  text(s,'Umbrales propuestos: se ajustarán con la línea base real.',72,527,1136,44,28,C.green,true);
  text(s,'Con pocas solicitudes, revisar también el conteo de errores.\nUn período sin tráfico no demuestra una caída de la aplicación.',72,588,1136,67,25,C.muted);
  note(s,'Los umbrales son una decisión inicial del proyecto, no valores recomendados universalmente ni resultados medidos. Se propone una ventana de cinco minutos para evitar avisos por fluctuaciones muy breves. En una aplicación con poco tráfico, una sola solicitud puede representar un porcentaje alto, de modo que se ajustará la condición de errores tras observar el volumen real. El canal de aviso deberá quedar asociado a un responsable y se probará su funcionamiento. Las alertas APM dependen de que exista tráfico. Para conocer disponibilidad en períodos inactivos se puede añadir un monitor sintético de URL, sujeto a la cuenta y al comportamiento del hosting.',[sources.alerts,sources.ping]);
}
// 10: extensiones opcionales y CSP.
{
  const s=slide('Ampliaciones según la necesidad');
  text(s,'Experiencia del navegador',72,184,530,46,32,C.navy,true);
  text(s,'Añadir New Relic Browser a React\npara observar carga y errores\nde JavaScript.',72,253,515,148,30,C.ink);
  text(s,'Revisar la política CSP y usar\nla configuración Browser de la cuenta.',72,449,515,115,27,C.muted);
  text(s,'Disponibilidad de la API',708,184,500,46,32,C.navy,true);
  text(s,'Añadir un monitor de URL\nsobre /api/health si se requiere\ndetección durante la inactividad.',708,253,500,148,30,C.ink);
  text(s,'Este endpoint confirma que el proceso\nresponde. No comprueba PostgreSQL.',708,449,500,115,27,C.muted);
  note(s,'Estas ampliaciones son opcionales. Para Browser se generará la configuración propia de la aplicación web y se cargará al inicio del frontend. La clave APM del servidor nunca debe copiarse al cliente. Las políticas CSP en Express y Vercel requieren revisión: los dominios de scripts y recolección dependen del método de instalación y de la región de la cuenta. Se permitirán únicamente los orígenes necesarios. Para disponibilidad, un monitor de URL puede comprobar /api/health, pero esta ruta devuelve status ok sin consultar la base de datos. En un hosting con suspensión por inactividad se revisará cómo los sondeos afectan el arranque y el consumo.',[sources.browser,sources.csp,sources.ping,path.join(ROOT,'backend/src/app.ts'),path.join(ROOT,'vercel.json')]);
}
// 11: aceptación y evidencias.
{
  const s=slide('Validación de la implementación');
  row(s,'01','Confirmar la recepción','La entidad StockQuest-API aparece y registra solicitudes reales.',174);
  row(s,'02','Ejecutar los flujos principales','Iniciar sesión, cargar módulos y completar una simulación de prueba.',311);
  row(s,'03','Comprobar errores y avisos','Provocar un fallo controlado en pruebas y confirmar la notificación.',448);
  text(s,'Evidencias: cambio en código, panel con fecha y prueba de alerta.',72,609,1136,44,26,C.green,true);
  note(s,'La integración se aceptará cuando exista recepción de datos y las señales permitan investigar un problema real. Se usará un usuario de prueba y un entorno preparado para evitar alterar información de usuarios. El fallo controlado debe retirarse después de comprobarlo; no se añadirá un endpoint de errores abierto a producción. Las evidencias serán el diff o commit de configuración, una captura del panel con intervalo temporal identificable y un registro de la alerta y de su notificación. Se comprobará que el login y las simulaciones siguen funcionando. No se ha ejecutado ninguno de estos pasos en esta entrega.',[sources.install,sources.alerts,path.join(ROOT,'backend/src/routes/index.ts')]);
}
// 12: operación y consumo, cierre sin resultados inventados.
{
  const s=slide('Operación sencilla y consumo controlado',true);
  row(s,'01','Comenzar con lo esencial','Una API, un panel y dos alertas. Mantener desactivado el envío de logs.',176,true);
  row(s,'02','Revisar señales y consumo','Ajustar umbrales y comprobar la ingesta y los límites de la cuenta.',314,true);
  row(s,'03','Ampliar cuando exista una necesidad','Activar Browser o disponibilidad después de validar la primera etapa.',452,true);
  text(s,'Resultado esperado: detectar fallas antes y orientar su diagnóstico.',72,614,1136,42,26,'#F2A443',true);
  note(s,'La escala pequeña permite comenzar con una configuración breve y revisarla periódicamente. Se consultarán las condiciones y límites vigentes de la cuenta antes de activar funciones; esta presentación no garantiza un costo de cero. La API enviará inicialmente sus métricas y datos APM, y el reenvío automático de logs permanecerá apagado. El responsable revisará la ingesta, el ruido de alertas y la utilidad del panel. Se espera detectar problemas con mayor rapidez, pero la mejora solo podrá afirmarse después de medirla. El siguiente paso es implementar el cambio y completar la validación; todavía no hay telemetría ni resultados New Relic verificados.',[sources.config,sources.pricing,sources.alerts]);
}

await fs.mkdir(path.join(BUILD,'previews'),{recursive:true});
await fs.writeFile(path.join(BUILD,'slide-notes.json'),JSON.stringify(p.slides.items.map((s,i)=>({slide:i+1,notes:s.speakerNotes.text})),null,2));
const candidate=path.join(BUILD,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
console.log('Candidate saved: '+candidate);
for(let i=0;i<p.slides.items.length;i++){
  const s=p.slides.items[i];
  const blob=await p.export({slide:s,format:'png',scale:1});
  await fs.writeFile(path.join(BUILD,'previews',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
  console.log('Rendered '+(i+1));
}
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:OUTPUT,pythonExecutable:PYTHON,integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','2','--require-native-table-slide','7','--require-native-table-slide','9'],requiredNativeTableOwnerSlides:[2,7,9],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Arial','Consolas']},verifyArtifactToolImport:true,receiptPath:path.join(BUILD,'validation.json')});
console.log(JSON.stringify(result));
