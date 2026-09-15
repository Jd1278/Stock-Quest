import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { lessonService, challengeService } from "../services";
import { useResource, useAction } from "../hooks/useResource";
import { PageTitle, Loading, Notice, GoLink } from "../components/ui";
import YouTubePlayer from "../components/YouTubePlayer";
export default function LessonPage() {
  const { id } = useParams();
  const load = useCallback(() => lessonService.get(id!), [id]);
  const resource = useResource(load),
    action = useAction(),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [feedback, setFeedback] = useState<
      Record<string, { passed: boolean; feedback: string; attempt: number }>
    >({});
  if (resource.loading) return <Loading />;
  if (resource.error) return <Notice error={resource.error} />;
  const lesson = resource.data!;
  return (
    <>
      <Link className="back-link" to="/ruta">
        <ArrowLeft size={16} />
        Volver a mi ruta
      </Link>
      <PageTitle eyebrow="MICROLECCIÓN" title={lesson.title}>
        <span className="pill">
          <Clock3 size={15} />
          {lesson.minutes} min
        </span>
      </PageTitle>
      <div className="lesson-layout">
        <article className="card lesson-body">
          <span className="eyebrow">LO QUE NECESITAS SABER</span>
          {lesson.body.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {lesson.contents.map((c) => (
            <section key={c.id}>
              <h3>{c.title}</h3>
              <YouTubePlayer videoId={c.youtubeId} />
            </section>
          ))}
        </article>
        <aside className="card">
          <span className="eyebrow">COMPRUEBA LO APRENDIDO</span>
          <h2>Tu turno.</h2>
          {lesson.challenges.map((c) => (
            <fieldset className="challenge" key={c.id}>
              <legend>{c.question}</legend>
              {c.options.map((option, i) => (
                <label
                  key={i}
                  className={
                    "answer-option " + (answers[c.id] === i ? "selected" : "")
                  }
                >
                  <input
                    type="radio"
                    name={c.id}
                    value={i}
                    checked={answers[c.id] === i}
                    onChange={() => setAnswers((a) => ({ ...a, [c.id]: i }))}
                  />
                  <span>{option}</span>
                </label>
              ))}
              <button
                className="button secondary"
                disabled={action.busy || answers[c.id] === undefined}
                onClick={() =>
                  void action.run(async () => {
                    const result = await challengeService.answer(
                      c.id,
                      answers[c.id],
                    );
                    setFeedback((f) => ({ ...f, [c.id]: result }));
                  }, "Respuesta registrada.")
                }
              >
                Comprobar respuesta
              </button>
              {feedback[c.id] && (
                <div
                  className={
                    "notice " + (feedback[c.id].passed ? "success" : "error")
                  }
                >
                  <strong>
                    {feedback[c.id].passed
                      ? "¡Bien hecho!"
                      : "Sigue practicando."}
                  </strong>
                  <p>{feedback[c.id].feedback}</p>
                  <small>Intento {feedback[c.id].attempt}</small>
                </div>
              )}
            </fieldset>
          ))}
          <Notice {...action} />
          {lesson.completed ? (
            <div className="notice success">
              <CheckCircle2 size={18} /> Lección completada
            </div>
          ) : (
            <button
              className="button wide"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await lessonService.complete(lesson.id);
                  resource.reload();
                }, "Lección completada. Sigue con tu ruta.")
              }
            >
              Completar lección <CheckCircle2 size={18} />
            </button>
          )}
          <div className="mt-5">
            <GoLink to="/ruta">Continuar mi ruta</GoLink>
          </div>
        </aside>
      </div>
    </>
  );
}
