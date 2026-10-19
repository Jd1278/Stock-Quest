package com.stockquest.aprendizaje.progreso.Application;

import com.stockquest.aprendizaje.progreso.domain.EstadoProgreso;
import java.time.Instant;

public interface RegistroProgreso {
    EstadoProgreso estado(String userId);
    void bloquearUsuario(String userId);
    boolean completar(String userId,String lessonId,Instant fecha);
    void logro(String userId,String key,Instant fecha);
    boolean registrarEvento(String eventId,String simulationId,String userId,String hash);
}
