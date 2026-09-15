import { renderHook, waitFor, act } from "@testing-library/react";
import { useResource, useAction } from "./useResource";
test("loads data and surfaces network failures", async () => {
  const loader = jest.fn().mockResolvedValue(["module"]);
  const { result } = renderHook(() => useResource(loader));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual(["module"]);
  loader.mockRejectedValue(new Error("Sin conexión"));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.error).toBe("Sin conexión"));
});
test("action exposes errors and does not announce success", async () => {
  const { result } = renderHook(() => useAction());
  await act(async () => {
    await result.current.run(async () => {
      throw new Error("No autorizado");
    });
  });
  expect(result.current.error).toBe("No autorizado");
  expect(result.current.message).toBe("");
  expect(result.current.busy).toBe(false);
});
