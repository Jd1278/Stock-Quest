import { AppError, Service } from "../domain";
import type { ServicePort } from "../Application/ServicePort";
import type { GatewayConfig } from "./config";
export class HttpServices implements ServicePort {
  constructor(private readonly config: GatewayConfig) {}
  async call(service: Service, method: string, path: string, bearer?: string, body?: unknown, correlation?: string) {
    // Paths are produced by registered routes, never by a client supplied target URL.
    const validPath = service === "people"
      ? /^\/api\/(auth|users|groups|reports)(\/|$)/.test(path)
      : service === "learning"
        ? /^\/(api\/(modules|lessons|challenges|progress|admin)(\/|$)|internal\/admin\/modules$)/.test(path)
        : /^\/(api\/(simulations|admin\/scenarios)(\/|$)|internal\/admin\/scenarios$)/.test(path);
    if (!validPath || /[?#\\]/.test(path) || /%2f|%5c|(?:^|\/)\.{1,2}(?:\/|$)/i.test(path)) throw new AppError(400, "Ruta de servicio inválida.");
    const endpoint = {
      people: { url: this.config.PEOPLE_SERVICE_URL, token: undefined, name: "personas" },
      learning: { url: this.config.LEARNING_SERVICE_URL, token: this.config.LEARNING_SERVICE_TOKEN, name: "aprendizaje" },
      simulation: { url: this.config.SIMULATION_SERVICE_URL, token: this.config.SIMULATION_SERVICE_TOKEN, name: "simulación" },
    }[service];
    let response: globalThis.Response;
    try {
      response = await fetch(endpoint.url.replace(/\/$/, "") + path, {
        method, redirect: "error", signal: AbortSignal.timeout(service === "people" ? 5000 : 2500),
        headers: { "Content-Type": "application/json", ...(endpoint.token ? { "X-StockQuest-Service-Token": endpoint.token } : {}),
          ...(bearer ? { Authorization: bearer } : {}), ...(correlation ? { "X-Correlation-Id": correlation } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw new AppError(503, `El servicio de ${endpoint.name} no está disponible.`); }
    if (response.status === 204) return { status: 204, body: undefined };
    let result: any;
    try { result = await response.json(); } catch { throw new AppError(503, `El servicio de ${endpoint.name} devolvió una respuesta inválida.`); }
    if (![200, 201, 400, 401, 403, 404, 409, 413, 429, 500, 503].includes(response.status)
      || (response.status >= 400 && (!result || typeof result.message !== "string"))) {
      throw new AppError(503, `El servicio de ${endpoint.name} devolvió una respuesta inválida.`);
    }
    return { status: response.status, body: result };
  }
}
