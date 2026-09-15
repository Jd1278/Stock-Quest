# API REST

Base: `/api`. Cuerpo y respuestas en JSON. Fechas en ISO 8601. IDs de registros generados por Prisma (string). No hay parámetros query ni paginación pública en este MVP. Historiales se limitan a los últimos 100 registros.

Todas las rutas salvo health, register y login requieren `Authorization: Bearer <token>`. A = APRENDIZ; L = LIDER; G = GESTOR_PEDAGOGICO; Todos = cualquier usuario activo. Cada parámetro `:id` es un string no vacío de hasta 100 caracteres. Recursos privados se limitan al usuario o líder autenticado.

## Autenticación y usuarios

| Método y ruta       | Body                       | Respuesta / éxito                                          | Rol     |
| ------------------- | -------------------------- | ---------------------------------------------------------- | ------- |
| GET /health         | —                          | 200 `{status:"ok"}`; vivacidad del proceso, no sonda de DB | Público |
| POST /auth/register | Registration               | 201 UserDTO                                                | Público |
| POST /auth/login    | `{email,password}`         | 200 `{token,user:UserDTO}`                                 | Público |
| POST /auth/logout   | —                          | 204; revoca todas las sesiones                             | Todos   |
| GET /auth/me        | —                          | 200 UserDTO                                                | Todos   |
| PATCH /users/me     | ProfileUpdate              | 200 UserDTO                                                | Todos   |
| POST /users         | Registration               | 201 UserDTO; aprendiz del líder                            | L       |
| PATCH /users/:id    | `{name?,company?,active?}` | 200 UserDTO propio                                         | L       |

`Registration`: `{name:string(1..100),document:string(1..30),email:email,company:string(1..100),password:string(10..72 bytes)}`. No admite rol ni campos extra. Correo normalizado a minúsculas. Documento y correo únicos.

`UserDTO`: `{id,name,email,document,company,phone,role,active,createdAt}`. Nunca incluye hash ni versión de sesión.

`ProfileUpdate`: `{name?,email?,phone?,password?,currentPassword?}`. Requiere contraseña actual si cambia correo o contraseña. El cliente debe iniciar sesión nuevamente después de un cambio sensible.

## Aprendizaje

| Método y ruta                 | Body                     | Respuesta / éxito                                   | Rol   |
| ----------------------------- | ------------------------ | --------------------------------------------------- | ----- |
| GET /modules                  | —                        | 200 ModuleDTO[] con lecciones, completed y unlocked | Todos |
| GET /lessons/:id              | —                        | 200 LessonDTO; valida desbloqueo                    | Todos |
| POST /lessons/:id/complete    | —                        | 200 `{message}`; idempotente                        | A     |
| POST /challenges/:id/attempts | `{answer:integer(0..5)}` | 201 `{id,score,passed,feedback,attempt}`            | A     |
| GET /progress                 | —                        | 200 ProgressDTO                                     | Todos |

`ModuleDTO`: `{id,title,description,position,published,lessons:LessonDTO[]}`.

`LessonDTO`: `{id,moduleId,title,body,position,minutes,contents:[{id,lessonId,title,youtubeId}],challenges:[{id,question,options:string[]}],completed,unlocked}`. Los bloqueados no incluyen contenido consumible (body vacío, arrays vacíos). `correctIndex` y `explanation` no se incluyen en consultas del aprendiz; la explicación se devuelve tras contestar.

`ProgressDTO`: `{completed,total,percent,xp,level,simulations,passed,topics:[{id,title,completed,total,score:number|null,needsReview}],achievements:[{userId,key,earnedAt}],recommendations:string[]}`.

## Simulaciones

| Método y ruta                   | Body                                                 | Respuesta / éxito                                              | Rol   |
| ------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- | ----- |
| GET /simulations/scenarios      | —                                                    | 200 resúmenes `{id,title,description,initialStock,leadTime}[]` | Todos |
| GET /simulations                | —                                                    | 200 historial propio con escenario y resultado                 | Todos |
| POST /simulations               | `{scenarioId:string}`                                | 201 RunDTO                                                     | A     |
| GET /simulations/:id            | —                                                    | 200 RunDTO propio                                              | Todos |
| POST /simulations/:id/decisions | `{day:integer(0..29),quantity:integer(0..maxOrder)}` | 200 RunDTO actualizado                                         | A     |

`RunDTO`: `{id,title,description,day,days,initialStock,leadTime,unitCost,salePrice,holdingCost,shortageCost,orderCost,maxOrder,demandRange:[min,max],stock,profit,serviceRate,score,feedback,sold,lost,timeline:DayDTO[],pending:[{quantity,arrivalDay}],finished,result}`. `day` es el número de días ya procesados y funciona como versión optimista. Dos peticiones del mismo día no generan dos movimientos.

`DayDTO`: `{day,demand,received,ordered,sold,lost,stock,revenue,cost,profit}`. `day` es uno-basado para la presentación. `profit` es acumulado.

## Líder y grupos

| Método y ruta                      | Body                    | Respuesta / éxito                                           | Rol |
| ---------------------------------- | ----------------------- | ----------------------------------------------------------- | --- |
| GET /reports                       | —                       | 200 `{...UserDTO,progress:ProgressDTO}[]` del equipo propio | L   |
| GET /reports/:id                   | —                       | 200 `{...UserDTO,progress,activities}`                      | L   |
| GET /groups                        | —                       | 200 grupos propios con miembros y UserDTO                   | L   |
| POST /groups                       | `{name:string(1..100)}` | 201 grupo                                                   | L   |
| PATCH /groups/:id                  | `{name:string(1..100)}` | 200 grupo                                                   | L   |
| DELETE /groups/:id                 | —                       | 204; conserva cuentas y progreso                            | L   |
| POST /groups/:id/members           | `{userId:string}`       | 200 membresía; idempotente                                  | L   |
| DELETE /groups/:id/members/:userId | —                       | 204                                                         | L   |

Solo se asignan aprendices activos del líder. Los usuarios autónomos no se vinculan por conocer su correo; para este MVP el líder registra a sus colaboradores.

## Gestor pedagógico

| Método y ruta             | Body           | Respuesta / éxito                                    | Rol |
| ------------------------- | -------------- | ---------------------------------------------------- | --- |
| GET /admin                | —              | 200 `{modules,scenarios}` con respuestas de desafíos | G   |
| POST /admin/modules       | ModuleInput    | 201 módulo                                           | G   |
| PUT /admin/modules/:id    | ModuleInput    | 200 módulo                                           | G   |
| POST /admin/lessons       | LessonInput    | 201 lección                                          | G   |
| PUT /admin/lessons/:id    | LessonInput    | 200 lección                                          | G   |
| POST /admin/challenges    | ChallengeInput | 201 desafío                                          | G   |
| PUT /admin/challenges/:id | ChallengeInput | 200 desafío                                          | G   |
| POST /admin/scenarios     | ScenarioInput  | 201 escenario                                        | G   |
| PUT /admin/scenarios/:id  | ScenarioInput  | 200 escenario                                        | G   |

- `ModuleInput`: `{title,description,position:integer(1..1000),published:boolean}`. Posición única global.
- `LessonInput`: `{moduleId,title,body:string(1..20000),position:integer(1..1000),minutes:integer(1..120),youtubeId?:string(11)}`. Posición única por módulo. Omitir youtubeId retira la referencia de video en una edición completa.
- `ChallengeInput`: `{lessonId,question,options:string[2..6],correctIndex:integer,explanation}`. Índice dentro de las opciones, base cero.
- `ScenarioInput`: `{title,description,initialStock:integer(0..10000),demand:integer[3..30],leadTime:integer(1..10),unitCost:number,salePrice:number,holdingCost:number,shortageCost:number,orderCost:number,maxOrder:integer(1..10000),published:boolean}`. Demanda diaria 0..10000, al menos un día positivo. Costos 0..100000; venta positiva y no menor al costo unitario. PUT exige cuerpo completo. Cada partida conserva el snapshot original.

## Errores

`{message:string,issues?:[{field,message}]}`. Los esquemas rechazan claves inesperadas.

| HTTP | Significado                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------- |
| 400  | Entrada inválida, respuesta fuera de rango, requisito de aprendizaje pendiente o JSON inválido |
| 401  | Credenciales, token, expiración, usuario inactivo o sesión revocada                            |
| 403  | Rol insuficiente o contenido bloqueado                                                         |
| 404  | Recurso inexistente/no propio/no publicado                                                     |
| 409  | Duplicado, posición ocupada, dependencia referencial o día ya procesado                        |
| 413  | Body mayor de 256 KB                                                                           |
| 429  | Límite de solicitudes; login/registro 30 por 15 minutos por IP, general 180 por minuto         |
| 500  | Fallo interno sin stack ni datos sensibles en la respuesta                                     |
