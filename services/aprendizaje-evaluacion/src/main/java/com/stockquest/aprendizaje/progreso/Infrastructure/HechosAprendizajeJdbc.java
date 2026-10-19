package com.stockquest.aprendizaje.progreso.Infrastructure;

import com.stockquest.aprendizaje.Application.HechosAprendizaje;
import com.stockquest.aprendizaje.Infrastructure.JsonPersistencia;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;

public final class HechosAprendizajeJdbc implements HechosAprendizaje {
    private final JdbcTemplate jdbc;private final JsonPersistencia json;
    public HechosAprendizajeJdbc(JdbcTemplate jdbc,JsonPersistencia json) {this.jdbc=jdbc;this.json=json;}
    @Override public void registrar(String userId,String tipo,Map<String,Object> data,Instant fecha,String correlationId) {
        long version=jdbc.queryForObject("INSERT INTO learning_versions VALUES (?,1) ON CONFLICT(user_id) DO UPDATE SET version=learning_versions.version+1 RETURNING version",Long.class,userId);
        String id=UUID.randomUUID().toString();
        var event=Map.of("eventId",id,"type",tipo,"schemaVersion",1,"producer","aprendizaje-evaluacion","occurredAt",fecha,
                "aggregateId",userId,"aggregateVersion",version,"correlationId",correlationId,"data",data);
        jdbc.update("INSERT INTO learning_outbox(event_id,user_id,aggregate_version,event_type,payload,created_at) VALUES (?::uuid,?,?,?,?::jsonb,?)",id,userId,version,tipo,json.escribir(event),Timestamp.from(fecha));
    }
}
