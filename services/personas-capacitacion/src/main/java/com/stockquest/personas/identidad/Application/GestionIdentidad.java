package com.stockquest.personas.identidad.Application;

import com.stockquest.personas.Application.UnidadDeTrabajo;
import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.usuarios.domain.*;
import com.stockquest.personas.domain.*;
import java.time.Clock;
import java.util.*;

public final class GestionIdentidad {
 public record Acceso(String token,Persona.Perfil user) { }
 private final Personas personas;private final Claves claves;private final Tokens tokens;private final UnidadDeTrabajo tx;private final Clock clock;
 public GestionIdentidad(Personas p,Claves c,Tokens t,UnidadDeTrabajo tx,Clock clock) {this.personas=p;this.claves=c;this.tokens=t;this.tx=tx;this.clock=clock;}
 public Persona.Perfil registrar(DatosPersona.Registro b,UsuarioAutenticado lider) {
  if(lider!=null)lider.exigirLider();
  var persona=new Persona(UUID.randomUUID().toString(),b.name(),b.document(),b.email(),b.company(),null,claves.hash(b.password()),UsuarioAutenticado.Rol.APRENDIZ,true,0,clock.instant(),lider==null?null:lider.id());
  return tx.ejecutar(()->{personas.crear(persona);return persona.perfil();});
 }
 public Acceso login(String email,String password) {
  var persona=personas.porCorreo(DatosPersona.correo(email)).orElse(null);
  if(persona==null||!persona.active()||!claves.coincide(password,persona.passwordHash()))throw sinSesion("Correo o contraseña incorrectos.");
  return new Acceso(tokens.emitir(persona.id(),persona.tokenVersion()),persona.perfil());
 }
 public Persona autenticar(String bearer) {
  var token=tokens.verificar(bearer);var persona=personas.porId(token.userId()).orElseThrow(()->sinSesion("Sesión no disponible."));
  if(!persona.active()||persona.tokenVersion()!=token.version())throw sinSesion("Sesión no disponible.");return persona;
 }
 public void logout(UsuarioAutenticado u) {
  tx.ejecutar(()->{var p=personas.bloquear(u.id()).orElseThrow(()->sinSesion("Sesión no disponible."));
   personas.actualizar(p.editar(p.name(),p.email(),p.company(),p.phone(),p.passwordHash(),p.active(),Math.addExact(p.tokenVersion(),1)));return null;});
 }
 public Persona.Perfil perfil(UsuarioAutenticado u,Map<String,Object> input) {
  var b=DatosPersona.perfil(input);
  return tx.ejecutar(()->{
   var p=personas.bloquear(u.id()).orElseThrow(()->new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Usuario no encontrado."));
   boolean sensitive=b.containsKey("password")||b.containsKey("email");
   if(sensitive&&(!b.containsKey("currentPassword")||!claves.coincide((String)b.get("currentPassword"),p.passwordHash())))throw Fallo.invalido("Confirma tu contraseña actual.");
   var next=p.editar((String)b.getOrDefault("name",p.name()),(String)b.getOrDefault("email",p.email()),p.company(),
     b.containsKey("phone")?(String)b.get("phone"):p.phone(),b.containsKey("password")?claves.hash((String)b.get("password")):p.passwordHash(),p.active(),sensitive?Math.addExact(p.tokenVersion(),1):p.tokenVersion());
   personas.actualizar(next);return next.perfil();
  });
 }
 private static Fallo sinSesion(String message) {return new Fallo(Fallo.Tipo.SIN_SESION,message);}
}
