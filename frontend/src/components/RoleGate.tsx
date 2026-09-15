import type { ReactNode } from "react";
import type { Role } from "../types";
export function RoleGate({
  role,
  allow,
  children,
}: {
  role: Role;
  allow: Role[];
  children: ReactNode;
}) {
  return allow.includes(role) ? <>{children}</> : null;
}
export const homeFor = (role: Role) =>
  role === "LIDER"
    ? "/equipo"
    : role === "GESTOR_PEDAGOGICO"
      ? "/contenido"
      : "/inicio";
