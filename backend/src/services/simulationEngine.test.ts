import { evaluate, Scenario } from "./simulationEngine";
const base: Scenario = {
  title: "Test",
  description: "Test",
  initialStock: 10,
  demand: [5, 8, 4],
  leadTime: 2,
  unitCost: 2,
  salePrice: 5,
  holdingCost: 1,
  shortageCost: 3,
  orderCost: 4,
  maxOrder: 20,
  published: true,
};
describe("Inventory consequences", () => {
  test("orders arrive after lead time, before demand; unmet demand is lost", () => {
    const r = evaluate(base, [10, 0, 0]);
    expect(r.timeline.map((d) => d.received)).toEqual([0, 0, 10]);
    expect(r.timeline.map((d) => d.stock)).toEqual([5, 0, 6]);
    expect(r.lost).toBe(3);
    expect(r.sold).toBe(14);
    expect(r.profit).toBe(6);
    expect(r.serviceRate).toBeCloseTo(14 / 17);
  });
  test("zero demand does not divide by zero", () => {
    expect(
      evaluate({ ...base, demand: [0, 0, 0] }, [0, 0, 0]).serviceRate,
    ).toBe(1);
  });
  test("late orders are charged even when they arrive after the horizon", () => {
    const a = evaluate(base, [0, 0, 0]),
      b = evaluate(base, [0, 0, 10]);
    expect(b.profit).toBe(a.profit - 24);
    expect(b.sold).toBe(a.sold);
  });
  test("no negative stock and scores remain bounded", () => {
    for (let stock = 0; stock < 30; stock++) {
      const r = evaluate({ ...base, initialStock: stock }, [0, 20, 0]);
      expect(r.timeline.every((d) => d.stock >= 0)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
  test("replay is deterministic and does not mutate scenario", () => {
    const before = JSON.stringify(base);
    expect(evaluate(base, [5, 5, 5])).toEqual(evaluate(base, [5, 5, 5]));
    expect(JSON.stringify(base)).toBe(before);
  });
});
