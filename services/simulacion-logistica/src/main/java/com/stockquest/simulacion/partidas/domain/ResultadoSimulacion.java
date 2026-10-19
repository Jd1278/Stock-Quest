package com.stockquest.simulacion.partidas.domain;

import java.time.Instant;
import java.util.List;

public record ResultadoSimulacion(String id, String simulationId, int score, double profit, double serviceRate,
        String feedback, List<MotorInventario.Dia> timeline, Instant createdAt) {
    public ResultadoSimulacion { timeline = List.copyOf(timeline); }
}
