package com.stockquest.aprendizaje.progreso.Infrastructure;

import com.stockquest.aprendizaje.progreso.Application.RegistroProgreso;
import com.stockquest.aprendizaje.progreso.domain.EstadoProgreso;
import com.stockquest.aprendizaje.domain.Fallo;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

public final class RegistroProgresoJdbc implements RegistroProgreso {
    private final JdbcTemplate jdbc;
    public RegistroProgresoJdbc(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    @Override public EstadoProgreso estado(String userId) {
        return new EstadoProgreso(new HashSet<>(jdbc.queryForList("SELECT lesson_id FROM learning_progress WHERE user_id=?",String.class,userId)),
                jdbc.query("SELECT * FROM learning_achievements WHERE user_id=? ORDER BY earned_at,key",(rs,n)->new EstadoProgreso.Logro(userId,rs.getString("key"),rs.getTimestamp("earned_at").toInstant()),userId));
    }
    @Override public void bloquearUsuario(String id) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",rs->{},id);
    }
    @Override public boolean completar(String userId,String lessonId,Instant date) {
        return jdbc.update("INSERT INTO learning_progress VALUES (?,?,?) ON CONFLICT(user_id,lesson_id) DO NOTHING",userId,lessonId,Timestamp.from(date))==1;
    }
    @Override public void logro(String userId,String key,Instant date) {
        jdbc.update("INSERT INTO learning_achievements VALUES (?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET earned_at=LEAST(learning_achievements.earned_at,excluded.earned_at)",userId,key,Timestamp.from(date));
    }
    @Override public boolean registrarEvento(String eventId,String simulationId,String userId,String hash) {
        int inserted=jdbc.update("INSERT INTO learning_simulation_inbox(event_id,simulation_id,user_id,payload_hash) VALUES (?::uuid,?,?,?) ON CONFLICT DO NOTHING",eventId,simulationId,userId,hash);
        if(inserted==1)return true;
        var previous=jdbc.queryForList("SELECT event_id::text,simulation_id,user_id,payload_hash FROM learning_simulation_inbox WHERE event_id=?::uuid OR simulation_id=?",eventId,simulationId);
        if(previous.size()!=1||!hash.equals(previous.getFirst().get("payload_hash")))throw new Fallo(Fallo.Tipo.CONFLICTO,"Identificador de evento reutilizado con otro contenido.");
        return false;
    }
}
