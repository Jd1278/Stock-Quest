import { render, waitFor } from "@testing-library/react";
import InventoryGame from "./InventoryGame";
import { createInventoryGame } from "./game";
import type { Run } from "../../types";

jest.mock("./game", () => ({ createInventoryGame: jest.fn() }));

test("successive days do not treat the Phaser event result as React cleanup", async () => {
  // Phaser's emitter returns a boolean; it must never become an effect cleanup.
  const update = jest.fn().mockReturnValue(true);
  const destroy = jest.fn();
  (createInventoryGame as jest.Mock).mockReturnValue({ update, destroy });
  const run = (day: number) => ({ id: "same-run", day, days: 7, stock: 60 - day * 10 } as Run);
  const onOrder = jest.fn();
  const view = render(<InventoryGame run={run(0)} onOrder={onOrder} />);
  await waitFor(() => expect(createInventoryGame).toHaveBeenCalledTimes(1));

  view.rerender(<InventoryGame run={run(1)} onOrder={onOrder} />);
  expect(() => view.rerender(<InventoryGame run={run(2)} onOrder={onOrder} />)).not.toThrow();
  view.rerender(<InventoryGame run={run(3)} onOrder={onOrder} />);
  expect(update.mock.calls.map(([state]) => state.day)).toEqual([1, 2, 3]);
  expect(destroy).not.toHaveBeenCalled();
  view.unmount();
  expect(destroy).toHaveBeenCalledTimes(1);
});
