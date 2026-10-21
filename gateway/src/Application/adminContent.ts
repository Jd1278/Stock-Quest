import { AppError } from "../domain";
import type { ServicePort } from "./ServicePort";
export async function adminContent(port: ServicePort, bearer?: string, correlation?: string) {
  const [modules, scenarios] = await Promise.all([
    port.call("learning", "GET", "/internal/admin/modules", bearer, undefined, correlation),
    port.call("simulation", "GET", "/internal/admin/scenarios", bearer, undefined, correlation),
  ]);
  for (const reply of [modules, scenarios]) {
    if (reply.status !== 200 || !Array.isArray(reply.body)) {
      throw new AppError(reply.status >= 400 ? reply.status : 503, "No fue posible consultar el contenido.");
    }
  }
  return { modules: modules.body, scenarios: scenarios.body };
}
