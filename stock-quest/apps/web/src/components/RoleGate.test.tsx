import { render, screen } from "@testing-library/react";
import { RoleGate, homeFor } from "./RoleGate";
test("supervisor actions are not rendered for learners", () => {
  render(
    <RoleGate role="APRENDIZ" allow={["LIDER"]}>
      <button>Crear grupo</button>
    </RoleGate>,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
test("supervisor sees authorized actions", () => {
  render(
    <RoleGate role="LIDER" allow={["LIDER"]}>
      <button>Crear grupo</button>
    </RoleGate>,
  );
  expect(
    screen.getByRole("button", { name: "Crear grupo" }),
  ).toBeInTheDocument();
});
test("each role has its intended home", () => {
  expect(homeFor("APRENDIZ")).toBe("/inicio");
  expect(homeFor("LIDER")).toBe("/equipo");
  expect(homeFor("GESTOR_PEDAGOGICO")).toBe("/contenido");
});
