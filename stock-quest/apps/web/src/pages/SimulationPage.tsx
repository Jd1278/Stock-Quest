import { useRef, useState } from "react";
import { Warehouse, ArrowRight, RotateCcw } from "lucide-react";
import { simulationService } from "../services";
import { useResource } from "../hooks/useResource";
import { useSimulation } from "../stores/simulation";
import {
  PageTitle,
  Stat,
  Notice,
  Loading,
  Empty,
  Field,
  money,
  ProgressBar,
} from "../components/ui";
import InventoryGame from "../games/inventory/InventoryGame";
const load = async () => ({
  scenarios: await simulationService.list(),
  history: await simulationService.history(),
});
export default function SimulationPage() {
  const resource = useResource(load),
    { run, busy, error, start, decide, resume, reset } = useSimulation(),
    [quantity, setQuantity] = useState(0),
    input = useRef<HTMLInputElement>(null);
  return (
    <>
      <PageTitle
        eyebrow="LABORATORIO LOGÍSTICO"
        title="El control está en tus manos."
      >
        <span className="pill">
          <Warehouse size={16} />
          Simulador de bodega
        </span>
      </PageTitle>
      <Notice error={error || resource.error} />
      {!run ? (
        <>
          {resource.loading ? (
            <Loading />
          ) : (
            <>
              <div className="scenario-grid">
                {resource.data?.scenarios.map((s) => (
                  <article className="card scenario-card" key={s.id}>
                    <Warehouse size={36} />
                    <span className="eyebrow">MISIÓN DE ABASTECIMIENTO</span>
                    <h2>{s.title}</h2>
                    <p>{s.description}</p>
                    <dl>
                      <div>
                        <dt>Inventario inicial</dt>
                        <dd>{s.initialStock} uds.</dd>
                      </div>
                      <div>
                        <dt>Tiempo de entrega</dt>
                        <dd>{s.leadTime} días</dd>
                      </div>
                    </dl>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => void start(s.id)}
                    >
                      Iniciar simulación
                      <ArrowRight size={18} />
                    </button>
                  </article>
                ))}
              </div>
              {!resource.data?.scenarios.length && (
                <Empty>Aún no hay escenarios publicados.</Empty>
              )}
              <h2 className="mt-8">Tus partidas</h2>
              <div className="card mt-4">
                {!resource.data?.history.length ? (
                  <p>Tu primera misión empieza arriba.</p>
                ) : (
                  resource.data.history.map((h) => (
                    <div className="history-row" key={h.id}>
                      <span>
                        <strong>{h.scenario.title}</strong>
                        <small>
                          {h.result
                            ? `${h.result.score} puntos · Finalizada`
                            : `En curso · ${h.day} días completados`}
                        </small>
                      </span>
                      <button
                        className="button secondary"
                        onClick={() => void resume(h.id)}
                        disabled={busy}
                      >
                        {h.result ? "Ver resultado" : "Continuar"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>{run.title}</h2>
              <p>{run.description}</p>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                reset();
                resource.reload();
              }}
            >
              Volver a mis partidas
            </button>
          </div>
          <div className="stats-grid">
            <Stat
              label="Día de operación"
              value={
                run.finished
                  ? `${run.days}/${run.days}`
                  : `${run.day + 1}/${run.days}`
              }
              detail={
                run.finished
                  ? "Escenario completado"
                  : "Decide antes de cerrar el día"
              }
            />
            <Stat
              label="Inventario disponible"
              value={run.stock}
              detail="Unidades en bodega"
            />
            <Stat
              label="Beneficio acumulado"
              value={money(run.profit)}
              detail="Incluye inversión inicial y pedidos"
            />
            <Stat
              label="Nivel de servicio"
              value={`${Math.round(run.serviceRate * 100)}%`}
              detail={
                run.day
                  ? "Demanda atendida / total"
                  : "Aún no se ha atendido demanda"
              }
            />
          </div>
          <div className="simulation-layout">
            <div>
              <InventoryGame run={run} onOrder={() => input.current?.focus()} />
              <div className="card mt-4">
                <h3>Pedidos en camino</h3>
                {run.pending.length ? (
                  run.pending.map((p, i) => (
                    <p key={i}>
                      {p.quantity} unidades · llegada al inicio del día{" "}
                      {p.arrivalDay}
                      {p.arrivalDay > run.days ? " (fuera del horizonte)" : ""}
                    </p>
                  ))
                ) : (
                  <p>No hay entregas pendientes.</p>
                )}
              </div>
            </div>
            <aside className="card order-panel">
              {run.finished ? (
                <>
                  <span className="eyebrow">REPORTE DE MISIÓN</span>
                  <h2>
                    {run.score >= 70
                      ? "¡Misión aprobada!"
                      : "Una oportunidad para mejorar"}
                  </h2>
                  <strong className="score">
                    {run.score}
                    <small>/100</small>
                  </strong>
                  <ProgressBar value={run.score} />
                  <p>{run.feedback}</p>
                  <button
                    className="button"
                    onClick={() => {
                      reset();
                      resource.reload();
                    }}
                  >
                    <RotateCcw size={16} /> Elegir otra misión
                  </button>
                </>
              ) : (
                <>
                  <span className="eyebrow">
                    TU DECISIÓN / DÍA {run.day + 1}
                  </span>
                  <h2>¿Cuánto vas a pedir?</h2>
                  <p>
                    La demanda varía entre {run.demandRange[0]} y{" "}
                    {run.demandRange[1]} unidades. Tus pedidos llegan en{" "}
                    {run.leadTime} días.
                  </p>
                  <dl className="cost-list">
                    <div>
                      <dt>Costo por unidad</dt>
                      <dd>{money(run.unitCost)}</dd>
                    </div>
                    <div>
                      <dt>Precio de venta</dt>
                      <dd>{money(run.salePrice)}</dd>
                    </div>
                    <div>
                      <dt>Costo por pedido</dt>
                      <dd>{money(run.orderCost)}</dd>
                    </div>
                    <div>
                      <dt>Almacenamiento / ud. / día</dt>
                      <dd>{money(run.holdingCost)}</dd>
                    </div>
                    <div>
                      <dt>Penalización / faltante</dt>
                      <dd>{money(run.shortageCost)}</dd>
                    </div>
                  </dl>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void decide(quantity);
                    }}
                  >
                    <Field label="Unidades a pedir">
                      <input
                        ref={input}
                        type="number"
                        min={0}
                        max={run.maxOrder}
                        step={1}
                        value={quantity}
                        required
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </Field>
                    <small>
                      Máximo {run.maxOrder}. Usa 0 si hoy no harás pedido.
                    </small>
                    <button className="button wide mt-4" disabled={busy}>
                      {busy ? "Procesando…" : "Confirmar y cerrar el día"}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </>
              )}
            </aside>
          </div>
          <div className="card mt-6">
            <h3>Bitácora de operaciones</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Día",
                      "Pedido",
                      "Recibido",
                      "Demanda",
                      "Ventas (uds.)",
                      "Faltante",
                      "Stock",
                      "Beneficio acumulado",
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {run.timeline.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.ordered}</td>
                      <td>{d.received}</td>
                      <td>{d.demand}</td>
                      <td>{d.sold}</td>
                      <td className={d.lost ? "text-red-700" : ""}>{d.lost}</td>
                      <td>{d.stock}</td>
                      <td>{money(d.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!run.timeline.length && (
                <Empty>Confirma tu primera decisión para comenzar.</Empty>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
