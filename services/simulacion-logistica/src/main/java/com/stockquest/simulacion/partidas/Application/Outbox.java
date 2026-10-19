package com.stockquest.simulacion.partidas.Application;

import java.time.Instant;

public interface Outbox {
    record SimulacionFinalizada(String eventId, String simulationId, String userId, String scenarioId,
            int score, double profit, double serviceRate, Instant completedAt, int aggregateVersion, String correlationId) { }
    void registrar(SimulacionFinalizada evento);
}
