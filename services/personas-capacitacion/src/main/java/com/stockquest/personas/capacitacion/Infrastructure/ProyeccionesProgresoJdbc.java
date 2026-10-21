package com.stockquest.personas.capacitacion.Infrastructure;
import com.stockquest.personas.capacitacion.Application.ProyeccionesProgreso;
import com.stockquest.personas.capacitacion.domain.*;
import com.stockquest.personas.Infrastructure.JsonPersistencia;
import com.stockquest.personas.domain.Fallo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

public final class ProyeccionesProgresoJdbc implements ProyeccionesProgreso {
 private final JdbcTemplate jdbc;private final TransactionTemplate tx;private final JsonPersistencia json;
 public ProyeccionesProgresoJdbc(JdbcTemplate j,PlatformTransactionManager manager,JsonPersistencia json) {jdbc=j;tx=new TransactionTemplate(manager);this.json=json;}
 @Override public void recibir(EventoProgreso e) {
  final String hash;
  try {hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.escribir(e).getBytes(StandardCharsets.UTF_8)));}
  catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
  tx.executeWithoutResult(status->{
   jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,1))",rs->{},e.aggregateId());
   if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM people_users WHERE id=?)",Boolean.class,e.aggregateId())))
    throw new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Usuario de la proyección no encontrado.");
   var previous=jdbc.queryForList("SELECT payload_hash FROM people_progress_inbox WHERE event_id=? OR (user_id=? AND aggregate_version=?)",e.eventId(),e.aggregateId(),e.aggregateVersion());
   if(!previous.isEmpty()&&(previous.size()!=1||!hash.equals(previous.getFirst().get("payload_hash"))))
    throw new Fallo(Fallo.Tipo.CONFLICTO,"Evento o versión reutilizados con otro contenido.");
   if(previous.isEmpty())jdbc.update("INSERT INTO people_progress_inbox(event_id,user_id,aggregate_version,payload_hash) VALUES (?,?,?,?)",e.eventId(),e.aggregateId(),e.aggregateVersion(),hash);
   long newest=jdbc.queryForObject("SELECT MAX(aggregate_version) FROM people_progress_inbox WHERE user_id=?",Long.class,e.aggregateId());
   if(e.aggregateVersion()<newest)return;
   // Even an already received event can reconstruct a deleted derived row. Older events never regress it.
   jdbc.update("""
    INSERT INTO people_progress_projections(user_id,aggregate_version,event_id,payload) VALUES (?,?,?,?::jsonb)
    ON CONFLICT(user_id) DO UPDATE SET aggregate_version=excluded.aggregate_version,event_id=excluded.event_id,
      payload=excluded.payload,projected_at=CURRENT_TIMESTAMP
    WHERE people_progress_projections.aggregate_version<excluded.aggregate_version
    """,e.aggregateId(),e.aggregateVersion(),e.eventId(),json.escribir(e.data()));
  });
 }
 @Override public Optional<InformeAprendizaje> consultar(String userId) {
  return jdbc.query("SELECT payload::text FROM people_progress_projections WHERE user_id=?",(rs,n)->json.leer(rs.getString(1),InformeAprendizaje.class),userId).stream().findFirst();
 }
}
