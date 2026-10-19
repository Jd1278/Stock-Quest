package com.stockquest.personas.usuarios.Application;

import com.stockquest.personas.Application.UnidadDeTrabajo;
import com.stockquest.personas.Application.HechosPersonas;
import com.stockquest.personas.usuarios.domain.*;
import com.stockquest.personas.domain.*;
import java.util.Map;

public final class GestionEquipo {
 private final Personas personas;private final UnidadDeTrabajo tx;private final HechosPersonas hechos;
 public GestionEquipo(Personas personas,UnidadDeTrabajo tx,HechosPersonas hechos) {this.personas=personas;this.tx=tx;this.hechos=hechos;}
 public Persona.Perfil editar(UsuarioAutenticado lider,String id,Map<String,Object> input,String correlationId) {
  lider.exigirLider();var b=DatosPersona.empleado(input);
  return tx.ejecutar(()->{
   var p=personas.bloquear(id).orElseThrow(GestionEquipo::missing);
   if(!lider.id().equals(p.leaderId())||p.role()!=UsuarioAutenticado.Rol.APRENDIZ)throw missing();
   boolean active=(Boolean)b.getOrDefault("active",p.active());
   int version=Boolean.FALSE.equals(b.get("active"))?Math.addExact(p.tokenVersion(),1):p.tokenVersion();
   var next=p.editar((String)b.getOrDefault("name",p.name()),p.email(),(String)b.getOrDefault("company",p.company()),p.phone(),p.passwordHash(),active,version);
   personas.actualizar(next);
   if(Boolean.FALSE.equals(b.get("active")))hechos.registrar(id,"UsuarioDesactivado",Map.of("userId",id,"tokenVersion",version),correlationId);
   return next.perfil();
  });
 }
 private static Fallo missing() {return new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Aprendiz no encontrado en tu equipo.");}
}
