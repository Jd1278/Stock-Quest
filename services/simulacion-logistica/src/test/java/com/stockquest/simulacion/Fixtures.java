package com.stockquest.simulacion;

import com.stockquest.simulacion.domain.ParametrosEscenario;
import com.stockquest.simulacion.domain.UsuarioAutenticado;
import com.stockquest.simulacion.partidas.domain.Partida;
import java.time.Instant;
import java.util.List;

public final class Fixtures {
    private Fixtures() { }
    public static ParametrosEscenario escenario() {
        return new ParametrosEscenario("Test", "Escenario de prueba", 10, List.of(5,8,4), 2,2,5,1,3,4,20,true);
    }
    public static UsuarioAutenticado aprendiz() { return new UsuarioAutenticado("learner-1", UsuarioAutenticado.Rol.APRENDIZ); }
    public static Partida partida(List<Integer> decisions) {
        return new Partida("run-1", "learner-1", "scenario-1", escenario(), decisions, decisions.size(), Instant.parse("2026-10-18T15:00:00Z"), null);
    }
}
