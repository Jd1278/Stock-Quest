import { z } from "zod";
import { scenarioInput } from "../validators";
export type Scenario = z.infer<typeof scenarioInput>;
export type DayResult = {
  day: number;
  demand: number;
  received: number;
  ordered: number;
  sold: number;
  lost: number;
  stock: number;
  revenue: number;
  cost: number;
  profit: number;
};
// Recepción al inicio del día; pedido llega day + leadTime; demanda después de recepción.
// Beneficio incluye costo inicial y todos los pedidos, incluso los pendientes al terminar.
export function evaluate(s: Scenario, orders: number[]) {
  let stock = s.initialStock,
    totalCost = s.initialStock * s.unitCost,
    revenue = 0,
    sold = 0,
    lost = 0;
  const timeline: DayResult[] = [];
  for (let day = 0; day < orders.length; day++) {
    const quantity = orders[day];
    const received = day >= s.leadTime ? (orders[day - s.leadTime] ?? 0) : 0;
    stock += received;
    const demand = s.demand[day];
    const served = Math.min(stock, demand);
    const shortage = demand - served;
    stock -= served;
    const cost =
      quantity * s.unitCost +
      (quantity > 0 ? s.orderCost : 0) +
      stock * s.holdingCost +
      shortage * s.shortageCost;
    totalCost += cost;
    revenue += served * s.salePrice;
    sold += served;
    lost += shortage;
    timeline.push({
      day: day + 1,
      demand,
      received,
      ordered: quantity,
      sold: served,
      lost: shortage,
      stock,
      revenue: served * s.salePrice,
      cost,
      profit: revenue - totalCost,
    });
  }
  const serviceRate = sold + lost ? sold / (sold + lost) : 1;
  const profit = Math.round((revenue - totalCost) * 100) / 100;
  const score = Math.round(
    serviceRate * 80 +
      (profit >= 0
        ? 20
        : Math.max(0, 20 + (profit / Math.max(revenue, 1)) * 20)),
  );
  const feedback =
    lost > 0
      ? `Quedaron ${lost} unidades de demanda sin atender. Anticipa los pedidos ${s.leadTime} días y considera un stock de protección.`
      : stock > (s.demand.reduce((a, b) => a + b, 0) / s.demand.length) * 2
        ? "Atendiste toda la demanda, pero quedó exceso de stock. Reduce el tamaño de los pedidos para bajar almacenamiento."
        : "Buen equilibrio entre disponibilidad y costos. Mantén la reposición anticipada y revisa la demanda antes de cada pedido.";
  return { timeline, stock, profit, serviceRate, score, feedback, sold, lost };
}
