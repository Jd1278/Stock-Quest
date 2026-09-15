import { useEffect, useRef } from "react";
import type { Run } from "../../types";
export default function InventoryGame({
  run,
  onOrder,
}: {
  run: Run;
  onOrder: () => void;
}) {
  const parent = useRef<HTMLDivElement>(null),
    game = useRef<{ update: (run: Run) => void; destroy: () => void }>(),
    latest = useRef(run),
    callback = useRef(onOrder);
  latest.current = run;
  callback.current = onOrder;
  useEffect(() => {
    let active = true;
    void import("./game")
      .then(({ createInventoryGame }) => {
        if (active && parent.current)
          game.current = createInventoryGame(
            parent.current,
            { onOrder: () => callback.current() },
            latest.current,
          );
      })
      .catch(() => {
        if (parent.current)
          parent.current.textContent =
            "La vista 2D no se pudo cargar. Puedes seguir usando los controles de pedido.";
      });
    return () => {
      active = false;
      game.current?.destroy();
      game.current = undefined;
    };
  }, []);
  useEffect(() => game.current?.update(run), [run]);
  return (
    <div
      className="game-host"
      ref={parent}
      role="img"
      aria-label={`Bodega: ${run.stock} unidades disponibles. Usa los controles de pedido para jugar.`}
    />
  );
}
