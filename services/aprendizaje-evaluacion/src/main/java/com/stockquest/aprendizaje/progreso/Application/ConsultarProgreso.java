package com.stockquest.aprendizaje.progreso.Application;

import com.stockquest.aprendizaje.contenidos.Application.CatalogoFormativo;
import com.stockquest.aprendizaje.evaluaciones.Application.Intentos;
import com.stockquest.aprendizaje.progreso.domain.EstadoProgreso.Logro;
import java.util.*;
import java.time.Instant;

public final class ConsultarProgreso {
    public record Tema(String id,String title,int completed,int total,Integer score,boolean needsReview) { }
    public record Progreso(int completed,int total,int percent,double xp,long level,List<Tema> topics,List<Logro> achievements,
                           long simulations,boolean passed,List<String> recommendations) { }
    public record ActividadDesafio(String question) { }
    public record Actividad(String id,int score,int answer,Instant createdAt,ActividadDesafio challenge) { }
    public record Informe(String userId,Progreso progress,List<Actividad> activities) { }
    private final CatalogoFormativo catalogo;private final Intentos intentos;private final RegistroProgreso registro;
    private final ResultadosSimulacion simulacion;
    public ConsultarProgreso(CatalogoFormativo catalogo,Intentos intentos,RegistroProgreso registro,ResultadosSimulacion simulacion) {
        this.catalogo=catalogo;this.intentos=intentos;this.registro=registro;this.simulacion=simulacion;
    }
    public Progreso progreso(String userId) {
        var modules=catalogo.modulos(false);var estado=registro.estado(userId);var attempts=intentos.delUsuario(userId);
        var summary=simulacion.resumen(userId);var topics=new ArrayList<Tema>();var best=new HashMap<String,Integer>();
        for(var a:attempts) best.merge(a.challengeId(),a.score(),Math::max);
        for(var m:modules) {
            var challenges=new HashSet<String>();for(var l:m.lessons())for(var c:l.challenges())challenges.add(c.id());
            var relevant=attempts.stream().filter(a->challenges.contains(a.challengeId())).toList();
            Integer score=relevant.isEmpty()?null:(int)Math.round(relevant.stream().mapToInt(a->a.score()).average().orElseThrow());
            topics.add(new Tema(m.id(),m.title(),(int)m.lessons().stream().filter(l->estado.completadas().contains(l.id())).count(),m.lessons().size(),score,score!=null&&score<70));
        }
        int count=topics.stream().mapToInt(Tema::completed).sum(),total=topics.stream().mapToInt(Tema::total).sum();
        double xp=count*50.0+best.values().stream().mapToDouble(v->v/5.0).sum()+summary.scoreTotal();
        var achievements=new ArrayList<>(estado.logros().stream().filter(a->!a.key().equals("PRIMERA_SIMULACION")).toList());
        if(summary.firstCompletedAt()!=null)achievements.add(new Logro(userId,"PRIMERA_SIMULACION",summary.firstCompletedAt()));
        return new Progreso(count,total,total==0?0:(int)Math.round(count*100.0/total),xp,(long)Math.floor(xp/250)+1,List.copyOf(topics),List.copyOf(achievements),
                summary.completedCount(),total>0&&count==total&&summary.hasPassingRun(),topics.stream().filter(Tema::needsReview)
                .map(t->"Repasa "+t.title().toLowerCase(Locale.ROOT)+" y vuelve a intentar sus desafíos.").toList());
    }
    public Informe informe(String userId) {
        var activities=intentos.delUsuario(userId).stream().sorted(Comparator.comparing(com.stockquest.aprendizaje.evaluaciones.domain.Intento::createdAt).reversed()).limit(100)
                .map(a->new Actividad(a.id(),a.score(),a.answer(),a.createdAt(),new ActividadDesafio(catalogo.pregunta(a.challengeId()).orElseThrow().question()))).toList();
        return new Informe(userId,progreso(userId),activities);
    }
}
