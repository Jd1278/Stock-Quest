import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Layout from "./components/Layout";
import { useAuth } from "./stores/auth";
import { Loading } from "./components/ui";
import { homeFor } from "./components/RoleGate";
import type { Role } from "./types";
import "./styles.css";
const Learning = lazy(() => import("./pages/LearningPage")),
  Lesson = lazy(() => import("./pages/LessonPage")),
  Simulation = lazy(() => import("./pages/SimulationPage")),
  Profile = lazy(() => import("./pages/ProfilePage")),
  Team = lazy(() => import("./pages/TeamPage")),
  Groups = lazy(() => import("./pages/GroupsPage")),
  Content = lazy(() => import("./pages/ContentPage"));
function Guard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role))
    return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
function Home() {
  const user = useAuth((s) => s.user);
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}
function App() {
  const init = useAuth((s) => s.init),
    loading = useAuth((s) => s.loading),
    location = useLocation();
  useEffect(() => {
    void init();
    const clear = () => useAuth.getState().clear();
    window.addEventListener("sq:expired", clear);
    return () => window.removeEventListener("sq:expired", clear);
  }, [init]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  if (loading) return <Loading />;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            element={
              <Guard allow={["APRENDIZ", "LIDER", "GESTOR_PEDAGOGICO"]}>
                <Layout />
              </Guard>
            }
          >
            <Route
              path="/inicio"
              element={
                <Guard allow={["APRENDIZ"]}>
                  <Learning />
                </Guard>
              }
            />
            <Route
              path="/ruta"
              element={
                <Guard allow={["APRENDIZ"]}>
                  <Learning pathOnly />
                </Guard>
              }
            />
            <Route
              path="/lecciones/:id"
              element={
                <Guard allow={["APRENDIZ"]}>
                  <Lesson key={location.pathname} />
                </Guard>
              }
            />
            <Route
              path="/simulador"
              element={
                <Guard allow={["APRENDIZ"]}>
                  <Simulation />
                </Guard>
              }
            />
            <Route path="/perfil" element={<Profile />} />
            <Route
              path="/equipo"
              element={
                <Guard allow={["LIDER"]}>
                  <Team />
                </Guard>
              }
            />
            <Route
              path="/grupos"
              element={
                <Guard allow={["LIDER"]}>
                  <Groups />
                </Guard>
              }
            />
            <Route
              path="/contenido"
              element={
                <Guard allow={["GESTOR_PEDAGOGICO"]}>
                  <Content key="content" />
                </Guard>
              }
            />
            <Route
              path="/escenarios"
              element={
                <Guard allow={["GESTOR_PEDAGOGICO"]}>
                  <Content scenarios key="scenarios" />
                </Guard>
              }
            />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
