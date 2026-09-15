let token = sessionStorage.getItem("sq.token");
export function setToken(value: string | null) {
  token = value;
  if (value) sessionStorage.setItem("sq.token", value);
  else sessionStorage.removeItem("sq.token");
}
export function hasToken() {
  return !!token;
}
const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "No se pudo conectar. Revisa tu conexión e intenta nuevamente.",
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ message: "Respuesta del servidor no disponible." }));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      setToken(null);
      window.dispatchEvent(new Event("sq:expired"));
    }
    throw new Error(data.message ?? "No fue posible completar la acción.");
  }
  return data as T;
}
