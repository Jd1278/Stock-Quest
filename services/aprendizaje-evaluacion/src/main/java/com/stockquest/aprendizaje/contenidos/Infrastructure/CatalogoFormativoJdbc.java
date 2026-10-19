package com.stockquest.aprendizaje.contenidos.Infrastructure;

import com.stockquest.aprendizaje.contenidos.Application.CatalogoFormativo;
import com.stockquest.aprendizaje.contenidos.domain.ContenidoFormativo.*;
import com.stockquest.aprendizaje.Infrastructure.JsonPersistencia;
import com.stockquest.aprendizaje.domain.Fallo;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

public final class CatalogoFormativoJdbc implements CatalogoFormativo {
    private final JdbcTemplate jdbc;private final JsonPersistencia json;
    public CatalogoFormativoJdbc(JdbcTemplate jdbc,JsonPersistencia json) {this.jdbc=jdbc;this.json=json;}
    @Override public List<Modulo> modulos(boolean all) {
        return jdbc.query("SELECT * FROM learning_modules WHERE (? OR published) ORDER BY position",(rs,n)->new Modulo(rs.getString("id"),rs.getString("title"),rs.getString("description"),
                rs.getInt("position"),rs.getBoolean("published"),lecciones(rs.getString("id"))),all);
    }
    private List<Leccion> lecciones(String moduleId) {
        return jdbc.query("SELECT * FROM learning_lessons WHERE module_id=? ORDER BY position",(rs,n)->leccion(rs.getString("id"),rs.getString("module_id"),rs.getString("title"),rs.getString("body"),rs.getInt("position"),rs.getInt("minutes")),moduleId);
    }
    private Leccion leccion(String id,String moduleId,String title,String body,int position,int minutes) {
        var videos=jdbc.query("SELECT * FROM learning_contents WHERE lesson_id=? ORDER BY id",(rs,n)->new Video(rs.getString("id"),id,rs.getString("title"),rs.getString("youtube_id")),id);
        var questions=jdbc.query("SELECT * FROM learning_challenges WHERE lesson_id=? ORDER BY id",(rs,n)->new Pregunta(rs.getString("id"),id,rs.getString("question"),json.leer(rs.getString("options"),new TypeReference<List<String>>(){}),rs.getInt("correct_index"),rs.getString("explanation")),id);
        return new Leccion(id,moduleId,title,body,position,minutes,videos,questions);
    }
    @Override public Optional<Pregunta> pregunta(String id) {
        return jdbc.query("SELECT * FROM learning_challenges WHERE id=?",(rs,n)->new Pregunta(id,rs.getString("lesson_id"),rs.getString("question"),json.leer(rs.getString("options"),new TypeReference<List<String>>(){}),rs.getInt("correct_index"),rs.getString("explanation")),id).stream().findFirst();
    }
    @Override public Modulo guardarModulo(String id,String title,String description,int position,boolean published) {
        if(id==null) {
            id=UUID.randomUUID().toString();
            jdbc.update("INSERT INTO learning_modules VALUES (?,?,?,?,?)",id,title,description,position,published);
        } else if(jdbc.update("UPDATE learning_modules SET title=?,description=?,position=?,published=? WHERE id=?",title,description,position,published,id)!=1)throw missing();
        return new Modulo(id,title,description,position,published,List.of());
    }
    @Override public Leccion guardarLeccion(String id,String moduleId,String title,String body,int position,int minutes,String youtubeId) {
        if(id==null) {
            id=UUID.randomUUID().toString();
            jdbc.update("INSERT INTO learning_lessons VALUES (?,?,?,?,?,?)",id,moduleId,title,body,position,minutes);
        } else if(jdbc.update("UPDATE learning_lessons SET module_id=?,title=?,body=?,position=?,minutes=? WHERE id=?",moduleId,title,body,position,minutes,id)!=1)throw missing();
        jdbc.update("DELETE FROM learning_contents WHERE lesson_id=?",id);
        if(youtubeId!=null)jdbc.update("INSERT INTO learning_contents VALUES (?,?,?,?)",UUID.randomUUID().toString(),id,title,youtubeId);
        return new Leccion(id,moduleId,title,body,position,minutes,List.of(),List.of());
    }
    @Override public Pregunta guardarPregunta(String id,String lessonId,String question,List<String> options,int correctIndex,String explanation) {
        if(id==null) {
            id=UUID.randomUUID().toString();
            jdbc.update("INSERT INTO learning_challenges VALUES (?,?,?,?::jsonb,?,?)",id,lessonId,question,json.escribir(options),correctIndex,explanation);
        } else if(jdbc.update("UPDATE learning_challenges SET lesson_id=?,question=?,options=?::jsonb,correct_index=?,explanation=? WHERE id=?",lessonId,question,json.escribir(options),correctIndex,explanation,id)!=1)throw missing();
        return new Pregunta(id,lessonId,question,options,correctIndex,explanation);
    }
    private static Fallo missing() {return new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Registro no encontrado.");}
}
