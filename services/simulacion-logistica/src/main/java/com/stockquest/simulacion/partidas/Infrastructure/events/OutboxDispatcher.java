package com.stockquest.simulacion.partidas.Infrastructure.events;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@Component
@ConditionalOnProperty(name="simulation.events.enabled",havingValue="true")
public class OutboxDispatcher {
    private static final String CONSUMER="legacy-learning";
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final URI target;
    private final String token;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).followRedirects(HttpClient.Redirect.NEVER).build();
    record Entrega(UUID id,UUID lease,String payload,int attempts) { }
    public OutboxDispatcher(JdbcTemplate jdbc,PlatformTransactionManager manager,
            @Value("${simulation.events.target}") URI target,@Value("${simulation.events.token}") String token) {
        this.jdbc=jdbc;this.tx=new TransactionTemplate(manager);this.target=target;this.token=token;
        boolean local=Set.of("localhost","127.0.0.1","[::1]","::1").contains(target.getHost()==null?"":target.getHost());
        if(token.length()<32||token.length()>512||(!"https".equals(target.getScheme())&&!("http".equals(target.getScheme())&&local))
                ||target.getUserInfo()!=null||target.getQuery()!=null||target.getFragment()!=null||target.getHost()==null)
            throw new IllegalArgumentException("Configura destino HTTPS o loopback y credencial del consumidor de eventos.");
    }
    @Scheduled(fixedDelayString="${simulation.events.poll-ms:2000}")
    public void enviarPendientes() {
        List<Entrega> batch=tx.execute(status->{
            jdbc.update("""
                INSERT INTO simulation_outbox_deliveries(event_id,consumer)
                SELECT event_id,? FROM simulation_outbox WHERE status='PENDING' AND event_type='SimulacionFinalizada'
                ON CONFLICT DO NOTHING
                """,CONSUMER);
            var rows=jdbc.query("""
                SELECT d.event_id,d.attempts,e.payload::text AS payload
                FROM simulation_outbox_deliveries d JOIN simulation_outbox e ON e.event_id=d.event_id
                WHERE d.consumer=? AND d.status='PENDING' AND d.next_attempt_at<=CURRENT_TIMESTAMP
                  AND (d.leased_until IS NULL OR d.leased_until<CURRENT_TIMESTAMP)
                ORDER BY d.next_attempt_at LIMIT 10 FOR UPDATE OF d SKIP LOCKED
                """,(rs,row)->new Entrega(rs.getObject("event_id",UUID.class),UUID.randomUUID(),rs.getString("payload"),rs.getInt("attempts")),CONSUMER);
            for(var row:rows)jdbc.update("UPDATE simulation_outbox_deliveries SET leased_until=CURRENT_TIMESTAMP+INTERVAL '60 seconds',lease_token=? WHERE event_id=? AND consumer=?",
                    row.lease(),row.id(),CONSUMER);
            return rows;
        });
        if(batch==null)return;
        for(var delivery:batch) {
            int status;
            try {
                var req=HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(2)).header("Content-Type","application/json")
                        .header("X-StockQuest-Event-Token",token).POST(HttpRequest.BodyPublishers.ofString(delivery.payload())).build();
                status=client.send(req,HttpResponse.BodyHandlers.discarding()).statusCode();
            } catch(InterruptedException e) {Thread.currentThread().interrupt();return;}
              catch(java.io.IOException|IllegalArgumentException e) {status=0;}
            confirmar(delivery,status);
        }
    }
    void confirmar(Entrega delivery,int httpStatus) {
        boolean success=httpStatus>=200&&httpStatus<300;
        int attempts=delivery.attempts()+1;
        boolean permanent=Set.of(400,401,403,409,422).contains(httpStatus);
        String nextStatus=success?"DELIVERED":permanent||attempts>=10?"FAILED":"PENDING";
        int delay=new int[]{1,5,30,120,600}[Math.min(attempts-1,4)];
        tx.executeWithoutResult(status->{
            int changed=jdbc.update("""
                UPDATE simulation_outbox_deliveries SET attempts=?,status=?,next_attempt_at=CURRENT_TIMESTAMP+(? * INTERVAL '1 second'),
                leased_until=NULL,lease_token=NULL,last_error=? WHERE event_id=? AND consumer=? AND lease_token=? AND status='PENDING'
                """,attempts,nextStatus,delay,success?null:httpStatus==0?"NETWORK":"HTTP_"+httpStatus,delivery.id(),CONSUMER,delivery.lease());
            if(changed==0)return;
            jdbc.update("""
                UPDATE simulation_outbox SET status=CASE
                WHEN EXISTS(SELECT 1 FROM simulation_outbox_deliveries WHERE event_id=? AND status='FAILED') THEN 'FAILED'
                WHEN NOT EXISTS(SELECT 1 FROM simulation_outbox_deliveries WHERE event_id=? AND status<>'DELIVERED') THEN 'DELIVERED'
                ELSE 'PENDING' END WHERE event_id=?
                """,delivery.id(),delivery.id(),delivery.id());
        });
    }
}
