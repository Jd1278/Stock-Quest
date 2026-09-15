import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  LockKeyhole,
  Play,
  Target,
  Trophy,
  Warehouse,
} from "lucide-react";
import { moduleService, progressService } from "../services";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../stores/auth";
import {
  PageTitle,
  Stat,
  ProgressBar,
  GoLink,
  Loading,
  Notice,
  Empty,
} from "../components/ui";
const load = async () => ({
  modules: await moduleService.list(),
  progress: await progressService.me(),
});
export default function LearningPage({
  pathOnly = false,
}: {
  pathOnly?: boolean;
}) {
  const resource = useResource(load),
    user = useAuth((s) => s.user)!;
  if (resource.loading) return <Loading />;
  if (resource.error) return <Notice error={resource.error} />;
  const { modules, progress } = resource.data!;
  const next = modules
    .flatMap((m) => m.lessons)
    .find((l) => l.unlocked && !l.completed);
  return (
    <>
      <PageTitle
        eyebrow="APRENDE A TU RITMO"
        title={
          pathOnly
            ? "Tu ruta de aprendizaje"
            : `Vamos por más, ${user.name.split(" ")[0]}.`
        }
      >
        <span className="pill">
          <Trophy size={16} /> Nivel {progress.level}
        </span>
      </PageTitle>
      {!pathOnly && (
        <>
          <section className="learning-hero">
            <div>
              <span className="eyebrow">TU SIGUIENTE MISIÓN</span>
              <h2>
                {next?.title ??
                  (progress.total
                    ? "¡Ruta completada!"
                    : "Tu ruta está por comenzar")}
              </h2>
              <p>
                {next
                  ? "Convierte los conceptos en decisiones. Tu próxima habilidad empieza con una microlección."
                  : progress.total
                    ? "Pon a prueba lo aprendido en el simulador de bodega."
                    : "El gestor publicará tus primeras microlecciones pronto."}
              </p>
              {next ? (
                <GoLink to={"/lecciones/" + next.id}>
                  Continuar aprendiendo
                </GoLink>
              ) : (
                <GoLink to="/simulador">Ir al simulador</GoLink>
              )}
            </div>
            <div className="hero-progress">
              <span>MI AVANCE</span>
              <strong>
                {progress.percent}
                <small>%</small>
              </strong>
              <ProgressBar value={progress.percent} />
              <p>
                {progress.completed} de {progress.total} lecciones
              </p>
            </div>
          </section>
          <div className="stats-grid">
            <Stat
              label="Experiencia acumulada"
              value={
                <>
                  {progress.xp}
                  <small> XP</small>
                </>
              }
              detail="Ganada con actividades reales"
            />
            <Stat
              label="Lecciones completadas"
              value={`${progress.completed}/${progress.total}`}
              detail="Cada paso cuenta"
            />
            <Stat
              label="Simulaciones finalizadas"
              value={progress.simulations}
              detail="Decisiones puestas en práctica"
            />
            <Stat
              label="Tu nivel actual"
              value={progress.level}
              detail={`${250 - (progress.xp % 250)} XP para el próximo nivel`}
            />
          </div>
        </>
      )}
      <div className="section-heading">
        <div>
          <span className="eyebrow">DE LA TEORÍA A LA PRÁCTICA</span>
          <h2>
            {pathOnly
              ? "Paso a paso, hacia tu objetivo"
              : "Explora tu aprendizaje"}
          </h2>
        </div>
        <span>{modules.length} módulos</span>
      </div>
      <div className="learning-layout">
        <section className="module-list">
          {modules.length === 0 && (
            <Empty>Aún no hay módulos publicados.</Empty>
          )}
          {modules.map((m, i) => {
            const done = m.lessons.filter((l) => l.completed).length,
              available = m.lessons.some((l) => l.unlocked);
            return (
              <article
                className={"module-card " + (!available ? "locked" : "")}
                key={m.id}
              >
                <div className="module-top">
                  <span
                    className={
                      "module-number " +
                      (done === m.lessons.length && done ? "done" : "")
                    }
                  >
                    {done === m.lessons.length && done ? (
                      <Check size={22} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <span className="eyebrow">
                      MÓDULO {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{m.title}</h3>
                    <p>{m.description}</p>
                  </div>
                  <span className="module-status">
                    {done === m.lessons.length && done ? (
                      "Completado"
                    ) : available ? (
                      "Disponible"
                    ) : (
                      <LockKeyhole size={18} />
                    )}
                  </span>
                </div>
                <div className="module-lessons">
                  {m.lessons.map((l) => (
                    <div className="lesson-row" key={l.id}>
                      <span>
                        {l.completed ? (
                          <Check size={17} />
                        ) : l.unlocked ? (
                          <Play size={16} />
                        ) : (
                          <LockKeyhole size={16} />
                        )}
                      </span>
                      <div>
                        <strong>{l.title}</strong>
                        <small>
                          <Clock3 size={12} /> {l.minutes} min · Microlección
                        </small>
                      </div>
                      {l.unlocked || l.completed ? (
                        <Link
                          aria-label={`Abrir ${l.title}`}
                          to={"/lecciones/" + l.id}
                        >
                          <ArrowUpRight size={20} />
                        </Link>
                      ) : (
                        <small>Bloqueada</small>
                      )}
                    </div>
                  ))}
                </div>
                <div className="module-bottom">
                  <span>
                    <BookOpen size={14} /> {m.lessons.length} lecciones
                  </span>
                  <span>
                    {done}/{m.lessons.length} completadas
                  </span>
                </div>
              </article>
            );
          })}
        </section>
        <aside className="learning-aside">
          <article className="sim-promo">
            <span className="icon-tile">
              <Warehouse size={30} />
            </span>
            <span className="eyebrow">LABORATORIO LOGÍSTICO</span>
            <h3>
              Tu bodega.
              <br />
              Tus decisiones.
            </h3>
            <p>
              Gestiona pedidos, responde a la demanda y descubre el impacto de
              cada decisión.
            </p>
            <GoLink to="/simulador">Entrar al simulador</GoLink>
            <small>
              <Target size={15} /> Aprendizaje sin riesgo financiero
            </small>
          </article>
          <article className="card tip-card">
            <span className="eyebrow">UNA BUENA PRÁCTICA</span>
            <h3>Anticiparse es la clave.</h3>
            <p>
              El inventario disponible debe cubrir la demanda mientras llega tu
              próximo pedido.
            </p>
            <span className="formula">
              Punto de pedido =<br />
              demanda × plazo + protección
            </span>
          </article>
        </aside>
      </div>
    </>
  );
}
