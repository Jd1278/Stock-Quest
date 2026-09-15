import { useState } from "react";
import { groupService, progressService } from "../services";
import { useResource, useAction } from "../hooks/useResource";
import { PageTitle, Field, Notice, Loading, Empty } from "../components/ui";
const load = async () => ({
  groups: await groupService.list(),
  team: await progressService.team(),
});
export default function GroupsPage() {
  const resource = useResource(load),
    action = useAction(),
    [deleting, setDeleting] = useState<string | null>(null);
  return (
    <>
      <PageTitle eyebrow="SUPERVISIÓN" title="Organiza la capacitación." />
      <form
        className="card mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            name = String(new FormData(form).get("name"));
          void action.run(async () => {
            await groupService.create(name);
            form.reset();
            resource.reload();
          }, "Grupo creado.");
        }}
      >
        <Field label="Nombre del nuevo grupo">
          <input
            name="name"
            placeholder="Ej. Operaciones · Turno de la mañana"
            required
            maxLength={100}
          />
        </Field>
        <button className="button" disabled={action.busy}>
          Crear grupo
        </button>
      </form>
      <Notice {...action} error={action.error || resource.error} />
      {resource.loading ? (
        <Loading />
      ) : (
        <div className="split-grid">
          {resource.data?.groups.map((g) => (
            <article className="card" key={g.id}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = String(
                    new FormData(e.currentTarget).get("name"),
                  );
                  void action.run(async () => {
                    await groupService.edit(g.id, name);
                    resource.reload();
                  });
                }}
              >
                <Field label="Grupo de capacitación">
                  <input
                    name="name"
                    defaultValue={g.name}
                    required
                    maxLength={100}
                  />
                </Field>
                <button className="button secondary" disabled={action.busy}>
                  Guardar nombre
                </button>
              </form>
              <h3 className="mt-6">Integrantes ({g.members.length})</h3>
              {g.members.map((m) => (
                <div key={m.userId} className="history-row">
                  <strong>{m.user.name}</strong>
                  <button
                    className="button secondary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await groupService.unassign(g.id, m.userId);
                        resource.reload();
                      }, "Aprendiz retirado del grupo.")
                    }
                  >
                    Retirar
                  </button>
                </div>
              ))}
              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const userId = String(
                    new FormData(e.currentTarget).get("userId"),
                  );
                  void action.run(async () => {
                    await groupService.assign(g.id, userId);
                    resource.reload();
                  }, "Aprendiz asignado.");
                }}
              >
                <Field label="Agregar aprendiz">
                  <select name="userId" required defaultValue="">
                    <option value="" disabled>
                      Seleccionar aprendiz
                    </option>
                    {resource.data?.team
                      .filter(
                        (u) =>
                          u.active && !g.members.some((m) => m.userId === u.id),
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <button className="button" disabled={action.busy}>
                  Asignar al grupo
                </button>
              </form>
              <div className="danger-zone">
                {deleting === g.id ? (
                  <>
                    <p>
                      ¿Eliminar este grupo? Los aprendices conservarán sus
                      cuentas y resultados.
                    </p>
                    <button
                      className="button danger"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(async () => {
                          await groupService.remove(g.id);
                          setDeleting(null);
                          resource.reload();
                        }, "Grupo eliminado.")
                      }
                    >
                      Sí, eliminar grupo
                    </button>
                    <button
                      className="button secondary ml-2"
                      onClick={() => setDeleting(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    className="text-sm text-red-700"
                    onClick={() => setDeleting(g.id)}
                  >
                    Eliminar grupo
                  </button>
                )}
              </div>
            </article>
          ))}
          {!resource.data?.groups.length && (
            <Empty>Todavía no hay grupos. Crea el primero arriba.</Empty>
          )}
        </div>
      )}
    </>
  );
}
