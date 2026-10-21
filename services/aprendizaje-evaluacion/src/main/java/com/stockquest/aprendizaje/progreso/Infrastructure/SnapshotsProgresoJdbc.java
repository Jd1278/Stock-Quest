package com.stockquest.aprendizaje.progreso.Infrastructure;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.Infrastructure.JsonPersistencia;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.TransientDataAccessException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

public final class SnapshotsProgresoJdbc implements SnapshotsProgreso {
 private final JdbcTemplate jdbc;private final TransactionTemplate tx;private final ConsultarProgreso consultar;private final JsonPersistencia json;
 public SnapshotsProgresoJdbc(JdbcTemplate jdbc,PlatformTransactionManager manager,ConsultarProgreso consultar,JsonPersistencia json) {
  this.jdbc=jdbc;this.consultar=consultar;this.json=json;tx=new TransactionTemplate(manager);tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
 }
 @Override public Evento capturar(String id) {return capturar(id,true);}
 public Evento refrescar(String id) {return capturar(id,false);}
 private Evento capturar(String id,boolean crear) {
  if(id==null||id.isBlank()||id.length()>100)throw new IllegalArgumentException("Usuario inválido.");
  for(int attempt=0;;attempt++)try {return tx.execute(status->{
   jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",rs->{},id);
   var old=jdbc.queryForList("SELECT * FROM learning_progress_snapshots WHERE user_id=?",id);
   long covered=jdbc.queryForObject("SELECT COALESCE(MAX(aggregate_version),0) FROM learning_outbox WHERE user_id=?",Long.class,id);
   if(!crear&&old.isEmpty()&&covered==0)return null;
   var report=consultar.informe(id);
   if(report==null||!id.equals(report.userId()))throw new IllegalStateException("La fuente devolvió otro usuario.");
   String hash=hash(json.escribir(report));
   if(!old.isEmpty()&&hash.equals(old.getFirst().get("payload_hash"))) {
    jdbc.update("UPDATE learning_progress_snapshots SET covered_fact_version=?,refresh_after=CURRENT_TIMESTAMP+INTERVAL '30 seconds' WHERE user_id=?",covered,id);
    UUID eventId=(UUID)old.getFirst().get("event_id");
    jdbc.update("UPDATE learning_progress_outbox SET covered_fact_version=? WHERE event_id=?",covered,eventId);
    // No visible change still covers the facts once this immutable snapshot has been acknowledged.
    jdbc.update("UPDATE learning_outbox SET status='DELIVERED' WHERE user_id=? AND aggregate_version<=? AND EXISTS(SELECT 1 FROM learning_progress_outbox WHERE event_id=? AND status='DELIVERED')",id,covered,eventId);
    return json.leer(old.getFirst().get("payload").toString(),Evento.class);
   }
   long version=old.isEmpty()?1:Math.addExact(((Number)old.getFirst().get("aggregate_version")).longValue(),1);
   var event=new Evento(UUID.randomUUID(),"ProgresoActualizado",1,"aprendizaje-evaluacion",Instant.now(),id,version,"progress-"+UUID.randomUUID(),report);
   String payload=json.escribir(event);
   jdbc.update("""
    INSERT INTO learning_progress_snapshots(user_id,aggregate_version,event_id,payload_hash,payload,covered_fact_version,refresh_after)
    VALUES (?,?,?,?,?::jsonb,?,CURRENT_TIMESTAMP+INTERVAL '30 seconds')
    ON CONFLICT(user_id) DO UPDATE SET aggregate_version=excluded.aggregate_version,event_id=excluded.event_id,
     payload_hash=excluded.payload_hash,payload=excluded.payload,covered_fact_version=excluded.covered_fact_version,refresh_after=excluded.refresh_after
    """,id,version,event.eventId(),hash,payload,covered);
   jdbc.update("INSERT INTO learning_progress_outbox(event_id,user_id,aggregate_version,payload,covered_fact_version) VALUES (?,?,?,?::jsonb,?)",event.eventId(),id,version,payload,covered);
   return event;
  });}catch(TransientDataAccessException e){if(attempt>=2)throw e;}
 }
 @Override public void reintentar(String id) {
  jdbc.update("UPDATE learning_progress_outbox SET status='PENDING',attempts=0,next_attempt_at=CURRENT_TIMESTAMP,leased_until=NULL,lease_token=NULL,last_error=NULL WHERE event_id=(SELECT event_id FROM learning_progress_snapshots WHERE user_id=?) AND (leased_until IS NULL OR leased_until<CURRENT_TIMESTAMP)",id);
 }
 private static String hash(String value) {
  try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
  catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
 }
}
