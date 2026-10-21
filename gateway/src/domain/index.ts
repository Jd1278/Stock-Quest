export type Role = "APRENDIZ" | "LIDER" | "GESTOR_PEDAGOGICO";
export type Service = "people" | "learning" | "simulation";
export class AppError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
