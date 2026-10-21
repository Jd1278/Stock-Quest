import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContentPage from "./ContentPage";
import { adminService } from "../services";

jest.mock("../services", () => ({ adminService: { content: jest.fn(), save: jest.fn(), remove: jest.fn() } }));
const challenge = { id: "challenge", lessonId: "lesson", question: "Desafío temporal", options: ["A", "B"], correctIndex: 0, explanation: "A" };
const lesson = { id: "lesson", moduleId: "module", title: "Lección temporal", body: "Texto", position: 1, minutes: 5, contents: [], challenges: [challenge] };
const moduleFixture = { id: "module", title: "Módulo temporal", description: "Prueba", position: 10, published: false, lessons: [lesson] };
const scenario = { id: "scenario", title: "Escenario temporal", description: "Prueba", initialStock: 10, demand: [1, 2, 3], leadTime: 2,
  unitCost: 2, salePrice: 5, holdingCost: 1, shortageCost: 3, orderCost: 4, maxOrder: 20, published: false };
beforeEach(() => {
  jest.clearAllMocks();
  (adminService.content as jest.Mock).mockResolvedValue({ modules: [moduleFixture], scenarios: [scenario] });
  (adminService.remove as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

const cases = [
  { scenarios: false, tab: null, title: moduleFixture.title, kind: "modules", id: "module", label: "Eliminar módulo" },
  { scenarios: false, tab: "Lecciones", title: lesson.title, kind: "lessons", id: "lesson", label: "Eliminar lección" },
  { scenarios: false, tab: "Desafíos", title: challenge.question, kind: "challenges", id: "challenge", label: "Eliminar desafío" },
  { scenarios: true, tab: null, title: scenario.title, kind: "scenarios", id: "scenario", label: "Eliminar escenario" },
];

test.each(cases)("confirmed removal of $kind refreshes the catalog", async ({ scenarios, tab, title, kind, id, label }) => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<ContentPage scenarios={scenarios} />);
  if (tab) fireEvent.click(screen.getByRole("button", { name: tab }));
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(title) }));
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(title));
  await waitFor(() => expect(adminService.remove).toHaveBeenCalledWith(kind, id));
  await waitFor(() => expect(adminService.content).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
});

test.each(cases)("canceling removal of $kind leaves the record intact", async ({ scenarios, tab, title, label }) => {
  jest.spyOn(window, "confirm").mockReturnValue(false);
  render(<ContentPage scenarios={scenarios} />);
  if (tab) fireEvent.click(screen.getByRole("button", { name: tab }));
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(title) }));
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(adminService.remove).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: label })).toBeEnabled();
});

test.each(cases)("a conflict for $kind preserves selection and displays the reason", async ({ scenarios, tab, title, label }) => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  (adminService.remove as jest.Mock).mockRejectedValue(new Error("Tiene actividad registrada y no se puede eliminar."));
  render(<ContentPage scenarios={scenarios} />);
  if (tab) fireEvent.click(screen.getByRole("button", { name: tab }));
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(title) }));
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(await screen.findByText("Tiene actividad registrada y no se puede eliminar.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: label })).toBeEnabled();
  expect(adminService.content).toHaveBeenCalledTimes(1);
});

