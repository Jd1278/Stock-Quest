package com.stockquest.simulacion.partidas.Infrastructure.persistence;

import com.stockquest.simulacion.Infrastructure.JsonPersistencia;
import com.stockquest.simulacion.partidas.Application.Outbox;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.Timestamp;
import java.util.Map;
import java.util.UUID;

public final class OutboxJdbc implements Outbox {
    private final JdbcTemplate jdbc;
    private final JsonPersistencia json;
    public OutboxJdbc(JdbcTemplate jdbc, JsonPersistencia json) { this.jdbc = jdbc; this.json = json; }
    @Override public void registrar(SimulacionFinalizada e) {
        var data = Map.of("simulationId", e.simulationId(), "userId", e.userId(), "scenarioId", e.scenarioId(),
                "score", e.score(), "profit", e.profit(), "serviceRate", e.serviceRate(), "completedAt", e.completedAt());
        var envelope = Map.of("eventId", e.eventId(), "type", "SimulacionFinalizada", "schemaVersion", 1,
                "producer", "simulacion-logistica", "occurredAt", e.completedAt(), "aggregateId", e.simulationId(),
                "aggregateVersion", e.aggregateVersion(), "correlationId", e.correlationId(), "data", data);
        jdbc.update("INSERT INTO simulation_outbox(event_id,aggregate_id,event_type,payload,created_at) VALUES (?,?,?,?::jsonb,?)",
                UUID.fromString(e.eventId()), e.simulationId(), "SimulacionFinalizada", json.escribir(envelope), Timestamp.from(e.completedAt()));
    }
}
