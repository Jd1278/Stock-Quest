package com.stockquest.aprendizaje.progreso.domain;

import com.stockquest.aprendizaje.domain.Fallo;
import java.time.Instant;
import java.util.UUID;

public record EventoSimulacion(UUID eventId,String type,int schemaVersion,String producer,Instant occurredAt,String aggregateId,
                               int aggregateVersion,String correlationId,Datos data) {
    public record Datos(String simulationId,String userId,String scenarioId,int score,double profit,double serviceRate,Instant completedAt) {
        public Datos {
            id(simulationId);id(userId);id(scenarioId);
            if(score<0||score>100||!Double.isFinite(profit)||!Double.isFinite(serviceRate)||serviceRate<0||serviceRate>1||completedAt==null)throw Fallo.invalido("Evento de simulación inválido.");
        }
    }
    public EventoSimulacion {
        id(aggregateId);id(correlationId);
        if(eventId==null||!"SimulacionFinalizada".equals(type)||schemaVersion!=1||!"simulacion-logistica".equals(producer)||occurredAt==null
                ||aggregateVersion<1||data==null||!aggregateId.equals(data.simulationId()))throw Fallo.invalido("Evento de simulación inválido.");
    }
    private static void id(String id) {if(id==null||id.isBlank()||id.length()>100)throw Fallo.invalido("Identificador de evento inválido.");}
}
