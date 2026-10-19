package com.stockquest.personas.Infrastructure;

import com.stockquest.personas.Application.HechosPersonas;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.*;

public final class HechosPersonasJdbc implements HechosPersonas {
 private final JdbcTemplate jdbc;private final JsonPersistencia json;private final Clock clock;
 public HechosPersonasJdbc(JdbcTemplate jdbc,JsonPersistencia json,Clock clock) {this.jdbc=jdbc;this.json=json;this.clock=clock;}
 @Override public void registrar(String aggregateId,String type,Map<String,Object> data,String correlationId) {
  long version=jdbc.queryForObject("INSERT INTO people_versions VALUES (?,1) ON CONFLICT(aggregate_id) DO UPDATE SET version=people_versions.version+1 RETURNING version",Long.class,aggregateId);
  var id=UUID.randomUUID();var now=clock.instant();
  var event=Map.of("eventId",id,"type",type,"schemaVersion",1,"producer","personas-capacitacion","occurredAt",now,"aggregateId",aggregateId,"aggregateVersion",version,"correlationId",correlationId,"data",data);
  jdbc.update("INSERT INTO people_outbox(event_id,aggregate_id,aggregate_version,event_type,payload,created_at) VALUES (?,?,?,?,?::jsonb,?)",id,aggregateId,version,type,json.escribir(event),Timestamp.from(now));
 }
}
