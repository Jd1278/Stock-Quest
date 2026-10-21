package com.stockquest.aprendizaje.progreso.Infrastructure;
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

@Component @ConditionalOnProperty(name="learning.progress.enabled",havingValue="true")
public class ProgresoOutboxDispatcher {
 private final JdbcTemplate jdbc;private final TransactionTemplate tx;private final SnapshotsProgresoJdbc snapshots;
 private final URI target;private final String token;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).followRedirects(HttpClient.Redirect.NEVER).build();
 record Entrega(UUID id,UUID lease,String payload,int attempts) { }
 public ProgresoOutboxDispatcher(JdbcTemplate j,PlatformTransactionManager manager,SnapshotsProgresoJdbc snapshots,
  @Value("${learning.progress.target}") URI target,@Value("${learning.progress.token}") String token) {
  jdbc=j;tx=new TransactionTemplate(manager);this.snapshots=snapshots;this.target=target;this.token=token;
  boolean local=Set.of("localhost","127.0.0.1","[::1]").contains(target.getHost()==null?"":target.getHost());
  if(token.length()<32||target.getHost()==null||(!"https".equals(target.getScheme())&&!("http".equals(target.getScheme())&&local))||target.getUserInfo()!=null||target.getQuery()!=null||target.getFragment()!=null||!"/internal/progress-events".equals(target.getPath()))throw new IllegalArgumentException("Destino de proyecciones inválido.");
 }
 @Scheduled(fixedDelayString="${learning.progress.poll-ms:2000}")
 public void enviarPendientes() {
  // New facts wake the projection promptly; periodic refresh also covers catalogue changes.
  jdbc.update("""
   INSERT INTO learning_progress_refresh_queue(user_id)
   SELECT user_id FROM (
    SELECT f.user_id FROM learning_outbox f LEFT JOIN learning_progress_snapshots s ON s.user_id=f.user_id
     GROUP BY f.user_id,s.covered_fact_version HAVING MAX(f.aggregate_version)>COALESCE(s.covered_fact_version,0)
    UNION SELECT user_id FROM learning_progress_snapshots WHERE refresh_after<=CURRENT_TIMESTAMP
   ) candidates ON CONFLICT DO NOTHING
   """);
  var dirty=jdbc.queryForList("SELECT user_id FROM learning_progress_refresh_queue WHERE next_attempt_at<=CURRENT_TIMESTAMP ORDER BY next_attempt_at,user_id LIMIT 5",String.class);
  for(String id:dirty)try{
   snapshots.refrescar(id);jdbc.update("DELETE FROM learning_progress_refresh_queue WHERE user_id=?",id);
  }catch(RuntimeException e){
   jdbc.update("UPDATE learning_progress_refresh_queue SET attempts=attempts+1,next_attempt_at=CURRENT_TIMESTAMP+INTERVAL '5 seconds',last_error=? WHERE user_id=?",e.getClass().getSimpleName(),id);
  }
  var deliveries=tx.execute(status->{
   var rows=jdbc.query("""
    SELECT event_id,payload::text,attempts FROM learning_progress_outbox
    WHERE status='PENDING' AND next_attempt_at<=CURRENT_TIMESTAMP AND (leased_until IS NULL OR leased_until<CURRENT_TIMESTAMP)
    ORDER BY next_attempt_at LIMIT 5 FOR UPDATE SKIP LOCKED
    """,(rs,n)->new Entrega(rs.getObject(1,UUID.class),UUID.randomUUID(),rs.getString(2),rs.getInt(3)));
   for(var row:rows)jdbc.update("UPDATE learning_progress_outbox SET leased_until=CURRENT_TIMESTAMP+INTERVAL '60 seconds',lease_token=? WHERE event_id=?",row.lease(),row.id());return rows;
  });
  if(deliveries==null)return;
  for(var row:deliveries) {
   int code;
   try {code=client.send(HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(2)).header("Content-Type","application/json").header("X-StockQuest-Service-Token",token)
    .POST(HttpRequest.BodyPublishers.ofString(row.payload())).build(),HttpResponse.BodyHandlers.discarding()).statusCode();}
   catch(InterruptedException e){Thread.currentThread().interrupt();return;}
   catch(java.io.IOException|IllegalArgumentException e){code=0;}
   confirmar(row,code);
  }
 }
 void confirmar(Entrega row,int code) {
  boolean success=code==204;int attempts=row.attempts()+1;
  String state=success?"DELIVERED":Set.of(400,401,403,404,409,422).contains(code)||attempts>=10?"FAILED":"PENDING";
  int delay=new int[]{1,5,30,120,600}[Math.min(attempts-1,4)];
  tx.executeWithoutResult(status->{
   int changed=jdbc.update("""
    UPDATE learning_progress_outbox SET status=?,attempts=?,next_attempt_at=CURRENT_TIMESTAMP+(? * INTERVAL '1 second'),
     leased_until=NULL,lease_token=NULL,last_error=? WHERE event_id=? AND lease_token=? AND status='PENDING'
    """,state,attempts,delay,success?null:code==0?"NETWORK":"HTTP_"+code,row.id(),row.lease());
   if(changed==1&&success)jdbc.update("""
    UPDATE learning_outbox f SET status='DELIVERED' FROM learning_progress_outbox d
    WHERE d.event_id=? AND f.user_id=d.user_id AND f.aggregate_version<=d.covered_fact_version
    """,row.id());
  });
 }
}
