package com.stockquest.simulacion.partidas.Infrastructure.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.stockquest.simulacion.Infrastructure.JsonPersistencia;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.domain.ParametrosEscenario;
import com.stockquest.simulacion.partidas.Application.PartidaRepository;
import com.stockquest.simulacion.partidas.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public final class PartidaJdbc implements PartidaRepository {
    private static final String SELECT = """
        SELECT p.*, s.parameters->>'title' AS scenario_title, r.id AS result_id, r.score, r.profit, r.service_rate, r.feedback,
               r.timeline, r.created_at AS result_created_at
        FROM simulation_runs p JOIN simulation_scenarios s ON s.id = p.scenario_id
        LEFT JOIN simulation_results r ON r.simulation_id = p.id
        """;
    private final JdbcTemplate jdbc;
    private final JsonPersistencia json;
    public PartidaJdbc(JdbcTemplate jdbc, JsonPersistencia json) { this.jdbc = jdbc; this.json = json; }
    @Override public Optional<Partida> propia(String id, String userId) {
        return jdbc.query(SELECT + " WHERE p.id = ? AND p.user_id = ?", this::mapear, id, userId).stream().findFirst();
    }
    @Override public List<RegistroHistorial> historial(String userId) {
        return jdbc.query(SELECT + " WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 100",
                (rs, row) -> new RegistroHistorial(mapear(rs, row), rs.getString("scenario_title")), userId);
    }
    @Override public void crear(Partida p) {
        jdbc.update("INSERT INTO simulation_runs(id,user_id,scenario_id,snapshot,decisions,day,created_at) VALUES (?,?,?,?::jsonb,?::jsonb,?,?)",
                p.id(), p.userId(), p.scenarioId(), json.escribir(p.snapshot()), json.escribir(p.decisions()), p.day(), Timestamp.from(p.createdAt()));
    }
    @Override public void avanzar(int expectedDay, Partida p) {
        int changed = jdbc.update("UPDATE simulation_runs SET day = ?, decisions = ?::jsonb WHERE id = ? AND user_id = ? AND day = ?",
                p.day(), json.escribir(p.decisions()), p.id(), p.userId(), expectedDay);
        if (changed != 1) throw new Fallo(Fallo.Tipo.CONFLICTO, "La decisión ya fue procesada.");
        if (p.result() != null) {
            var r = p.result();
            jdbc.update("INSERT INTO simulation_results(id,simulation_id,score,profit,service_rate,feedback,timeline,created_at) VALUES (?,?,?,?,?,?,?::jsonb,?)",
                    r.id(), r.simulationId(), r.score(), r.profit(), r.serviceRate(), r.feedback(), json.escribir(r.timeline()), Timestamp.from(r.createdAt()));
        }
    }
    private Partida mapear(ResultSet rs, int row) throws SQLException {
        ResultadoSimulacion result = rs.getString("result_id") == null ? null : new ResultadoSimulacion(
                rs.getString("result_id"), rs.getString("id"), rs.getInt("score"), rs.getDouble("profit"),
                rs.getDouble("service_rate"), rs.getString("feedback"),
                json.leer(rs.getString("timeline"), new TypeReference<List<MotorInventario.Dia>>() { }), rs.getTimestamp("result_created_at").toInstant());
        return new Partida(rs.getString("id"), rs.getString("user_id"), rs.getString("scenario_id"),
                json.leer(rs.getString("snapshot"), ParametrosEscenario.class),
                json.leer(rs.getString("decisions"), new TypeReference<List<Integer>>() { }),
                rs.getInt("day"), rs.getTimestamp("created_at").toInstant(), result);
    }
    @Override public Resumen resumen(String userId) {
        return jdbc.queryForObject("""
            SELECT count(*) AS completed_count, coalesce(sum(r.score),0) AS score_total,
                   coalesce(bool_or(r.score>=70),false) AS has_passing_run, min(r.created_at) AS first_completed_at
            FROM simulation_results r JOIN simulation_runs p ON p.id=r.simulation_id WHERE p.user_id=?
            """,(rs,row)->new Resumen(userId,rs.getLong("completed_count"),rs.getLong("score_total"),rs.getBoolean("has_passing_run"),
                    rs.getTimestamp("first_completed_at")==null?null:rs.getTimestamp("first_completed_at").toInstant()),userId);
    }
}
