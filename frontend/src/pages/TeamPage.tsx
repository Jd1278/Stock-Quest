import { useState } from "react";
import { progressService, userService } from "../services";
import { useResource, useAction } from "../hooks/useResource";
import {
  PageTitle,
  Field,
  Loading,
  Notice,
  Stat,
  ProgressBar,
  Empty,
} from "../components/ui";
import type { Employee } from "../types";
export default function TeamPage() {
  const resource = useResource(progressService.team),
    action = useAction(),
    [create, setCreate] = useState(false),
    [detail, setDetail] = useState<Employee | null>(null),
    [edit, setEdit] = useState<Employee | null>(null);
  const team = resource.data ?? [];
  return (
    <>
      <PageTitle eyebrow="SUPERVISIÓN" title="Un equipo que sigue avanzando.">
        <button
          className="button"
          onClick={() => {
            setCreate(!create);
            setEdit(null);
          }}
        >
          Registrar aprendiz
        </button>
      </PageTitle>
      <Notice {...action} />
      {(create || edit) && (
        <form
          className="card mb-6"
          key={edit?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const form = Object.fromEntries(new FormData(e.currentTarget));
            void action.run(async () => {
              if (edit) await userService.edit(edit.id, form);
              else await userService.create(form);
              setCreate(false);
              setEdit(null);
              resource.reload();
            });
          }}
        >
          <h2>{edit ? "Editar aprendiz" : "Nuevo aprendiz"}</h2>
          <div className="form-grid">
            <Field label="Nombre">
              <input
                name="name"
                defaultValue={edit?.name}
                required
                maxLength={100}
              />
            </Field>
            <Field label="Empresa">
              <input
                name="company"
                defaultValue={edit?.company}
                required
                maxLength={100}
              />
            </Field>
            {!edit && (
              <>
                <Field label="Documento">
                  <input name="document" required maxLength={30} />
                </Field>
                <Field label="Correo">
                  <input name="email" type="email" required />
                </Field>
                <Field label="Contraseña inicial">
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={72}
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}
          </div>
          <button className="button" disabled={action.busy}>
            Guardar aprendiz
          </button>
          <button
            type="button"
            className="button secondary ml-3"
            onClick={() => {
              setCreate(false);
              setEdit(null);
            }}
          >
            Cancelar
          </button>
        </form>
      )}
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Notice error={resource.error} />
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              label="Aprendices"
              value={team.length}
              detail="Personas de tu equipo"
            />
            <Stat
              label="Progreso medio"
              value={`${team.length ? Math.round(team.reduce((s, u) => s + u.progress.percent, 0) / team.length) : 0}%`}
              detail="Lecciones de la ruta"
            />
            <Stat
              label="Aprobados"
              value={team.filter((u) => u.progress.passed).length}
              detail="Ruta + práctica satisfactoria"
            />
            <Stat
              label="Necesitan refuerzo"
              value={
                team.filter((u) => u.progress.recommendations.length).length
              }
              detail="Según intentos registrados"
            />
          </div>
          <div className="card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Aprendiz</th>
                    <th>Avance</th>
                    <th>Nivel</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <small>{u.email}</small>
                      </td>
                      <td>
                        {u.progress.percent}%
                        <ProgressBar value={u.progress.percent} />
                      </td>
                      <td>{u.progress.level}</td>
                      <td>
                        {!u.active
                          ? "Desactivado"
                          : u.progress.passed
                            ? "Aprobado"
                            : "En curso"}
                      </td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            className="button secondary"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(
                                async () =>
                                  setDetail(
                                    await progressService.employee(u.id),
                                  ),
                                "Informe cargado.",
                              )
                            }
                          >
                            Informe
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => {
                              setEdit(u);
                              setCreate(false);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="button secondary"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(
                                async () => {
                                  await userService.edit(u.id, {
                                    active: !u.active,
                                  });
                                  resource.reload();
                                },
                                u.active
                                  ? "Aprendiz desactivado."
                                  : "Aprendiz activado.",
                              )
                            }
                          >
                            {u.active ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!team.length && (
                <Empty>
                  Registra tu primer aprendiz para comenzar el seguimiento.
                </Empty>
              )}
            </div>
          </div>
        </>
      )}
      {detail && (
        <section className="card mt-6">
          <div className="section-heading">
            <h2>Informe · {detail.name}</h2>
            <button
              className="button secondary"
              onClick={() => setDetail(null)}
            >
              Cerrar informe
            </button>
          </div>
          <p>
            {detail.progress.completed} lecciones ·{" "}
            {detail.progress.simulations} simulaciones · {detail.progress.xp} XP
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Temática</th>
                  <th>Avance</th>
                  <th>Promedio de intentos</th>
                  <th>Refuerzo</th>
                </tr>
              </thead>
              <tbody>
                {detail.progress.topics.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>
                      {t.completed}/{t.total}
                    </td>
                    <td>{t.score === null ? "Sin evaluar" : `${t.score}%`}</td>
                    <td>{t.needsReview ? "Recomendado" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-6">Actividades recientes</h3>
          {detail.activities?.map((a) => (
            <p key={a.id}>
              {a.challenge.question} · {a.score}% ·{" "}
              {new Date(a.createdAt).toLocaleDateString("es-CO")}
            </p>
          ))}
        </section>
      )}
    </>
  );
}
