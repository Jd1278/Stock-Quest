package com.stockquest.personas;

import com.stockquest.personas.Application.*;
import com.stockquest.personas.identidad.Application.*;
import com.stockquest.personas.identidad.domain.Sesion;
import com.stockquest.personas.usuarios.Application.*;
import com.stockquest.personas.usuarios.domain.*;
import com.stockquest.personas.domain.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IdentidadTest {
 Personas personas;Claves claves;Tokens tokens;HechosPersonas hechos;GestionIdentidad identidad;
 Clock clock=Clock.fixed(Instant.parse("2026-10-19T00:00:00Z"),ZoneOffset.UTC);
 UnidadDeTrabajo tx=new UnidadDeTrabajo(){public <T>T ejecutar(Supplier<T> s){return s.get();}};
 Persona persona;UsuarioAutenticado aprendiz=new UsuarioAutenticado("u",UsuarioAutenticado.Rol.APRENDIZ);
 @BeforeEach void setup() {
  personas=mock(Personas.class);claves=mock(Claves.class);tokens=mock(Tokens.class);hechos=mock(HechosPersonas.class);
  persona=new Persona("u","Uno","doc","one@example.test","Empresa","123","hash",UsuarioAutenticado.Rol.APRENDIZ,true,2,clock.instant(),"leader");
  when(personas.porId("u")).thenReturn(Optional.of(persona));when(personas.bloquear("u")).thenReturn(Optional.of(persona));
  identidad=new GestionIdentidad(personas,claves,tokens,tx,clock);
 }
 @Test void registroPublicoNormalizaYSiempreCreaAprendiz() {
  when(claves.hash("password-for-test")).thenReturn("hash");
  var profile=identidad.registrar(new DatosPersona.Registro(" Nombre "," doc "," ONE@example.test "," Empresa ","password-for-test"),null);
  assertEquals("one@example.test",profile.email());assertEquals(UsuarioAutenticado.Rol.APRENDIZ,profile.role());
  var capture=ArgumentCaptor.forClass(Persona.class);verify(personas).crear(capture.capture());assertNull(capture.getValue().leaderId());
 }
 @Test void loginConClaveIncorrectaDevuelve401() {
  when(personas.porCorreo(persona.email())).thenReturn(Optional.of(persona));
  assertEquals(Fallo.Tipo.SIN_SESION,assertThrows(Fallo.class,()->identidad.login(persona.email(),"wrong")).tipo());verifyNoInteractions(tokens);
 }
 @Test void cuentaInactivaNoIniciaSesion() {
  when(personas.porCorreo(persona.email())).thenReturn(Optional.of(persona.editar(persona.name(),persona.email(),persona.company(),persona.phone(),persona.passwordHash(),false,3)));
  assertThrows(Fallo.class,()->identidad.login(persona.email(),"password"));verifyNoInteractions(tokens,claves);
 }
 @Test void versionRevocadaNoAutentica() {
  when(tokens.verificar("Bearer old")).thenReturn(new Sesion("u",1,clock.instant().plusSeconds(3600)));
  assertEquals(Fallo.Tipo.SIN_SESION,assertThrows(Fallo.class,()->identidad.autenticar("Bearer old")).tipo());
 }
 @Test void logoutIncrementaVersionPersistida() {
  identidad.logout(aprendiz);verify(personas).actualizar(argThat(p->p.tokenVersion()==3));
 }
 @Test void cambioSensibleExigeClaveActual() {
  assertThrows(Fallo.class,()->identidad.perfil(aprendiz,Map.of("email","new@example.test")));verify(personas,never()).actualizar(any());
 }
 @Test void cambioDeCorreoRevocaSesiones() {
  when(claves.coincide("current",persona.passwordHash())).thenReturn(true);
  identidad.perfil(aprendiz,Map.of("email","NEW@example.test","currentPassword","current"));
  verify(personas).actualizar(argThat(p->p.tokenVersion()==3&&p.email().equals("new@example.test")));
 }
 @Test void telefonoNullSeConservaComoBorradoExplicito() {
  var input=new HashMap<String,Object>();input.put("phone",null);identidad.perfil(aprendiz,input);
  verify(personas).actualizar(argThat(p->p.phone()==null&&p.tokenVersion()==2));
 }
 @Test void aprendizNoCreaEmpleado() {
  assertEquals(Fallo.Tipo.PROHIBIDO,assertThrows(Fallo.class,()->identidad.registrar(new DatosPersona.Registro("A","D","a@example.test","C","password-for-test"),aprendiz)).tipo());
  verify(personas,never()).crear(any());
 }
 @Test void desactivarRevocaYGuardaHechoEnLaTransaccion() {
  var lider=new UsuarioAutenticado("leader",UsuarioAutenticado.Rol.LIDER);
  new GestionEquipo(personas,tx,hechos).editar(lider,"u",Map.of("active",false),"test");
  verify(personas).actualizar(argThat(p->!p.active()&&p.tokenVersion()==3));verify(hechos).registrar(eq("u"),eq("UsuarioDesactivado"),anyMap(),eq("test"));
 }
 @Test void liderAjenoNoEditaPersona() {
  var lider=new UsuarioAutenticado("other",UsuarioAutenticado.Rol.LIDER);
  assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->new GestionEquipo(personas,tx,hechos).editar(lider,"u",Map.of("name","Otra"),"test")).tipo());verify(personas,never()).actualizar(any());
 }
 @Test void limiteDeClaveSeMideTambienEnBytes() {
  assertThrows(Fallo.class,()->DatosPersona.clave("á".repeat(37)));assertDoesNotThrow(()->DatosPersona.clave("a".repeat(72)));
 }
}
