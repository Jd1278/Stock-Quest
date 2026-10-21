package com.stockquest.personas;
import com.stockquest.personas.capacitacion.Infrastructure.ProyeccionesProgresoJdbc;
import com.stockquest.personas.Infrastructure.JsonPersistencia;
import com.stockquest.personas.capacitacion.domain.*;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class ProyeccionesProgresoIT {
 static JdbcTemplate jdbc;static ProyeccionesProgresoJdbc p;String id;
 @BeforeAll static void connect() {
  String url=System.getenv("SQ_PEOPLE_TEST_JDBC_URL");
  if(url==null||!url.startsWith("jdbc:postgresql://")||!URI.create(url.substring(5)).getPath().matches("/(stockquest_test_people|sq_test_people_[A-Za-z0-9_]+)"))throw new IllegalStateException("Base exclusiva de prueba requerida.");
  var ds=new DriverManagerDataSource(url,System.getenv("SQ_PEOPLE_TEST_DB_USER"),System.getenv("SQ_PEOPLE_TEST_DB_PASSWORD"));
  Flyway.configure().dataSource(ds).cleanDisabled(true).load().migrate();jdbc=new JdbcTemplate(ds);
  var mapper=new ObjectMapper().registerModule(new JavaTimeModule()).disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  p=new ProyeccionesProgresoJdbc(jdbc,new DataSourceTransactionManager(ds),new JsonPersistencia(mapper));
 }
 @BeforeEach void fixture() {
  id="projection-"+UUID.randomUUID();jdbc.update("INSERT INTO people_users(id,name,document,email,company,password_hash,role,active,token_version,created_at) VALUES (?,?,?,?,?,?,'APRENDIZ',true,0,CURRENT_TIMESTAMP)",id,"Projection test",UUID.randomUUID().toString().substring(0,25),id+"@example.test","Test","not-a-login");
 }
 @AfterEach void cleanup(){jdbc.update("DELETE FROM people_users WHERE id=?",id);}
 EventoProgreso event(long version,int xp){return ProyeccionesProgresoTest.event(id,version,xp);}
 @Test void duplicadosConcurrentesTienenUnInboxYUnaProyeccion()throws Exception {
  var e=event(1,86);var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
  try {var jobs=new ArrayList<Future<?>>();for(int i=0;i<2;i++)jobs.add(pool.submit(()->{try{start.await();p.recibir(e);}catch(InterruptedException ex){throw new IllegalStateException(ex);}}));start.countDown();for(var job:jobs)job.get(10,TimeUnit.SECONDS);}finally{pool.shutdownNow();}
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM people_progress_inbox WHERE user_id=?",Integer.class,id));assertEquals(86,p.consultar(id).orElseThrow().progress().xp());
 }
 @Test void versionesAtrasadasNoHacenRetrocederElInforme() {p.recibir(event(3,100));p.recibir(event(1,0));assertEquals(100,p.consultar(id).orElseThrow().progress().xp());}
 @Test void mismaVersionConOtroContenidoFallaSinAlterarNada() {
  p.recibir(event(1,86));assertEquals(Fallo.Tipo.CONFLICTO,assertThrows(Fallo.class,()->p.recibir(event(1,0))).tipo());assertEquals(86,p.consultar(id).orElseThrow().progress().xp());
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM people_progress_inbox WHERE user_id=?",Integer.class,id));
 }
 @Test void replayReconstruyeAunqueElInboxYaContengaElEvento() {
  var e=event(1,86);p.recibir(e);jdbc.update("DELETE FROM people_progress_projections WHERE user_id=?",id);p.recibir(e);assertEquals(86,p.consultar(id).orElseThrow().progress().xp());
 }
 @Test void unReplayViejoNoReconstruyeUnaProyeccionMasAntiguaQueElInbox() {
  var old=event(1,0);var latest=event(3,86);p.recibir(old);p.recibir(latest);
  jdbc.update("DELETE FROM people_progress_projections WHERE user_id=?",id);p.recibir(old);assertTrue(p.consultar(id).isEmpty());
  p.recibir(latest);assertEquals(86,p.consultar(id).orElseThrow().progress().xp());
 }
 @Test void rollbackRevierteInboxYProyeccionJuntos() {
  var ds=(javax.sql.DataSource)jdbc.getDataSource();var tx=new org.springframework.transaction.support.TransactionTemplate(new DataSourceTransactionManager(ds));
  assertThrows(IllegalStateException.class,()->tx.executeWithoutResult(status->{p.recibir(event(1,86));throw new IllegalStateException("rollback fixture");}));
  assertTrue(p.consultar(id).isEmpty());assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM people_progress_inbox WHERE user_id=?",Integer.class,id));
 }
}
