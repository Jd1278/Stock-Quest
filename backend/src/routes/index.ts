import { Router } from "express";
import rateLimit from "express-rate-limit";
import { controller as c } from "../controllers";
import { authenticate, authorize, asyncRoute as a } from "../middlewares";
export const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta en 15 minutos." },
});
router.post("/auth/register", authLimit, a(c.register));
router.post("/auth/login", authLimit, a(c.login));
router.use(authenticate);
router.post("/auth/logout", a(c.logout));
router.get("/auth/me", a(c.me));
router.patch("/users/me", a(c.profile));
router.get("/modules", a(c.path));
router.get("/lessons/:id", a(c.lesson));
router.post("/lessons/:id/complete", authorize("APRENDIZ"), a(c.complete));
router.post("/challenges/:id/attempts", authorize("APRENDIZ"), a(c.answer));
router.get("/simulations/scenarios", a(c.scenarios));
router.get("/simulations", a(c.history));
router.post("/simulations", authorize("APRENDIZ"), a(c.start));
router.get("/simulations/:id", a(c.simulation));
router.post("/simulations/:id/decisions", authorize("APRENDIZ"), a(c.decision));
router.get("/progress", a(c.progress));
const leader = Router();
leader.use(["/reports", "/users", "/groups"], authorize("LIDER"));
leader.get("/reports", a(c.team));
leader.get("/reports/:id", a(c.employeeReport));
leader.post("/users", a(c.createEmployee));
leader.patch("/users/:id", a(c.editEmployee));
leader.get("/groups", a(c.groups));
leader.post("/groups", a(c.createGroup));
leader.patch("/groups/:id", a(c.editGroup));
leader.delete("/groups/:id", a(c.deleteGroup));
leader.post("/groups/:id/members", a(c.assign));
leader.delete("/groups/:id/members/:userId", a(c.unassign));
router.use(leader);
const admin = Router();
admin.use(authorize("GESTOR_PEDAGOGICO"));
admin.get("/", a(c.content));
for (const [path, key] of [
  ["modules", "module"],
  ["lessons", "adminLesson"],
  ["challenges", "challenge"],
  ["scenarios", "scenario"],
]) {
  admin.post("/" + path, a(c[key]));
  admin.put("/" + path + "/:id", a(c[key]));
}
router.use("/admin", admin);
