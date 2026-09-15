import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../stores/auth";
import { authService } from "../services";
import { useAction } from "../hooks/useResource";
import { Brand, Field, Notice } from "../components/ui";
import { homeFor } from "../components/RoleGate";
export default function AuthPage() {
  const user = useAuth((s) => s.user),
    login = useAuth((s) => s.login),
    [register, setRegister] = useState(false);
  const action = useAction();
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">TU PRÓXIMO NIVEL EMPIEZA AQUÍ</span>
          <h1>
            La experiencia
            <br />
            se construye
            <br />
            <em>haciendo.</em>
          </h1>
          <p>
            Aprende a tomar mejores decisiones de inventario. Un desafío a la
            vez.
          </p>
          <div className="auth-benefits">
            {[
              "Microlecciones para tu día a día",
              "Una bodega para practicar sin riesgo",
              "Tu progreso, siempre a la vista",
            ].map((t) => (
              <span key={t}>
                <CheckCircle2 size={18} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <span className="auth-footer">
          <Brand /> ACADEMIA LOGÍSTICA
        </span>
      </section>
      <section className="auth-form">
        <span className="eyebrow">BIENVENIDO A STOCK QUEST</span>
        <h2>{register ? "Crea tu cuenta" : "Qué bueno verte de nuevo"}</h2>
        <p>
          {register
            ? "Empieza tu ruta como aprendiz."
            : "Ingresa para continuar donde lo dejaste."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(e.currentTarget));
            void action.run(async () => {
              if (register) await authService.register(body);
              await login(String(body.email), String(body.password));
            }, "Sesión iniciada.");
          }}
        >
          {register && (
            <>
              <Field label="Nombre completo">
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </Field>
              <div className="form-grid">
                <Field label="Documento">
                  <input name="document" required maxLength={30} />
                </Field>
                <Field label="Empresa o institución">
                  <input name="company" required maxLength={100} />
                </Field>
              </div>
            </>
          )}
          <Field label="Correo electrónico">
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="nombre@empresa.com"
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              name="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={register ? 10 : 1}
              maxLength={72}
              required
            />
          </Field>
          {register && <small>Usa al menos 10 caracteres.</small>}
          <Notice {...action} />
          <button className="button wide" disabled={action.busy}>
            {action.busy
              ? "Un momento…"
              : register
                ? "Crear cuenta"
                : "Iniciar sesión"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "¿Ya tienes cuenta?" : "¿Es tu primera vez?"}{" "}
          <button onClick={() => setRegister(!register)}>
            {register ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </section>
    </main>
  );
}
