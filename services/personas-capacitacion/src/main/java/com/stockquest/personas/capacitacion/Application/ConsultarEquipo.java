package com.stockquest.personas.capacitacion.Application;

import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.usuarios.domain.Persona;
import com.stockquest.personas.capacitacion.domain.InformeAprendizaje;
import com.stockquest.personas.domain.*;
import java.util.*;

public final class ConsultarEquipo {
 public record Reporte(Persona.Perfil user,InformeAprendizaje learning) { }
 private final Personas personas;private final InformesAprendizaje informes;
 public ConsultarEquipo(Personas p,InformesAprendizaje i) {this.personas=p;this.informes=i;}
 public List<Reporte> equipo(UsuarioAutenticado lider) {
  lider.exigirLider();var users=personas.equipo(lider.id());var result=new ArrayList<Reporte>();
  for(int offset=0;offset<users.size();offset+=100) {
   var batch=users.subList(offset,Math.min(offset+100,users.size()));var reports=informes.consultar(batch.stream().map(Persona.Perfil::id).toList());
   for(var user:batch)result.add(new Reporte(user,reports.stream().filter(r->r.userId().equals(user.id())).findFirst().orElseThrow(ConsultarEquipo::unavailable)));
  }
  return List.copyOf(result);
 }
 public Reporte individual(UsuarioAutenticado lider,String id) {
  lider.exigirLider();var user=personas.porId(id).orElseThrow(ConsultarEquipo::missing);
  if(!lider.id().equals(user.leaderId())||user.role()!=UsuarioAutenticado.Rol.APRENDIZ)throw missing();
  var reports=informes.consultar(List.of(id));
  if(reports.size()!=1||!reports.getFirst().userId().equals(id))throw unavailable();
  return new Reporte(user.perfil(),reports.getFirst());
 }
 private static Fallo missing() {return new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Aprendiz no encontrado en tu equipo.");}
 private static Fallo unavailable() {return new Fallo(Fallo.Tipo.NO_DISPONIBLE,"No fue posible consultar el progreso de aprendizaje.");}
}
