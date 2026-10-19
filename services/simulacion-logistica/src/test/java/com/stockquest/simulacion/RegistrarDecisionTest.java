package com.stockquest.simulacion;

import com.stockquest.simulacion.Application.UnidadDeTrabajo;
import com.stockquest.simulacion.domain.*;
import com.stockquest.simulacion.partidas.Application.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistrarDecisionTest {
    private final PartidaRepository repo = mock(PartidaRepository.class);
    private final Outbox outbox = mock(Outbox.class);
    private final UnidadDeTrabajo tx = new UnidadDeTrabajo() { public <T> T ejecutar(Supplier<T> work) { return work.get(); } };
    private final RegistrarDecision useCase = new RegistrarDecision(repo,tx,outbox,Clock.fixed(Instant.parse("2026-10-18T15:00:00Z"),ZoneOffset.UTC));
    @Test void cierreGuardaResultadoYEvento() {
        when(repo.propia("run-1","learner-1")).thenReturn(Optional.of(Fixtures.partida(List.of(10,0))));
        var next=useCase.ejecutar(Fixtures.aprendiz(),"run-1",2,0,"request-1");
        assertNotNull(next.result()); assertEquals(6,next.result().profit());
        verify(repo).avanzar(2,next);
        var captor=ArgumentCaptor.forClass(Outbox.SimulacionFinalizada.class);
        verify(outbox).registrar(captor.capture());
        assertEquals("run-1",captor.getValue().simulationId()); assertEquals(86,captor.getValue().score());
        assertEquals(3,captor.getValue().aggregateVersion()); assertEquals("request-1",captor.getValue().correlationId());
    }
    @Test void partidaAjenaNoSeEscribe() {
        when(repo.propia("run-1","learner-1")).thenReturn(Optional.empty());
        assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->useCase.ejecutar(Fixtures.aprendiz(),"run-1",0,1,"r")).tipo());
        verify(repo,never()).avanzar(anyInt(),any()); verifyNoInteractions(outbox);
    }
    @Test void liderNoPuedeRegistrarDecision() {
        var leader=new UsuarioAutenticado("leader",UsuarioAutenticado.Rol.LIDER);
        assertEquals(Fallo.Tipo.PROHIBIDO,assertThrows(Fallo.class,()->useCase.ejecutar(leader,"run-1",0,1,"r")).tipo());
        verifyNoInteractions(repo,outbox);
    }
    @Test void diaIntermedioNoPublicaEvento() {
        when(repo.propia("run-1","learner-1")).thenReturn(Optional.of(Fixtures.partida(List.of())));
        assertNull(useCase.ejecutar(Fixtures.aprendiz(),"run-1",0,10,"r").result()); verifyNoInteractions(outbox);
    }
}
