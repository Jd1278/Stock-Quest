package com.stockquest.aprendizaje.progreso.Application;

import com.stockquest.aprendizaje.Application.UnidadDeTrabajo;
import com.stockquest.aprendizaje.Application.HechosAprendizaje;
import com.stockquest.aprendizaje.progreso.domain.EventoSimulacion;

public final class RecibirSimulacion {
    private final RegistroProgreso registro;private final UnidadDeTrabajo tx;private final HechosAprendizaje hechos;
    public RecibirSimulacion(RegistroProgreso registro,UnidadDeTrabajo tx,HechosAprendizaje hechos) {this.registro=registro;this.tx=tx;this.hechos=hechos;}
    public void ejecutar(EventoSimulacion evento,String hash) {
        tx.ejecutar(()->{
            registro.bloquearUsuario(evento.data().userId());
            if(registro.registrarEvento(evento.eventId().toString(),evento.data().simulationId(),evento.data().userId(),hash)) {
                registro.logro(evento.data().userId(),"PRIMERA_SIMULACION",evento.data().completedAt());
                hechos.registrar(evento.data().userId(),"ResultadoSimulacionRegistrado",java.util.Map.of("userId",evento.data().userId(),"simulationId",evento.data().simulationId()),evento.occurredAt(),evento.correlationId());
            }
            return null;
        });
    }
}
