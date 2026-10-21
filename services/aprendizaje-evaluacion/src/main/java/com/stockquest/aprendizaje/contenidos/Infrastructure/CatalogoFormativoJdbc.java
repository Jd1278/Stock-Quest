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
        // Each result set closes before another query starts; the catalog uses at most four queries.
        var modules=jdbc.query("SELECT * FROM learning_modules WHERE (? OR published) ORDER BY position",(rs,n)->new Modulo(rs.getString("id"),rs.getString("title"),rs.getString("description"),
                rs.getInt("position"),rs.getBoolean("published"),List.of()),all);
        if(modules.isEmpty())return modules;
        var lessons=jdbc.query("SELECT l.* FROM learning_lessons l JOIN learning_modules m ON m.id=l.module_id WHERE (? OR m.published) ORDER BY l.position,l.id",
                (rs,n)->new Leccion(rs.getString("id"),rs.getString("module_id"),rs.getString("title"),rs.getString("body"),rs.getInt("position"),rs.getInt("minutes"),List.of(),List.of()),all);
        var videos=jdbc.query("SELECT c.* FROM learning_contents c JOIN learning_lessons l ON l.id=c.lesson_id JOIN learning_modules m ON m.id=l.module_id WHERE (? OR m.published) ORDER BY c.id",
                (rs,n)->new Video(rs.getString("id"),rs.getString("lesson_id"),rs.getString("title"),rs.getString("youtube_id")),all);
        var questions=jdbc.query("SELECT c.* FROM learning_challenges c JOIN learning_lessons l ON l.id=c.lesson_id JOIN learning_modules m ON m.id=l.module_id WHERE (? OR m.published) ORDER BY c.id",
                (rs,n)->new Pregunta(rs.getString("id"),rs.getString("lesson_id"),rs.getString("question"),json.leer(rs.getString("options"),new TypeReference<List<String>>(){}),rs.getInt("correct_index"),rs.getString("explanation")),all);
        var byLessonVideos=videos.stream().collect(java.util.stream.Collectors.groupingBy(Video::lessonId));
        var byLessonQuestions=questions.stream().collect(java.util.stream.Collectors.groupingBy(Pregunta::lessonId));
        var byModule=new HashMap<String,List<Leccion>>();
        for(var l:lessons)byModule.computeIfAbsent(l.moduleId(),key->new ArrayList<>()).add(new Leccion(l.id(),l.moduleId(),l.title(),l.body(),l.position(),l.minutes(),
                byLessonVideos.getOrDefault(l.id(),List.of()),byLessonQuestions.getOrDefault(l.id(),List.of())));
        return modules.stream().map(m->new Modulo(m.id(),m.title(),m.description(),m.position(),m.published(),byModule.getOrDefault(m.id(),List.of()))).toList();
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
    @Override public void eliminarModulo(String id) {
        if(jdbc.queryForList("SELECT id FROM learning_modules WHERE id=? FOR UPDATE",String.class,id).isEmpty())throw missing();
        try {
            // RESTRICT foreign keys protect attempts/progress, including concurrent submissions.
            // The application transaction restores all children if any delete conflicts.
            jdbc.update("DELETE FROM learning_challenges WHERE lesson_id IN (SELECT id FROM learning_lessons WHERE module_id=?)",id);
            jdbc.update("DELETE FROM learning_lessons WHERE module_id=?",id);
            jdbc.update("DELETE FROM learning_modules WHERE id=?",id);
        }catch(org.springframework.dao.DataIntegrityViolationException e) {
            throw new Fallo(Fallo.Tipo.CONFLICTO,"Este módulo tiene actividad de aprendizaje. Desmarca Publicado para retirarlo sin perder el historial.");
        }
    }
    @Override public void eliminarLeccion(String id) {
        if(jdbc.queryForList("SELECT id FROM learning_lessons WHERE id=? FOR UPDATE",String.class,id).isEmpty())
            throw new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Lección no encontrada.");
        try {
            jdbc.update("DELETE FROM learning_challenges WHERE lesson_id=?",id);
            jdbc.update("DELETE FROM learning_lessons WHERE id=?",id);
        }catch(org.springframework.dao.DataIntegrityViolationException e) {
            throw new Fallo(Fallo.Tipo.CONFLICTO,"Esta lección tiene intentos o progreso. Despublica su módulo para retirarla sin perder el historial.");
        }
    }
    @Override public void eliminarPregunta(String id) {
        try {
            if(jdbc.update("DELETE FROM learning_challenges WHERE id=?",id)!=1)
                throw new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Desafío no encontrado.");
        }catch(org.springframework.dao.DataIntegrityViolationException e) {
            throw new Fallo(Fallo.Tipo.CONFLICTO,"Este desafío tiene intentos registrados y no se puede eliminar sin perder el historial.");
        }
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
