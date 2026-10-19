package com.stockquest.aprendizaje.evaluaciones.Infrastructure;

import com.stockquest.aprendizaje.evaluaciones.Application.Intentos;
import com.stockquest.aprendizaje.evaluaciones.domain.Intento;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.Timestamp;
import java.util.List;

public final class IntentosJdbc implements Intentos {
    private final JdbcTemplate jdbc;
    public IntentosJdbc(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    @Override public List<Intento> delUsuario(String id) {
        return jdbc.query("SELECT * FROM learning_attempts WHERE user_id=? ORDER BY created_at,id",(rs,n)->new Intento(rs.getString("id"),id,rs.getString("challenge_id"),rs.getInt("answer"),rs.getInt("score"),rs.getTimestamp("created_at").toInstant()),id);
    }
    @Override public int registrar(Intento a) {
        jdbc.update("INSERT INTO learning_attempts VALUES (?,?,?,?,?,?)",a.id(),a.userId(),a.challengeId(),a.answer(),a.score(),Timestamp.from(a.createdAt()));
        return jdbc.queryForObject("SELECT count(*) FROM learning_attempts WHERE user_id=? AND challenge_id=?",Integer.class,a.userId(),a.challengeId());
    }
}
