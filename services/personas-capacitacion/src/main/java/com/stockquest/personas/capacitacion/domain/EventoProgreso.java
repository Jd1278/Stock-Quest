package com.stockquest.personas.capacitacion.domain;

import java.time.Instant;
import java.util.UUID;

/** A complete report, not a delta. Newer versions can safely supersede missed deliveries. */
public record EventoProgreso(UUID eventId,String type,int schemaVersion,String producer,Instant occurredAt,
 String aggregateId,long aggregateVersion,String correlationId,InformeAprendizaje data) {
 public EventoProgreso {
  if(eventId==null||!"ProgresoActualizado".equals(type)||schemaVersion!=1||!"aprendizaje-evaluacion".equals(producer)
   ||occurredAt==null||aggregateId==null||aggregateId.isBlank()||aggregateId.length()>100||aggregateVersion<1
   ||correlationId==null||correlationId.isBlank()||correlationId.length()>100||data==null||!aggregateId.equals(data.userId()))
   throw new IllegalArgumentException("Snapshot de progreso inválido.");
 }
}
