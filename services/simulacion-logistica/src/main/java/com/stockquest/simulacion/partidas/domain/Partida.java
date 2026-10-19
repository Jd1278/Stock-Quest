package com.stockquest.simulacion.partidas.domain;

import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.domain.ParametrosEscenario;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public record Partida(String id, String userId, String scenarioId, ParametrosEscenario snapshot,
        List<Integer> decisions, int day, Instant createdAt, ResultadoSimulacion result) {
    public Partida {
        decisions = List.copyOf(decisions);
        if (day != decisions.size() || day < 0 || day > snapshot.demand().size()) throw Fallo.invalido("Estado de partida inválido.");
    }
    public boolean finalizada() { return day >= snapshot.demand().size(); }
    public Partida avanzar(int expectedDay, int quantity) {
        if (day != expectedDay || result != null || finalizada())
            throw new Fallo(Fallo.Tipo.CONFLICTO, "El día ya fue procesado. Actualiza la simulación.");
        if (quantity < 0 || quantity > snapshot.maxOrder()) throw Fallo.invalido("Cantidad fuera del máximo del escenario.");
        var next = new ArrayList<>(decisions); next.add(quantity);
        return new Partida(id, userId, scenarioId, snapshot, next, day + 1, createdAt, null);
    }
    public Partida conResultado(ResultadoSimulacion value) {
        if (!finalizada() || result != null || !id.equals(value.simulationId())) throw Fallo.invalido("Resultado de partida inválido.");
        return new Partida(id, userId, scenarioId, snapshot, decisions, day, createdAt, value);
    }
}
