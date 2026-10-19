package com.stockquest.aprendizaje.progreso.Application;

import com.stockquest.aprendizaje.Application.UnidadDeTrabajo;
import com.stockquest.aprendizaje.Application.HechosAprendizaje;
import com.stockquest.aprendizaje.contenidos.Application.RutaAprendizaje;
import com.stockquest.aprendizaje.evaluaciones.Application.Intentos;
import com.stockquest.aprendizaje.domain.*;
import java.time.Clock;
import java.util.Map;

public final class CompletarLeccion {
    private final RutaAprendizaje ruta;private final Intentos intentos;private final RegistroProgreso progreso;
    private final UnidadDeTrabajo tx;private final Clock clock;private final HechosAprendizaje hechos;
    public CompletarLeccion(RutaAprendizaje ruta,Intentos intentos,RegistroProgreso progreso,UnidadDeTrabajo tx,Clock clock,HechosAprendizaje hechos) {
        this.ruta=ruta;this.intentos=intentos;this.progreso=progreso;this.tx=tx;this.clock=clock;this.hechos=hechos;
    }
    public String ejecutar(UsuarioAutenticado usuario,String lessonId,String correlationId) {
        usuario.exigirAprendiz();
        return tx.ejecutar(()->{
            progreso.bloquearUsuario(usuario.id());
            var lesson=ruta.leccion(usuario.id(),lessonId);var attempts=intentos.delUsuario(usuario.id());
            for(var c:lesson.challenges()) if(attempts.stream().noneMatch(a->a.challengeId().equals(c.id())&&a.score()==100))
                throw Fallo.invalido("Resuelve los desafíos antes de completar la lección.");
            var date=clock.instant();
            if(progreso.completar(usuario.id(),lessonId,date))
                hechos.registrar(usuario.id(),"LeccionCompletada",Map.of("userId",usuario.id(),"lessonId",lessonId,"moduleId",lesson.moduleId(),"completedAt",date),date,correlationId);
            progreso.logro(usuario.id(),"PRIMERA_LECCION",clock.instant());
            return "Lección completada. La siguiente ya está disponible.";
        });
    }
}
