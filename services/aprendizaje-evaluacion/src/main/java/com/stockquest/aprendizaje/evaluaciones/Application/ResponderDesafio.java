package com.stockquest.aprendizaje.evaluaciones.Application;

import com.stockquest.aprendizaje.Application.UnidadDeTrabajo;
import com.stockquest.aprendizaje.Application.HechosAprendizaje;
import com.stockquest.aprendizaje.contenidos.Application.*;
import com.stockquest.aprendizaje.progreso.Application.RegistroProgreso;
import com.stockquest.aprendizaje.evaluaciones.domain.Intento;
import com.stockquest.aprendizaje.domain.*;
import java.time.Clock;
import java.util.UUID;
import java.util.Map;

public final class ResponderDesafio {
    public record Respuesta(String id,int score,boolean passed,String feedback,int attempt) { }
    private final CatalogoFormativo catalogo; private final RutaAprendizaje ruta;
    private final Intentos intentos; private final RegistroProgreso progreso; private final UnidadDeTrabajo tx; private final Clock clock;private final HechosAprendizaje hechos;
    public ResponderDesafio(CatalogoFormativo catalogo,RutaAprendizaje ruta,Intentos intentos,RegistroProgreso progreso,UnidadDeTrabajo tx,Clock clock,HechosAprendizaje hechos) {
        this.catalogo=catalogo;this.ruta=ruta;this.intentos=intentos;this.progreso=progreso;this.tx=tx;this.clock=clock;this.hechos=hechos;
    }
    public Respuesta ejecutar(UsuarioAutenticado usuario,String challengeId,int answer,String correlationId) {
        usuario.exigirAprendiz();
        return tx.ejecutar(()->{
            progreso.bloquearUsuario(usuario.id());
            var c=catalogo.pregunta(challengeId).orElseThrow(()->new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Desafío no encontrado."));
            var lesson=ruta.leccion(usuario.id(),c.lessonId());
            if(answer<0||answer>=c.options().size()) throw Fallo.invalido("Respuesta inválida.");
            int score=answer==c.correctIndex()?100:0;
            var attempt=new Intento(UUID.randomUUID().toString(),usuario.id(),c.id(),answer,score,clock.instant());
            int count=intentos.registrar(attempt);
            hechos.registrar(usuario.id(),"DesafioRespondido",Map.of("attemptId",attempt.id(),"userId",usuario.id(),"challengeId",c.id(),"lessonId",c.lessonId(),"moduleId",lesson.moduleId(),"score",score,"createdAt",attempt.createdAt()),attempt.createdAt(),correlationId);
            return new Respuesta(attempt.id(),score,score==100,c.explanation(),count);
        });
    }
}
