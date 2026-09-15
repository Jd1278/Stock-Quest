import { useCallback, useEffect, useState } from "react";
export function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loader()
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Error inesperado.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader, revision]);
  return { data, error, loading, reload };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function run(
    action: () => Promise<unknown>,
    success = "Cambios guardados.",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, error, run };
}
