import { useState } from "react";
import { adminService } from "../services";
import { useResource, useAction } from "../hooks/useResource";
import { PageTitle, Field, Loading, Notice, Empty } from "../components/ui";
type Kind = "modules" | "lessons" | "challenges" | "scenarios";
function prepare(kind: Kind, form: FormData) {
  const data: Record<string, any> = Object.fromEntries(form);
  for (const key of [
    "position",
    "minutes",
    "correctIndex",
    "initialStock",
    "leadTime",
    "unitCost",
    "salePrice",
    "holdingCost",
    "shortageCost",
    "orderCost",
    "maxOrder",
  ])
    if (key in data) data[key] = Number(data[key]);
  if (kind === "modules" || kind === "scenarios")
    data.published = form.get("published") === "on";
  if (kind === "scenarios")
    data.demand = String(data.demand)
      .split(",")
      .map((n) => Number(n.trim()));
  if (kind === "challenges")
    data.options = String(data.options)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  if (data.youtubeId === "") delete data.youtubeId;
  return data;
}
export default function ContentPage({
  scenarios = false,
}: {
  scenarios?: boolean;
}) {
  const resource = useResource(adminService.content),
    action = useAction(),
    [kind, setKind] = useState<Kind>(scenarios ? "scenarios" : "modules"),
    [selected, setSelected] = useState<any>(null),
    [newKey, setNewKey] = useState(0);
  const modules = resource.data?.modules ?? [],
    lessons = modules.flatMap((m) => m.lessons),
    records =
      kind === "modules"
        ? modules
        : kind === "lessons"
          ? lessons
          : kind === "challenges"
            ? lessons.flatMap((l) =>
                l.challenges.map((c) => ({ ...c, lessonId: l.id })),
              )
            : (resource.data?.scenarios ?? []);
  const labels = {
    modules: "Módulos",
    lessons: "Lecciones",
    challenges: "Desafíos",
    scenarios: "Escenarios",
  };
  return (
    <>
      <PageTitle
        eyebrow="GESTIÓN PEDAGÓGICA"
        title={
          scenarios
            ? "Diseña el próximo desafío."
            : "El conocimiento empieza aquí."
        }
      />
      <div className="tabs">
        {(scenarios ? ["scenarios"] : ["modules", "lessons", "challenges"]).map(
          (k) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => {
                setKind(k as Kind);
                setSelected(null);
              }}
            >
              {labels[k as Kind]}
            </button>
          ),
        )}
      </div>
      <Notice {...action} error={action.error || resource.error} />
      {resource.loading ? (
        <Loading />
      ) : (
        <div className="editor-grid">
          <aside className="editor-list">
            <button
              className="button"
              onClick={() => {
                setSelected(null);
                setNewKey((n) => n + 1);
              }}
            >
              + Crear{" "}
              {kind === "modules"
                ? "módulo"
                : kind === "lessons"
                  ? "lección"
                  : kind === "challenges"
                    ? "desafío"
                    : "escenario"}
            </button>
            {records.map((r: any) => (
              <button
                key={r.id}
                className={selected?.id === r.id ? "selected" : ""}
                onClick={() => setSelected(r)}
              >
                {r.title ?? r.question}
                <small>
                  {"published" in r
                    ? r.published
                      ? "Publicado"
                      : "Borrador"
                    : r.position
                      ? `Posición ${r.position}`
                      : "Desafío de lección"}
                </small>
              </button>
            ))}
            {!records.length && <Empty>Sin registros.</Empty>}
          </aside>
          <form
            className="card"
            key={`${kind}-${selected?.id ?? newKey}`}
            onSubmit={(e) => {
              e.preventDefault();
              const data = prepare(kind, new FormData(e.currentTarget));
              void action.run(async () => {
                await adminService.save(kind, data, selected?.id);
                setSelected(null);
                setNewKey((n) => n + 1);
                resource.reload();
              });
            }}
          >
            <h2>
              {selected ? "Editar" : "Crear"} · {labels[kind]}
            </h2>
            {kind === "lessons" && (
              <Field label="Módulo">
                <select
                  name="moduleId"
                  required
                  defaultValue={selected?.moduleId ?? ""}
                >
                  <option value="" disabled>
                    Seleccionar módulo
                  </option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {kind === "challenges" ? (
              <>
                <Field label="Lección">
                  <select
                    name="lessonId"
                    required
                    defaultValue={selected?.lessonId ?? ""}
                  >
                    <option value="" disabled>
                      Seleccionar lección
                    </option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pregunta o caso práctico">
                  <textarea
                    name="question"
                    required
                    defaultValue={selected?.question}
                    maxLength={3000}
                  />
                </Field>
                <Field label="Opciones (una por línea, entre 2 y 6)">
                  <textarea
                    name="options"
                    required
                    defaultValue={selected?.options?.join("\n")}
                  />
                </Field>
                <Field label="Índice de respuesta correcta (0 = primera opción)">
                  <input
                    name="correctIndex"
                    type="number"
                    min={0}
                    max={5}
                    required
                    defaultValue={selected?.correctIndex ?? 0}
                  />
                </Field>
                <Field label="Explicación pedagógica">
                  <textarea
                    name="explanation"
                    required
                    defaultValue={selected?.explanation}
                    maxLength={3000}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Título">
                  <input
                    name="title"
                    required
                    maxLength={150}
                    defaultValue={selected?.title}
                  />
                </Field>
                {kind === "lessons" ? (
                  <>
                    <Field label="Microlección (separa párrafos con una línea vacía)">
                      <textarea
                        name="body"
                        required
                        defaultValue={selected?.body}
                        maxLength={20000}
                        rows={10}
                      />
                    </Field>
                    <Field label="ID de YouTube (opcional, 11 caracteres)">
                      <input
                        name="youtubeId"
                        pattern="[A-Za-z0-9_-]{11}"
                        defaultValue={selected?.contents?.[0]?.youtubeId ?? ""}
                      />
                    </Field>
                    <label className="field">
                      <span>Importar texto de una microlección (.txt)</span>
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        onChange={(e) => {
                          const file = e.target.files?.[0],
                            form = e.currentTarget.form;
                          if (!file || !form) return;
                          void action.run(async () => {
                            if (file.size > 80000)
                              throw new Error(
                                "El archivo debe pesar menos de 80 KB.",
                              );
                            const text = await file.text();
                            if (text.length > 20000)
                              throw new Error(
                                "El texto supera 20.000 caracteres.",
                              );
                            (
                              form.elements.namedItem(
                                "body",
                              ) as HTMLTextAreaElement
                            ).value = text;
                          }, "Texto importado. Revisa y guarda la lección.");
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <Field label="Descripción">
                    <textarea
                      name="description"
                      required
                      defaultValue={selected?.description}
                      maxLength={3000}
                    />
                  </Field>
                )}
                {kind !== "scenarios" && (
                  <div className="form-grid">
                    <Field label="Posición en la ruta">
                      <input
                        name="position"
                        type="number"
                        min={1}
                        max={1000}
                        required
                        defaultValue={selected?.position ?? records.length + 1}
                      />
                    </Field>
                    {kind === "lessons" && (
                      <Field label="Duración (minutos)">
                        <input
                          name="minutes"
                          type="number"
                          min={1}
                          max={120}
                          required
                          defaultValue={selected?.minutes ?? 5}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </>
            )}
            {kind === "scenarios" && (
              <>
                <Field label="Demanda por día (separada por comas, entre 3 y 30 días)">
                  <input
                    name="demand"
                    required
                    defaultValue={
                      selected?.demand?.join(", ") ??
                      "18, 24, 16, 30, 22, 28, 20"
                    }
                  />
                </Field>
                <div className="form-grid">
                  {[
                    ["initialStock", "Inventario inicial", 60, 0, 10000],
                    ["leadTime", "Entrega (días)", 2, 1, 10],
                    ["unitCost", "Costo unitario (COP)", 1000, 0, 100000],
                    ["salePrice", "Precio de venta (COP)", 1800, 1, 100000],
                    [
                      "holdingCost",
                      "Almacenamiento por unidad / día",
                      30,
                      0,
                      100000,
                    ],
                    [
                      "shortageCost",
                      "Penalización por faltante",
                      500,
                      0,
                      100000,
                    ],
                    ["orderCost", "Costo fijo del pedido", 3000, 0, 100000],
                    ["maxOrder", "Pedido máximo (unidades)", 200, 1, 10000],
                  ].map(([name, label, def, min, max]) => (
                    <Field key={name} label={String(label)}>
                      <input
                        name={String(name)}
                        type="number"
                        required
                        min={Number(min)}
                        max={Number(max)}
                        step={
                          ["initialStock", "leadTime", "maxOrder"].includes(
                            String(name),
                          )
                            ? 1
                            : 0.01
                        }
                        defaultValue={selected?.[name] ?? def}
                      />
                    </Field>
                  ))}
                </div>
                <p>
                  Las partidas nuevas usarán estas variables. Las partidas
                  iniciadas conservan su configuración original.
                </p>
              </>
            )}
            {(kind === "modules" || kind === "scenarios") && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={selected?.published ?? false}
                />
                Publicado y visible para los aprendices
              </label>
            )}
            <button className="button" disabled={action.busy}>
              {action.busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
