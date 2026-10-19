package com.stockquest.personas;

import com.stockquest.personas.Application.*;
import com.stockquest.personas.Infrastructure.*;
import com.stockquest.personas.identidad.Application.*;
import com.stockquest.personas.identidad.Infrastructure.*;
import com.stockquest.personas.usuarios.Application.*;
import com.stockquest.personas.usuarios.Infrastructure.*;
import com.stockquest.personas.usuarios.domain.*;
import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.Infrastructure.*;
import com.stockquest.personas.domain.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import java.net.URI;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class PersistenciaPersonasIT {
 static JdbcTemplate jdbc;static UnidadDeTrabajoJdbc tx;static PersonasJdbc personas;static GruposJdbc grupos;static HechosPersonasJdbc hechos;
 static Clock clock=Clock.systemUTC();static GestionIdentidad identidad;static ClavesBcrypt claves;
 String prefix,leaderId,otherLeaderId,userId,groupId;UsuarioAutenticado lider,otro;GestionGrupos gestion;GestionEquipo equipo;
 @BeforeAll static void conectarSoloBaseExclusiva() {
  String url=required("SQ_PEOPLE_TEST_JDBC_URL");
  if(!url.startsWith("jdbc:postgresql://")||!URI.create(url.substring(5)).getPath().matches("/(stockquest_test_people|sq_test_people_[A-Za-z0-9_]+)"))throw new IllegalStateException("Usa una base exclusiva stockquest_test_people o sq_test_people_*.");
  var ds=new DriverManagerDataSource(url,required("SQ_PEOPLE_TEST_DB_USER"),required("SQ_PEOPLE_TEST_DB_PASSWORD"));
  Flyway.configure().dataSource(ds).cleanDisabled(true).load().migrate();jdbc=new JdbcTemplate(ds);tx=new UnidadDeTrabajoJdbc(new DataSourceTransactionManager(ds));
  personas=new PersonasJdbc(jdbc);grupos=new GruposJdbc(jdbc);claves=new ClavesBcrypt();
  var mapper=new ObjectMapper().registerModule(new JavaTimeModule()).disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  hechos=new HechosPersonasJdbc(jdbc,new JsonPersistencia(mapper),clock);
  identidad=new GestionIdentidad(personas,claves,new TokensJwt("integration-test-secret-at-least-32-bytes-long","8h",clock),tx,clock);
 }
 static String required(String name) {String value=System.getenv(name);if(value==null||value.isBlank())throw new IllegalStateException("Falta "+name);return value;}
 @BeforeEach void prepararFixturesPropios() {
  prefix="it-"+UUID.randomUUID();leaderId=prefix+"-leader";otherLeaderId=prefix+"-other";
  tx.ejecutar(()->{for(String id:List.of(leaderId,otherLeaderId))personas.crear(new Persona(id,"Líder","doc-"+UUID.randomUUID().toString().substring(0,20),id+"@example.test","C",null,"fixture-not-a-login",UsuarioAutenticado.Rol.LIDER,true,0,clock.instant(),null));return null;});
  lider=new UsuarioAutenticado(leaderId,UsuarioAutenticado.Rol.LIDER);otro=new UsuarioAutenticado(otherLeaderId,UsuarioAutenticado.Rol.LIDER);
  userId=identidad.registrar(new DatosPersona.Registro("Aprendiz","doc-"+UUID.randomUUID().toString().substring(0,20),prefix+"@example.test","C","password-for-integration"),lider).id();
  gestion=new GestionGrupos(grupos,personas,tx,hechos,clock);equipo=new GestionEquipo(personas,tx,hechos);
  groupId=gestion.crear(lider,"Grupo IT").id();
 }
 @AfterEach void retirarSoloFixturesPropios() {
  if(jdbc==null||userId==null)return;
  jdbc.update("DELETE FROM people_outbox WHERE aggregate_id IN (?,?,?,?)",leaderId,otherLeaderId,userId,groupId);
  jdbc.update("DELETE FROM people_versions WHERE aggregate_id IN (?,?,?,?)",leaderId,otherLeaderId,userId,groupId);
  jdbc.update("DELETE FROM people_groups WHERE leader_id IN (?,?)",leaderId,otherLeaderId);
  jdbc.update("DELETE FROM people_users WHERE id=?",userId);jdbc.update("DELETE FROM people_users WHERE id IN (?,?)",leaderId,otherLeaderId);
 }
 GestionIdentidad.Acceso login() {return identidad.login(prefix+"@example.test","password-for-integration");}
 @Test void logoutRevocaEnPostgresYNoSoloEnMemoria() {
  var session=login();assertEquals(userId,identidad.autenticar("Bearer "+session.token()).id());
  identidad.logout(new UsuarioAutenticado(userId,UsuarioAutenticado.Rol.APRENDIZ));
  assertEquals(1,personas.porId(userId).orElseThrow().tokenVersion());assertThrows(Fallo.class,()->identidad.autenticar("Bearer "+session.token()));
 }
 @Test void cambiarClaveExigeActualRevocaTokenYPermiteNuevaSesion() {
  var session=login();var user=new UsuarioAutenticado(userId,UsuarioAutenticado.Rol.APRENDIZ);
  assertThrows(Fallo.class,()->identidad.perfil(user,Map.of("password","new-password-for-integration","currentPassword","wrong")));
  identidad.perfil(user,Map.of("password","new-password-for-integration","currentPassword","password-for-integration"));
  assertThrows(Fallo.class,()->identidad.autenticar("Bearer "+session.token()));assertThrows(Fallo.class,this::login);
  assertNotNull(identidad.login(prefix+"@example.test","new-password-for-integration").token());
 }
 @Test void desactivarYReactivarNoResucitaSesiones() {
  var session=login();equipo.editar(lider,userId,Map.of("active",false),"it");
  assertThrows(Fallo.class,()->identidad.autenticar("Bearer "+session.token()));assertThrows(Fallo.class,this::login);
  equipo.editar(lider,userId,Map.of("active",true),"it");assertThrows(Fallo.class,()->identidad.autenticar("Bearer "+session.token()));assertNotNull(login().token());
 }
 @Test void asignacionConcurrentePersisteUnaMembresiaYUnHecho()throws Exception {
  var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
  try {Callable<Void> task=()->{if(!start.await(5,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");gestion.asignar(lider,groupId,userId,"it");return null;};
   var first=pool.submit(task);var second=pool.submit(task);start.countDown();first.get(15,TimeUnit.SECONDS);second.get(15,TimeUnit.SECONDS);
  }finally{pool.shutdownNow();}
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM people_memberships WHERE group_id=?",Integer.class,groupId));
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM people_outbox WHERE aggregate_id=?",Integer.class,groupId));
 }
 @Test void permisosDeGrupoYUsuarioSonDelLiderAutenticado() {
  assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->gestion.asignar(otro,groupId,userId,"it")).tipo());
  assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->equipo.editar(otro,userId,Map.of("name","Cambio"),"it")).tipo());
 }
 @Test void falloDeOutboxRevierteDesactivacionYVersion() {
  var broken=new GestionEquipo(personas,tx,(a,t,d,c)->{throw new IllegalStateException("fixture rollback");});
  var token=login().token();assertThrows(IllegalStateException.class,()->broken.editar(lider,userId,Map.of("active",false),"it"));
  assertTrue(personas.porId(userId).orElseThrow().active());assertEquals(0,personas.porId(userId).orElseThrow().tokenVersion());assertNotNull(identidad.autenticar("Bearer "+token));
 }
 @Test void falloDeOutboxRevierteMembresia() {
  var broken=new GestionGrupos(grupos,personas,tx,(a,t,d,c)->{throw new IllegalStateException("fixture rollback");},clock);
  assertThrows(IllegalStateException.class,()->broken.asignar(lider,groupId,userId,"it"));
  assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM people_memberships WHERE group_id=?",Integer.class,groupId));
 }
 @Test void eliminarGrupoRetiraMiembrosYConservaHechos() {
  gestion.asignar(lider,groupId,userId,"it");gestion.eliminar(lider,groupId,"it");
  assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM people_memberships WHERE group_id=?",Integer.class,groupId));
  assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM people_outbox WHERE aggregate_id=?",Integer.class,groupId));
 }
 @Test void listadoConUnaConexionConservaGruposVaciosMiembrosYAislamiento() {
  gestion.asignar(lider,groupId,userId,"it");
  String emptyId=gestion.crear(lider,"Vacio").id();
  gestion.crear(otro,"Ajeno");
  // A single available connection reproduces nested JDBC borrowing deterministically.
  var config=new com.zaxxer.hikari.HikariConfig();
  config.setJdbcUrl(required("SQ_PEOPLE_TEST_JDBC_URL"));config.setUsername(required("SQ_PEOPLE_TEST_DB_USER"));config.setPassword(required("SQ_PEOPLE_TEST_DB_PASSWORD"));
  config.setMaximumPoolSize(1);config.setConnectionTimeout(1000);
  try(var ds=new com.zaxxer.hikari.HikariDataSource(config)) {
   var repository=new GruposJdbc(new JdbcTemplate(ds));
   var result=repository.delLider(leaderId);
   assertEquals(2,result.size());
   var filled=result.stream().filter(g->g.id().equals(groupId)).findFirst().orElseThrow();
   assertEquals(1,filled.members().size());assertEquals(userId,filled.members().getFirst().userId());
   assertEquals(userId,filled.members().getFirst().user().id());
   assertTrue(result.stream().filter(g->g.id().equals(emptyId)).findFirst().orElseThrow().members().isEmpty());
   assertTrue(repository.delLider("nonexistent-"+prefix).isEmpty());
   assertTrue(repository.bloquearPropio(otherLeaderId,groupId).isEmpty());
   assertEquals(1,repository.bloquearPropio(leaderId,groupId).orElseThrow().members().size());
  }
 }
}
