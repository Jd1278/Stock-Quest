package com.stockquest.simulacion.partidas.Application;

import com.stockquest.simulacion.Application.UnidadDeTrabajo;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.domain.UsuarioAutenticado;
import com.stockquest.simulacion.partidas.domain.*;
import java.time.Clock;
import java.util.UUID;

public final class RegistrarDecision {
    private final PartidaRepository partidas;
    private final UnidadDeTrabajo transacciones;
    private final Outbox outbox;
    private final Clock clock;
    public RegistrarDecision(PartidaRepository partidas, UnidadDeTrabajo transacciones, Outbox outbox, Clock clock) {
        this.partidas = partidas; this.transacciones = transacciones; this.outbox = outbox; this.clock = clock;
    }
    public Partida ejecutar(UsuarioAutenticado usuario, String id, int day, int quantity, String correlationId) {
        usuario.exigirAprendiz();
        return transacciones.ejecutar(() -> {
            Partida current = partidas.propia(id, usuario.id()).orElseThrow(() -> new Fallo(Fallo.Tipo.NO_ENCONTRADO, "Simulación no encontrada."));
            Partida next = current.avanzar(day, quantity);
            if (next.finalizada()) {
                var evaluation = MotorInventario.evaluar(next.snapshot(), next.decisions());
                next = next.conResultado(new ResultadoSimulacion(UUID.randomUUID().toString(), id, evaluation.score(),
                        evaluation.profit(), evaluation.serviceRate(), evaluation.feedback(), evaluation.timeline(), clock.instant()));
            }
            partidas.avanzar(day, next);
            if (next.result() != null) {
                var r = next.result();
                outbox.registrar(new Outbox.SimulacionFinalizada(UUID.randomUUID().toString(), id, usuario.id(), next.scenarioId(),
                        r.score(), r.profit(), r.serviceRate(), r.createdAt(), next.day(), correlationId));
            }
            return next;
        });
    }
}
