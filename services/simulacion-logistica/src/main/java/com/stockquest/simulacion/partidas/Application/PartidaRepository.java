package com.stockquest.simulacion.partidas.Application;

import com.stockquest.simulacion.partidas.domain.Partida;
import java.util.List;
import java.util.Optional;
import java.time.Instant;

public interface PartidaRepository {
    Optional<Partida> propia(String id, String userId);
    record RegistroHistorial(Partida partida, String scenarioTitle) { }
    List<RegistroHistorial> historial(String userId);
    void crear(Partida partida);
    void avanzar(int expectedDay, Partida partida);
    record Resumen(String userId,long completedCount,long scoreTotal,boolean hasPassingRun,Instant firstCompletedAt) { }
    Resumen resumen(String userId);
}
