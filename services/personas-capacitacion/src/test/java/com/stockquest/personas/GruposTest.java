package com.stockquest.personas;

import com.stockquest.personas.Application.*;
import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.usuarios.domain.Persona;
import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.domain.*;
import com.stockquest.personas.domain.*;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GruposTest {
 Personas personas;Grupos grupos;HechosPersonas hechos;GestionGrupos gestion;
 UsuarioAutenticado lider=new UsuarioAutenticado("leader",UsuarioAutenticado.Rol.LIDER);
 UnidadDeTrabajo tx=new UnidadDeTrabajo(){public <T>T ejecutar(Supplier<T> s){return s.get();}};
 Grupo group=new Grupo("g","Grupo","leader",Instant.EPOCH,List.of());
 @BeforeEach void setup() {
  personas=mock(Personas.class);grupos=mock(Grupos.class);hechos=mock(HechosPersonas.class);
  gestion=new GestionGrupos(grupos,personas,tx,hechos,Clock.systemUTC());when(grupos.bloquearPropio("leader","g")).thenReturn(Optional.of(group));
  when(personas.bloquear("user")).thenReturn(Optional.of(new Persona("user","U","D","u@example.test","C",null,"hash",UsuarioAutenticado.Rol.APRENDIZ,true,0,Instant.EPOCH,"leader")));
 }
 @Test void asignacionDuplicadaPublicaUnSoloHecho() {
  when(grupos.asignar("g","user")).thenReturn(true,false);gestion.asignar(lider,"g","user","test");gestion.asignar(lider,"g","user","test");
  verify(hechos,times(1)).registrar(eq("g"),eq("MiembroAsignado"),anyMap(),eq("test"));
 }
 @Test void grupoAjenoDevuelve404AntesDeCambiarMiembro() {
  assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->gestion.asignar(lider,"other","user","test")).tipo());verifyNoInteractions(personas,hechos);
 }
 @Test void miembroDeOtroLiderSeRechaza() {
  when(personas.bloquear("user")).thenReturn(Optional.of(new Persona("user","U","D","u@example.test","C",null,"hash",UsuarioAutenticado.Rol.APRENDIZ,true,0,Instant.EPOCH,"other")));
  assertThrows(Fallo.class,()->gestion.asignar(lider,"g","user","test"));verify(grupos,never()).asignar(anyString(),anyString());
 }
 @Test void aprendizNoAdministraGrupos() {
  assertEquals(Fallo.Tipo.PROHIBIDO,assertThrows(Fallo.class,()->gestion.crear(new UsuarioAutenticado("user",UsuarioAutenticado.Rol.APRENDIZ),"Grupo")).tipo());
 }
 @Test void retiradaAusenteEsIdempotente() {
  when(grupos.retirar("g","user")).thenReturn(false);gestion.retirar(lider,"g","user","test");verifyNoInteractions(hechos);
 }
 @Test void informeAjenoSeRechazaAntesDeConsultarAprendizaje() {
  var informes=mock(InformesAprendizaje.class);when(personas.porId("user")).thenReturn(Optional.empty());
  assertThrows(Fallo.class,()->new ConsultarEquipo(personas,informes).individual(lider,"user"));verifyNoInteractions(informes);
 }
 @Test void equipoVacioNoHaceLlamadasRemotas() {
  var informes=mock(InformesAprendizaje.class);when(personas.equipo("leader")).thenReturn(List.of());
  assertTrue(new ConsultarEquipo(personas,informes).equipo(lider).isEmpty());verifyNoInteractions(informes);
 }
}
