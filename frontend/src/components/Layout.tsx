import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Route,
  Gamepad2,
  UserRound,
  Users,
  BookOpen,
  LogOut,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../stores/auth";
import { Brand } from "./ui";
export default function Layout() {
  const user = useAuth((s) => s.user)!,
    logout = useAuth((s) => s.logout);
  const links =
    user.role === "APRENDIZ"
      ? [
          ["/inicio", "Mi aprendizaje", LayoutDashboard],
          ["/ruta", "Ruta de aprendizaje", Route],
          ["/simulador", "Simulador de bodega", Gamepad2],
          ["/perfil", "Mi progreso", UserRound],
        ]
      : user.role === "LIDER"
        ? [
            ["/equipo", "Mi equipo", Users],
            ["/grupos", "Grupos de capacitación", LayoutDashboard],
            ["/perfil", "Mi perfil", UserRound],
          ]
        : [
            ["/contenido", "Contenido pedagógico", BookOpen],
            ["/escenarios", "Escenarios", Gamepad2],
            ["/perfil", "Mi perfil", UserRound],
          ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="sidebar-label">
          ESPACIO DE{" "}
          {user.role === "APRENDIZ"
            ? "APRENDIZAJE"
            : user.role === "LIDER"
              ? "SUPERVISIÓN"
              : "CONTENIDO"}
        </span>
        <nav aria-label="Navegación principal">
          {links.map(([href, label, Icon]) => {
            const I = Icon as typeof Route;
            return (
              <NavLink key={String(href)} to={String(href)}>
                <I size={20} />
                <span>{String(label)}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-tip">
          <GraduationCap size={26} />
          <strong>
            Pequeños pasos.
            <br />
            Grandes habilidades.
          </strong>
          <p>Practica, aprende y lleva tu conocimiento a la bodega.</p>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "APRENDIZ"
                ? "Aprendiz"
                : user.role === "LIDER"
                  ? "Líder de equipo"
                  : "Gestor pedagógico"}
            </small>
          </div>
          <button
            aria-label="Cerrar sesión"
            onClick={() => void logout().catch(() => undefined)}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Academia logística <ChevronRight size={14} />
            <strong>Tu espacio</strong>
          </span>
          <span className="company">
            {user.company}
            <button
              className="mobile-logout"
              aria-label="Cerrar sesión"
              onClick={() => void logout().catch(() => undefined)}
            >
              <LogOut size={18} />
            </button>
          </span>
        </header>
        <main id="main-content">
          <Outlet />
        </main>
        <footer className="main-footer">
          <Brand /> <span>Aprender. Practicar. Avanzar.</span>
        </footer>
      </div>
    </div>
  );
}
