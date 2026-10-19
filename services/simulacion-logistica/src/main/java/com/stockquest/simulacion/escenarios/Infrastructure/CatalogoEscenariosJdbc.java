package com.stockquest.simulacion.escenarios.Infrastructure;

import com.stockquest.simulacion.Infrastructure.JsonPersistencia;
import com.stockquest.simulacion.domain.ParametrosEscenario;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.escenarios.Application.CatalogoEscenarios;
import com.stockquest.simulacion.escenarios.domain.Escenario;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Optional;

public final class CatalogoEscenariosJdbc implements CatalogoEscenarios {
    private final JdbcTemplate jdbc;
    private final JsonPersistencia json;
    public CatalogoEscenariosJdbc(JdbcTemplate jdbc, JsonPersistencia json) { this.jdbc = jdbc; this.json = json; }
    @Override public Optional<Escenario> publicado(String id) {
        return jdbc.query("SELECT id, parameters FROM simulation_scenarios WHERE id = ? AND (parameters->>'published')::boolean = true",
                (rs, row) -> new Escenario(rs.getString("id"), json.leer(rs.getString("parameters"), ParametrosEscenario.class)), id).stream().findFirst();
    }
    @Override public List<Escenario> publicados() {
        return jdbc.query("SELECT id, parameters FROM simulation_scenarios WHERE (parameters->>'published')::boolean = true ORDER BY id",
                (rs, row) -> new Escenario(rs.getString("id"), json.leer(rs.getString("parameters"), ParametrosEscenario.class)));
    }
    @Override public List<Escenario> todos() {
        return jdbc.query("SELECT id, parameters FROM simulation_scenarios ORDER BY id",
                (rs,row)->new Escenario(rs.getString("id"),json.leer(rs.getString("parameters"),ParametrosEscenario.class)));
    }
    @Override public void guardar(Escenario escenario, boolean nuevo) {
        if (nuevo) jdbc.update("INSERT INTO simulation_scenarios(id,parameters) VALUES (?,?::jsonb)",escenario.id(),json.escribir(escenario.parametros()));
        else if (jdbc.update("UPDATE simulation_scenarios SET parameters=?::jsonb WHERE id=?",json.escribir(escenario.parametros()),escenario.id())!=1)
            throw new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Escenario no encontrado.");
    }
}
