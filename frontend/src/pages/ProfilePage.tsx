import { useState } from "react";
import { Award } from "lucide-react";
import { progressService, userService } from "../services";
import { useResource, useAction } from "../hooks/useResource";
import { useAuth } from "../stores/auth";
import {
  PageTitle,
  Stat,
  Field,
  Notice,
  Loading,
  ProgressBar,
} from "../components/ui";
export default function ProfilePage() {
  const user = useAuth((s) => s.user)!,
    setUser = useAuth((s) => s.setUser),
    clear = useAuth((s) => s.clear);
  const resource = useResource(progressService.me),
    action = useAction(),
    [edit, setEdit] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="TU DESARROLLO"
        title={user.role === "APRENDIZ" ? "Cada logro cuenta." : "Mi perfil"}
      >
        <button className="button secondary" onClick={() => setEdit(!edit)}>
          {edit ? "Cerrar edición" : "Editar mis datos"}
        </button>
      </PageTitle>
      {edit && (
        <form
          className="card mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            const body: Record<string, unknown> = {
              name: values.name,
              phone: values.phone,
            };
            if (values.email !== user.email) body.email = values.email;
            if (values.password) body.password = values.password;
            if (values.currentPassword)
              body.currentPassword = values.currentPassword;
            void action.run(async () => {
              setUser(await userService.update(body));
              if (body.password || body.email) clear();
            }, "Datos actualizados.");
          }}
        >
          <div className="form-grid">
            <Field label="Nombre">
              <input
                name="name"
                defaultValue={user.name}
                required
                maxLength={100}
              />
            </Field>
            <Field label="Correo electrónico">
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </Field>
            <Field label="Teléfono">
              <input
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                maxLength={30}
              />
            </Field>
            <Field label="Nueva contraseña (opcional)">
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Contraseña actual (para cambiar correo o contraseña)">
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
              />
            </Field>
          </div>
          <button className="button" disabled={action.busy}>
            Guardar cambios
          </button>
          <Notice {...action} />
        </form>
      )}
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Notice error={resource.error} />
      ) : (
        resource.data && (
          <>
            {user.role === "APRENDIZ" ? (
              <>
                <div className="stats-grid">
                  <Stat
                    label="Nivel actual"
                    value={resource.data.level}
                    detail={`${resource.data.xp} puntos de experiencia`}
                  />
                  <Stat
                    label="Ruta completada"
                    value={`${resource.data.percent}%`}
                    detail={`${resource.data.completed} lecciones completadas`}
                  />
                  <Stat
                    label="Simulaciones"
                    value={resource.data.simulations}
                    detail="Misiones finalizadas"
                  />
                  <Stat
                    label="Estado de aprobación"
                    value={resource.data.passed ? "Aprobado" : "En curso"}
                    detail="Ruta completa + simulación ≥70"
                  />
                </div>
                <div className="split-grid">
                  <section className="card">
                    <h2>Resultados por temática</h2>
                    {resource.data.topics.map((t) => (
                      <div className="history-row" key={t.id}>
                        <div className="flex-1">
                          <strong>{t.title}</strong>
                          <small>
                            {t.completed}/{t.total} lecciones ·{" "}
                            {t.score === null
                              ? "Sin evaluar"
                              : `Promedio de intentos: ${t.score}%`}
                          </small>
                          <div className="mt-3">
                            <ProgressBar
                              value={
                                t.total ? (t.completed / t.total) * 100 : 0
                              }
                            />
                          </div>
                        </div>
                        <span className="pill">
                          {t.needsReview
                            ? "Reforzar"
                            : t.score === null
                              ? "Pendiente"
                              : "En avance"}
                        </span>
                      </div>
                    ))}
                  </section>
                  <section className="card">
                    <h2>Tu siguiente oportunidad</h2>
                    {resource.data.recommendations.length ? (
                      resource.data.recommendations.map((t) => (
                        <p key={t}>{t}</p>
                      ))
                    ) : (
                      <p>
                        Continúa tu ruta y realiza nuevas simulaciones para
                        seguir desarrollando tus habilidades.
                      </p>
                    )}
                    <h3 className="mt-8">Logros obtenidos</h3>
                    <div className="badge-list">
                      {resource.data.achievements.length ? (
                        resource.data.achievements.map((a) => (
                          <div className="badge" key={a.key}>
                            <Award size={26} />
                            <span>
                              {a.key === "PRIMERA_LECCION"
                                ? "Primer paso"
                                : "Primera misión"}
                              <small className="block">
                                {new Date(a.earnedAt).toLocaleDateString(
                                  "es-CO",
                                )}
                              </small>
                            </span>
                          </div>
                        ))
                      ) : (
                        <p>
                          Completa una lección para obtener tu primer logro.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <section className="card">
                <h2>{user.name}</h2>
                <p>
                  {user.email}
                  <br />
                  {user.company}
                  <br />
                  {user.phone ?? "Sin teléfono registrado"}
                </p>
              </section>
            )}
          </>
        )
      )}
    </>
  );
}
