package com.stockquest.aprendizaje.contenidos.Application;

import com.stockquest.aprendizaje.contenidos.domain.ContenidoFormativo.*;
import com.stockquest.aprendizaje.progreso.Application.RegistroProgreso;
import com.stockquest.aprendizaje.domain.Fallo;
import java.util.*;

public final class RutaAprendizaje {
    public record PreguntaPublica(String id,String question,List<String> options) { }
    public record LeccionPublica(String id,String moduleId,String title,String body,int position,int minutes,
            List<Video> contents,List<PreguntaPublica> challenges,boolean completed,boolean unlocked) { }
    public record ModuloPublico(String id,String title,String description,int position,boolean published,List<LeccionPublica> lessons) { }
    private final CatalogoFormativo catalogo;
    private final RegistroProgreso progreso;
    public RutaAprendizaje(CatalogoFormativo catalogo,RegistroProgreso progreso) { this.catalogo=catalogo; this.progreso=progreso; }
    public List<ModuloPublico> ruta(String userId) {
        var done=progreso.estado(userId).completadas();
        var result=new ArrayList<ModuloPublico>(); boolean unlocked=true;
        for(var m:catalogo.modulos(false)) {
            var lessons=new ArrayList<LeccionPublica>();
            for(var l:m.lessons()) {
                boolean completed=done.contains(l.id()), visible=unlocked||completed;
                lessons.add(new LeccionPublica(l.id(),l.moduleId(),l.title(),visible?l.body():"",l.position(),l.minutes(),
                        visible?l.contents():List.of(),visible?l.challenges().stream().map(c->new PreguntaPublica(c.id(),c.question(),c.options())).toList():List.of(),completed,unlocked));
                if(!completed) unlocked=false;
            }
            result.add(new ModuloPublico(m.id(),m.title(),m.description(),m.position(),m.published(),lessons));
        }
        return List.copyOf(result);
    }
    public LeccionPublica leccion(String userId,String lessonId) {
        var lesson=ruta(userId).stream().flatMap(m->m.lessons().stream()).filter(l->l.id().equals(lessonId)).findFirst()
                .orElseThrow(()->new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Lección no disponible."));
        if(!lesson.unlocked()&&!lesson.completed()) throw new Fallo(Fallo.Tipo.PROHIBIDO,"Completa la lección anterior para continuar.");
        return lesson;
    }
}
