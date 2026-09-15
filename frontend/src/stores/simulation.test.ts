jest.mock("../services", () => ({
  simulationService: { start: jest.fn(), get: jest.fn(), decide: jest.fn() },
}));
import { useSimulation } from "./simulation";
import { simulationService } from "../services";
import type { Run } from "../types";
beforeEach(() => {
  useSimulation.getState().reset();
  jest.clearAllMocks();
});
test("a late response from a previous session cannot restore private game data", async () => {
  let resolve!: (value: Run) => void;
  (simulationService.start as jest.Mock).mockImplementation(
    () =>
      new Promise<Run>((r) => {
        resolve = r;
      }),
  );
  const pending = useSimulation.getState().start("scenario");
  useSimulation.getState().reset();
  resolve({ id: "old-user-run" } as Run);
  await pending;
  expect(useSimulation.getState().run).toBeNull();
  expect(useSimulation.getState().busy).toBe(false);
});
test("double submission is blocked while a decision is in flight", async () => {
  let resolve!: (value: Run) => void;
  const run = { id: "run", day: 0 } as Run;
  useSimulation.setState({ run });
  (simulationService.decide as jest.Mock).mockImplementation(
    () =>
      new Promise<Run>((r) => {
        resolve = r;
      }),
  );
  const pending = useSimulation.getState().decide(10);
  await useSimulation.getState().decide(10);
  expect(simulationService.decide).toHaveBeenCalledTimes(1);
  resolve({ ...run, day: 1 });
  await pending;
  expect(useSimulation.getState().run?.day).toBe(1);
});
