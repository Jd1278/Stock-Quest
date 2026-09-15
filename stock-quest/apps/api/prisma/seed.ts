import "dotenv/config";
import client from "./client.cjs";
import bcrypt from "bcrypt";
const db = client.createClient();
const lessons = [
  {
    title: "Fundamentos de inventarios",
    description: "Entiende qué tienes, para qué sirve y cómo controlarlo.",
    lesson: "El inventario tiene una misión",
    body: "El inventario es el conjunto de materiales, productos en proceso y mercancías que una organización mantiene para operar y atender a sus clientes. Tener existencias permite responder a la demanda mientras llega el abastecimiento.\n\nCada unidad representa dinero inmovilizado. Un exceso genera costos de almacenamiento, deterioro y obsolescencia; una falta puede causar ventas perdidas y retrasos. El objetivo no es acumular, sino equilibrar disponibilidad y costo.\n\nEjemplo: si una bodega vende 20 unidades al día y el proveedor tarda 3 días, necesita cubrir 60 unidades de demanda durante ese plazo. A esta cantidad puede sumarse un stock de protección para cubrir variaciones.\n\nEn la práctica, registra entradas, salidas y ajustes. Compara periódicamente el saldo del sistema con el conteo físico e investiga diferencias antes de corregirlas.",
    question:
      "Una bodega vende 20 unidades al día y el proveedor tarda 3 días. Sin stock de protección, ¿qué demanda debe cubrir durante la entrega?",
    options: ["20 unidades", "60 unidades", "120 unidades"],
    correct: 1,
    explanation:
      "20 unidades/día × 3 días = 60 unidades. Este cálculo cubre la demanda esperada durante el plazo de entrega.",
  },
  {
    title: "Control de mercancías",
    description: "Recibe, registra y verifica cada movimiento.",
    lesson: "Una recepción bien hecha",
    body: "La recepción conecta el pedido con las existencias físicas. Compara la orden de compra, el documento del proveedor y la mercancía recibida antes de registrar la entrada.\n\nVerifica código, descripción, cantidad, lote, fecha de vencimiento y estado del empaque cuando corresponda. Las diferencias deben documentarse y comunicarse; los productos dañados deben segregarse hasta que se determine su destino.\n\nUn conteo cíclico revisa una parte del inventario de forma periódica. En una clasificación ABC, los artículos de mayor impacto económico suelen requerir controles más frecuentes.\n\nEjemplo: el documento indica 100 unidades, pero el conteo físico encuentra 96. Registra y reporta la diferencia según el procedimiento; no confirmes una recepción completa sin verificar.",
    question:
      "El proveedor declara 100 unidades y recibes 96. ¿Cuál es la mejor decisión?",
    options: [
      "Registrar 100 para coincidir con el documento",
      "Omitir la recepción completa",
      "Documentar y comunicar la diferencia antes de confirmar",
    ],
    correct: 2,
    explanation:
      "El registro debe reflejar lo recibido. Documentar la diferencia mantiene la trazabilidad y permite gestionar el reclamo.",
  },
  {
    title: "Almacenamiento",
    description: "Ubica la mercancía con orden, rotación y trazabilidad.",
    lesson: "Un lugar para cada producto",
    body: "La ubicación debe facilitar la identificación, el acceso y la conservación del producto. Define zonas de recepción, almacenamiento, preparación y despacho para reducir cruces y errores.\n\nFIFO significa primero en entrar, primero en salir. FEFO significa primero en vencer, primero en salir y resulta útil para productos con fecha de vencimiento. Son criterios de rotación, no sustituyen las condiciones de conservación del fabricante.\n\nMantén identificadas las ubicaciones y separa mercancía incompatible. Los productos de alta rotación suelen ubicarse en posiciones de acceso eficiente, respetando capacidades y condiciones de seguridad.\n\nEjemplo: dos lotes vencen en octubre y diciembre. Bajo FEFO, prepara primero el lote de octubre aunque el de diciembre haya llegado antes.",
    question: "Bajo FEFO, ¿qué lote debe salir primero?",
    options: [
      "El que vence primero",
      "El que llegó primero, siempre",
      "El de mayor cantidad",
    ],
    correct: 0,
    explanation:
      "FEFO prioriza la fecha de vencimiento más cercana para reducir pérdidas por caducidad.",
  },
  {
    title: "Gestión de abastecimiento",
    description: "Decide cuándo comprar y cuánto reponer.",
    lesson: "Pedir a tiempo cambia el resultado",
    body: "Abastecer consiste en asegurar materiales y productos en la cantidad y momento necesarios. Para decidir un pedido debes considerar demanda, inventario disponible, pedidos en tránsito y tiempo de entrega.\n\nLa posición de inventario suma lo disponible y lo pedido, y resta compromisos pendientes. Revisar solo lo que está en la estantería puede llevar a duplicar compras que ya vienen en camino.\n\nEl punto de pedido es un umbral para iniciar la reposición. En un caso sencillo: demanda esperada durante el plazo de entrega + stock de protección.\n\nEjemplo: demanda diaria de 15 unidades, entrega en 2 días y protección de 10. El punto de pedido es 40 unidades. El tamaño del pedido requiere una decisión adicional según costos, capacidad y demanda futura.",
    question:
      "Con 15 unidades/día, 2 días de entrega y 10 de protección, ¿cuál es el punto de pedido?",
    options: ["25 unidades", "30 unidades", "40 unidades"],
    correct: 2,
    explanation:
      "15 × 2 + 10 = 40 unidades. El punto de pedido indica cuándo reponer; no determina por sí solo cuánto comprar.",
  },
  {
    title: "Stock de protección",
    description: "Prepárate para variaciones sin acumular de más.",
    lesson: "Un colchón frente a la incertidumbre",
    body: "El stock de protección es una reserva para enfrentar variaciones de la demanda o del tiempo de entrega. No es inventario gratuito: mantenerlo cuesta dinero y espacio.\n\nUna mayor incertidumbre o un nivel de servicio objetivo más exigente pueden requerir más protección. El tamaño debe revisarse con datos de demanda, plazos y costos; no conviene asignar el mismo porcentaje a todos los productos.\n\nDistingue el consumo esperado durante la entrega de la reserva adicional. Si esperas consumir 50 unidades y decides mantener 12 de protección, el umbral sencillo de reposición sería 62.\n\nCuando una ruptura de stock se repite, revisa la causa: pronóstico, retrasos del proveedor, errores de registro o un punto de pedido insuficiente.",
    question: "¿Para qué se mantiene un stock de protección?",
    options: [
      "Para cubrir variaciones inesperadas de demanda o entrega",
      "Para eliminar cualquier necesidad de hacer pedidos",
      "Para reemplazar el control físico",
    ],
    correct: 0,
    explanation:
      "La reserva amortigua variaciones. No elimina la incertidumbre ni sustituye la planificación y el control.",
  },
  {
    title: "Costos de inventario",
    description: "Conecta tus decisiones con su impacto económico.",
    lesson: "El costo no termina en la compra",
    body: "Los costos relevantes pueden incluir adquisición, emisión de pedidos, almacenamiento y faltantes. Analizarlos juntos permite comparar decisiones que parecen similares.\n\nPedir grandes lotes reduce la frecuencia de pedidos, pero puede elevar el costo de mantener existencias. Pedir poco y con frecuencia puede aumentar el costo administrativo y de transporte por pedido.\n\nEn nuestro simulador, el beneficio acumulado es ingreso por ventas menos inversión inicial, compras, costos fijos de pedido, almacenamiento diario y penalización por demanda no atendida. El stock final no se liquida al cerrar el escenario.\n\nEjemplo: mantener 40 unidades durante un día a 30 pesos por unidad cuesta 1.200 pesos. Este costo se añade al de adquisición, no lo reemplaza.",
    question:
      "Mantienes 40 unidades un día a $30 por unidad. ¿Cuál es el costo de almacenamiento?",
    options: ["$70", "$1.200", "$12.000"],
    correct: 1,
    explanation: "40 unidades × $30 por unidad/día × 1 día = $1.200.",
  },
  {
    title: "Tiempos de entrega",
    description: "Planifica el tiempo entre el pedido y la recepción.",
    lesson: "La reposición no es instantánea",
    body: "El tiempo de entrega o lead time es el intervalo entre iniciar un pedido y disponer del producto para su uso o venta. Puede incluir preparación, transporte, recepción e inspección.\n\nMientras el pedido viaja, la demanda continúa. Anticipar la reposición evita que la bodega quede sin existencias antes de la recepción.\n\nEn el simulador, un pedido del día 1 con plazo de 2 días llega al inicio del día 3. Primero se recibe lo pendiente y después se atiende la demanda de ese día. Un pedido no resuelve faltantes anteriores.\n\nSi el proveedor cambia su plazo, revisa el punto de pedido. Con la misma demanda diaria, un plazo mayor requiere cubrir más consumo durante la espera.",
    question:
      "Pides en el día 1 con plazo de 2 días. Según las reglas del simulador, ¿cuándo llega?",
    options: [
      "Al inicio del día 2",
      "Al inicio del día 3",
      "Al final del día 1",
    ],
    correct: 1,
    explanation:
      "Día del pedido + plazo = 1 + 2 = día 3. La recepción ocurre antes de atender su demanda.",
  },
  {
    title: "Fundamentos de logística",
    description: "Coordina flujos desde el proveedor hasta el cliente.",
    lesson: "Cada operación es parte de una cadena",
    body: "La logística coordina el flujo y almacenamiento de productos y la información asociada. Sus actividades incluyen abastecimiento, transporte, recepción, almacenamiento, preparación de pedidos y distribución.\n\nOptimizar una tarea aislada puede perjudicar el resultado total. Comprar un lote muy grande para obtener un descuento puede saturar la bodega y retrasar la preparación de pedidos.\n\nEl nivel de servicio puede medirse de distintas formas. En Stock Quest se calcula como unidades atendidas divididas por unidades demandadas. La definición debe mantenerse constante para comparar resultados.\n\nEjemplo: de 200 unidades solicitadas se atendieron 180. El nivel de servicio por unidades es 90 %. Para interpretar ese indicador también conviene observar costos, plazos y causas de faltantes.",
    question:
      "Se atienden 180 de 200 unidades demandadas. ¿Cuál es el nivel de servicio por unidades?",
    options: ["80 %", "90 %", "100 %"],
    correct: 1,
    explanation:
      "180 / 200 × 100 = 90 %. El indicador muestra la proporción de demanda atendida.",
  },
  {
    title: "Seguridad y buenas prácticas",
    description: "Cuida a las personas y la operación de bodega.",
    lesson: "Una operación segura también es eficiente",
    body: "La seguridad forma parte de cada tarea. Mantén pasillos y salidas libres, identifica zonas de circulación y utiliza los elementos de protección definidos para la actividad.\n\nRespeta la capacidad señalada de estanterías y equipos. No improvises maniobras de elevación ni operes equipos para los que no estás capacitado. Reporta daños, derrames y condiciones inseguras.\n\nAlmacena productos según sus características y las instrucciones aplicables. La compatibilidad, la estabilidad de las cargas y la señalización son tan importantes como la velocidad de despacho.\n\nSi una carga bloquea una salida, prioriza el control del riesgo y comunica la situación. Una demora operativa no justifica mantener una condición peligrosa. Esta microlección no sustituye la capacitación específica de tu lugar de trabajo.",
    question:
      "Una carga está bloqueando una salida de emergencia. ¿Qué debes priorizar?",
    options: [
      "Terminar todos los despachos antes de informar",
      "Usar la carga como ubicación temporal habitual",
      "Reportar y gestionar el despeje seguro de la salida",
    ],
    correct: 2,
    explanation:
      "Mantener las salidas libres es esencial. Actúa según el procedimiento de seguridad y evita maniobras para las que no estés autorizado.",
  },
];
async function seed() {
  for (let i = 0; i < lessons.length; i++) {
    const item = lessons[i],
      moduleId = `module-${i + 1}`,
      lessonId = `lesson-${i + 1}`;
    await db.module.upsert({
      where: { id: moduleId },
      update: {},
      create: {
        id: moduleId,
        title: item.title,
        description: item.description,
        position: i + 1,
        published: true,
      },
    });
    await db.lesson.upsert({
      where: { id: lessonId },
      update: {},
      create: {
        id: lessonId,
        moduleId,
        title: item.lesson,
        body: item.body,
        position: 1,
        minutes: 5,
      },
    });
    await db.challenge.upsert({
      where: { id: `challenge-${i + 1}` },
      update: {},
      create: {
        id: `challenge-${i + 1}`,
        lessonId,
        question: item.question,
        options: item.options,
        correctIndex: item.correct,
        explanation: item.explanation,
      },
    });
  }
  await db.simulationScenario.upsert({
    where: { id: "scenario-first-shift" },
    update: {},
    create: {
      id: "scenario-first-shift",
      title: "Tu primer turno de bodega",
      description:
        "Siete días para encontrar el equilibrio entre atender la demanda y controlar los costos.",
      initialStock: 60,
      demand: [18, 24, 16, 30, 22, 28, 20],
      leadTime: 2,
      unitCost: 1000,
      salePrice: 1800,
      holdingCost: 30,
      shortageCost: 500,
      orderCost: 3000,
      maxOrder: 200,
      published: true,
    },
  });
  await db.simulationScenario.upsert({
    where: { id: "scenario-demand-peak" },
    update: {},
    create: {
      id: "scenario-demand-peak",
      title: "Demanda en temporada alta",
      description:
        "La demanda sube y el proveedor tarda más. Anticipa tus pedidos para evitar faltantes.",
      initialStock: 110,
      demand: [25, 35, 50, 45, 30, 55, 40, 25, 45, 30],
      leadTime: 3,
      unitCost: 1000,
      salePrice: 1900,
      holdingCost: 40,
      shortageCost: 800,
      orderCost: 3500,
      maxOrder: 250,
      published: true,
    },
  });
  for (const [prefix, role, name, document] of [
    ["ADMIN", "GESTOR_PEDAGOGICO", "Gestor pedagógico", "SQ-GESTOR"],
    ["LEADER", "LIDER", "Líder de capacitación", "SQ-LIDER"],
  ] as const) {
    const email = process.env[`SEED_${prefix}_EMAIL`],
      password = process.env[`SEED_${prefix}_PASSWORD`];
    if (!email || !password) continue;
    if (
      password.length < 10 ||
      Buffer.byteLength(password) > 72 ||
      password.startsWith("replace-")
    )
      throw new Error(`Configura SEED_${prefix}_PASSWORD con un valor seguro.`);
    await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        name,
        document,
        company: "Stock Quest",
      },
    });
  }
  console.log(
    "Contenido inicial creado; los registros existentes se conservaron.",
  );
}
seed()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

