package com.stockquest.personas.capacitacion.domain;

import java.time.Instant;
import java.util.*;

public record InformeAprendizaje(String userId,Progreso progress,List<Actividad> activities) {
 public InformeAprendizaje {
  if(userId==null||userId.isBlank()||userId.length()>100||progress==null||activities==null||activities.size()>100)throw new IllegalArgumentException("Informe inválido.");
  activities=List.copyOf(activities);
  if(progress.achievements().stream().anyMatch(a->!userId.equals(a.userId())))throw new IllegalArgumentException("Logro de otro usuario.");
 }
 public record Tema(String id,String title,int completed,int total,Integer score,boolean needsReview) { }
 public record Logro(String userId,String key,Instant earnedAt) { }
 public record Progreso(int completed,int total,int percent,double xp,long level,List<Tema> topics,List<Logro> achievements,long simulations,boolean passed,List<String> recommendations) {
  public Progreso {
   if(completed<0||total<completed||percent<0||percent>100||!Double.isFinite(xp)||xp<0||Math.rint(xp)!=xp||level<1||simulations<0)throw new IllegalArgumentException("Progreso inválido.");
   topics=List.copyOf(topics);achievements=List.copyOf(achievements);recommendations=List.copyOf(recommendations);
  }
 }
 public record Desafio(String question) { }
 public record Actividad(String id,int score,int answer,Instant createdAt,Desafio challenge) { }
}
