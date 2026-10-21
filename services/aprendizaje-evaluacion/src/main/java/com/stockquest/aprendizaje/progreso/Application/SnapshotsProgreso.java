package com.stockquest.aprendizaje.progreso.Application;
import java.time.Instant;
import java.util.UUID;
public interface SnapshotsProgreso {
 record Evento(UUID eventId,String type,int schemaVersion,String producer,Instant occurredAt,String aggregateId,long aggregateVersion,String correlationId,ConsultarProgreso.Informe data) { }
 Evento capturar(String userId);
 void reintentar(String userId);
}
