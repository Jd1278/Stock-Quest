package com.stockquest.personas.capacitacion.Application;

import com.stockquest.personas.Application.*;
import com.stockquest.personas.capacitacion.domain.Grupo;
import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.usuarios.domain.DatosPersona;
import com.stockquest.personas.domain.*;
import java.time.Clock;
import java.util.*;

public final class GestionGrupos {
 private final Grupos grupos;private final Personas personas;private final UnidadDeTrabajo tx;private final HechosPersonas hechos;private final Clock clock;
 public GestionGrupos(Grupos g,Personas p,UnidadDeTrabajo tx,HechosPersonas h,Clock clock) {this.grupos=g;this.personas=p;this.tx=tx;this.hechos=h;this.clock=clock;}
 public List<Grupo> listar(UsuarioAutenticado u) {u.exigirLider();return grupos.delLider(u.id());}
 public Grupo crear(UsuarioAutenticado u,String name) {
  u.exigirLider();String title=DatosPersona.texto(name,100);return tx.ejecutar(()->grupos.crear(new Grupo(UUID.randomUUID().toString(),title,u.id(),clock.instant(),List.of())));
 }
 public Grupo renombrar(UsuarioAutenticado u,String id,String name) {
  u.exigirLider();String title=DatosPersona.texto(name,100);return tx.ejecutar(()->grupos.renombrar(propio(u,id),title));
 }
 public void eliminar(UsuarioAutenticado u,String id,String correlationId) {
  u.exigirLider();tx.ejecutar(()->{
   var group=propio(u,id);
   for(var m:group.members())hechos.registrar(id,"MiembroRetirado",Map.of("groupId",id,"userId",m.userId(),"leaderId",u.id()),correlationId);
   grupos.eliminar(id);return null;
  });
 }
 public Grupo.Membresia asignar(UsuarioAutenticado u,String id,String userId,String correlationId) {
  u.exigirLider();return tx.ejecutar(()->{
   propio(u,id);var person=personas.bloquear(userId).orElseThrow(GestionGrupos::missingPerson);
   if(!u.id().equals(person.leaderId())||person.role()!=UsuarioAutenticado.Rol.APRENDIZ||!person.active())throw missingPerson();
   if(grupos.asignar(id,userId))hechos.registrar(id,"MiembroAsignado",Map.of("groupId",id,"userId",userId,"leaderId",u.id()),correlationId);
   return new Grupo.Membresia(id,userId);
  });
 }
 public void retirar(UsuarioAutenticado u,String id,String userId,String correlationId) {
  u.exigirLider();tx.ejecutar(()->{
   propio(u,id);if(grupos.retirar(id,userId))hechos.registrar(id,"MiembroRetirado",Map.of("groupId",id,"userId",userId,"leaderId",u.id()),correlationId);return null;
  });
 }
 private Grupo propio(UsuarioAutenticado u,String id) {return grupos.bloquearPropio(u.id(),id).orElseThrow(()->new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Grupo no encontrado."));}
 private static Fallo missingPerson() {return new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Aprendiz no encontrado en tu equipo.");}
}
