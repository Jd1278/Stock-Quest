package com.stockquest.aprendizaje.progreso.domain;

import java.time.Instant;
import java.util.*;

public record EstadoProgreso(Set<String> completadas,List<Logro> logros) {
    public EstadoProgreso { completadas=Set.copyOf(completadas); logros=List.copyOf(logros); }
    public record Logro(String userId,String key,Instant earnedAt) { }
    public record ResumenSimulacion(String userId,long completedCount,long scoreTotal,boolean hasPassingRun,Instant firstCompletedAt) { }
}
