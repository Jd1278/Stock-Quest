package com.stockquest.simulacion.partidas.Infrastructure.events;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import java.net.URI;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OutboxDispatcherTest {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final PlatformTransactionManager manager=mock(PlatformTransactionManager.class);
    private OutboxDispatcher dispatcher() {
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(jdbc.update(anyString(),any(Object[].class))).thenReturn(1);
        return new OutboxDispatcher(jdbc,manager,URI.create("http://127.0.0.1:4000/internal/events"),"phase5-events-token-for-unit-tests-only");
    }
    @Test void exitoConfirmaEntregaTrasAck() {
        var e=new OutboxDispatcher.Entrega(UUID.randomUUID(),UUID.randomUUID(),"{}",0);dispatcher().confirmar(e,204);
        verify(jdbc).update(contains("UPDATE simulation_outbox_deliveries"),eq(1),eq("DELIVERED"),eq(1),isNull(),eq(e.id()),eq("legacy-learning"),eq(e.lease()));
        verify(manager).commit(any());
    }
    @Test void falloTemporalProgramaReintentoConMismoEvento() {
        var e=new OutboxDispatcher.Entrega(UUID.randomUUID(),UUID.randomUUID(),"{}",1);dispatcher().confirmar(e,503);
        verify(jdbc).update(contains("UPDATE simulation_outbox_deliveries"),eq(2),eq("PENDING"),eq(5),eq("HTTP_503"),eq(e.id()),eq("legacy-learning"),eq(e.lease()));
    }
    @Test void credencialInvalidaEsFalloPermanente() {
        var e=new OutboxDispatcher.Entrega(UUID.randomUUID(),UUID.randomUUID(),"{}",0);dispatcher().confirmar(e,401);
        verify(jdbc).update(contains("UPDATE simulation_outbox_deliveries"),eq(1),eq("FAILED"),eq(1),eq("HTTP_401"),eq(e.id()),eq("legacy-learning"),eq(e.lease()));
    }
    @Test void agotarDiezIntentosNoPierdeElEvento() {
        var e=new OutboxDispatcher.Entrega(UUID.randomUUID(),UUID.randomUUID(),"{}",9);dispatcher().confirmar(e,0);
        verify(jdbc).update(contains("UPDATE simulation_outbox_deliveries"),eq(10),eq("FAILED"),eq(600),eq("NETWORK"),eq(e.id()),eq("legacy-learning"),eq(e.lease()));
    }
}
