jest.mock("../services", () => ({
  authService: { login: jest.fn(), me: jest.fn(), logout: jest.fn() },
}));
jest.mock("../services/http", () => ({
  hasToken: jest.fn(() => false),
  setToken: jest.fn(),
}));
import { useAuth } from "./auth";
import { authService } from "../services";
import { setToken } from "../services/http";
beforeEach(() => {
  useAuth.setState({ user: null, loading: true });
  jest.clearAllMocks();
});
test("login stores a session only after server authentication", async () => {
  const user = { id: "1", name: "Ana", role: "APRENDIZ" };
  (authService.login as jest.Mock).mockResolvedValue({ user, token: "signed" });
  await useAuth.getState().login("a@b.co", "password");
  expect(useAuth.getState().user).toEqual(user);
  expect(setToken).toHaveBeenCalledWith("signed");
});
test("failed login does not create a session", async () => {
  (authService.login as jest.Mock).mockRejectedValue(
    new Error("Credenciales inválidas"),
  );
  await expect(useAuth.getState().login("a@b.co", "bad")).rejects.toThrow();
  expect(useAuth.getState().user).toBeNull();
});
test("logout clears local session even if network is unavailable", async () => {
  (authService.logout as jest.Mock).mockRejectedValue(new Error("offline"));
  await expect(useAuth.getState().logout()).rejects.toThrow();
  expect(setToken).toHaveBeenCalledWith(null);
  expect(useAuth.getState().user).toBeNull();
});
