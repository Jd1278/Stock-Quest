package com.stockquest.aprendizaje;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.progreso.Infrastructure.*;
import com.stockquest.aprendizaje.Infrastructure.JsonPersistencia;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ProgresoSnapshotsIT {
 static JdbcTemplate jdbc;static DataSourceTransactionManager manager;static JsonPersistencia json;
 ConsultarProgreso consultar;SnapshotsProgresoJdbc snapshots;String id;HttpServer server;int response=204;List<String> received;
 @BeforeAll static void connect() {
  String url=System.getenv("SQ_LEARNING_TEST_JDBC_URL");
  if(url==null||!url.startsWith("jdbc:postgresql://")||!URI.create(url.substring(5)).getPath().matches("/(stockquest_test_learning|sq_test_learning_[A-Za-z0-9_]+)"))throw new IllegalStateException("Base exclusiva de pruebas requerida.");
  var ds=new DriverManagerDataSource(url,System.getenv("SQ_LEARNING_TEST_DB_USER"),System.getenv("SQ_LEARNING_TEST_DB_PASSWORD"));
  Flyway.configure().dataSource(ds).cleanDisabled(true).load().migrate();jdbc=new JdbcTemplate(ds);manager=new DataSourceTransactionManager(ds);
  json=new JsonPersistencia(new ObjectMapper().registerModule(new JavaTimeModule()).disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS));
 }
 @BeforeEach void fixture()throws Exception {
  id="snapshot-"+UUID.randomUUID();consultar=mock(ConsultarProgreso.class);when(consultar.informe(id)).thenReturn(report(0));snapshots=new SnapshotsProgresoJdbc(jdbc,manager,consultar,json);
  received=new CopyOnWriteArrayList<>();server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/internal/progress-events",e->{received.add(new String(e.getRequestBody().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));e.sendResponseHeaders(response,-1);e.close();});server.start();
 }
 @AfterEach void cleanup(){server.stop(0);for(String table:List.of("learning_progress_outbox","learning_progress_snapshots","learning_progress_refresh_queue","learning_outbox","learning_versions"))jdbc.update("DELETE FROM "+table+" WHERE user_id=?",id);}
 ConsultarProgreso.Informe report(int xp) {return new ConsultarProgreso.Informe(id,new ConsultarProgreso.Progreso(0,0,0,xp,1,List.of(),List.of(),0,false,List.of()),List.of());}
 ProgresoOutboxDispatcher dispatcher(){return new ProgresoOutboxDispatcher(jdbc,manager,snapshots,URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/internal/progress-events"),"progress-event-test-token-minimum-32");}
 @Test void snapshotSinCambiosConservaIdYVersionYConCambiosAvanza() {
  var first=snapshots.capturar(id);assertEquals(first,snapshots.capturar(id));when(consultar.informe(id)).thenReturn(report(86));var second=snapshots.capturar(id);
  assertEquals(2,second.aggregateVersion());assertNotEquals(first.eventId(),second.eventId());assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM learning_progress_outbox WHERE user_id=?",Integer.class,id));
 }
 @Test void capturaConcurrenteNoProduceDosVersionesParaElMismoEstado()throws Exception {
  var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
  try{var jobs=new ArrayList<Future<SnapshotsProgreso.Evento>>();for(int i=0;i<2;i++)jobs.add(pool.submit(()->{start.await();return snapshots.capturar(id);}));start.countDown();assertEquals(jobs.get(0).get(10,TimeUnit.SECONDS).eventId(),jobs.get(1).get(10,TimeUnit.SECONDS).eventId());}finally{pool.shutdownNow();}
 }
 @Test void falloDeFuenteNoConfirmaSnapshotNiOutboxParcial() {
  when(consultar.informe(id)).thenThrow(new IllegalStateException("source unavailable"));assertThrows(IllegalStateException.class,()->snapshots.capturar(id));assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM learning_progress_snapshots WHERE user_id=?",Integer.class,id));
 }
 @Test void entrega204ConfirmaSnapshotYHechosCubiertos() {
  var tx=new org.springframework.transaction.support.TransactionTemplate(manager);
  tx.executeWithoutResult(status->new HechosAprendizajeJdbc(jdbc,json).registrar(id,"Fixture",Map.of("userId",id),Instant.now(),"test"));
  dispatcher().enviarPendientes();assertEquals(1,received.size());assertEquals("DELIVERED",jdbc.queryForObject("SELECT status FROM learning_outbox WHERE user_id=?",String.class,id));
  assertEquals("DELIVERED",jdbc.queryForObject("SELECT status FROM learning_progress_outbox WHERE user_id=?",String.class,id));
 }
 @Test void falloTransitorioSeReintentaYNoConfirmaAntesDelAck() {
  snapshots.capturar(id);response=503;dispatcher().enviarPendientes();assertEquals("PENDING",jdbc.queryForObject("SELECT status FROM learning_progress_outbox WHERE user_id=?",String.class,id));
  jdbc.update("UPDATE learning_progress_outbox SET next_attempt_at=CURRENT_TIMESTAMP WHERE user_id=?",id);response=204;dispatcher().enviarPendientes();
  assertEquals("DELIVERED",jdbc.queryForObject("SELECT status FROM learning_progress_outbox WHERE user_id=?",String.class,id));assertEquals(received.get(0),received.get(1));
 }
 @Test void credencialRechazadaVaAFalloYReplayExplicitoLaRecupera() {
  var e=snapshots.capturar(id);response=401;dispatcher().enviarPendientes();assertEquals("FAILED",jdbc.queryForObject("SELECT status FROM learning_progress_outbox WHERE user_id=?",String.class,id));
  snapshots.reintentar(id);response=204;dispatcher().enviarPendientes();assertEquals("DELIVERED",jdbc.queryForObject("SELECT status FROM learning_progress_outbox WHERE event_id=?",String.class,e.eventId()));
 }
 @Test void leaseVigenteImpideOtraEntregaYLeaseVencidoSeRecupera() {
  snapshots.capturar(id);jdbc.update("UPDATE learning_progress_outbox SET leased_until=CURRENT_TIMESTAMP+INTERVAL '60 seconds',lease_token=? WHERE user_id=?",UUID.randomUUID(),id);
  dispatcher().enviarPendientes();assertTrue(received.isEmpty());jdbc.update("UPDATE learning_progress_outbox SET leased_until=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE user_id=?",id);
  dispatcher().enviarPendientes();assertEquals(1,received.size());
 }
 @Test void cambioDeCatalogoSeReconciliaSinHechosNuevosDelUsuario() {
  snapshots.capturar(id);
  when(consultar.informe(id)).thenReturn(new ConsultarProgreso.Informe(id,new ConsultarProgreso.Progreso(0,1,0,0,1,
   List.of(new ConsultarProgreso.Tema("module","New module",0,1,null,false)),List.of(),0,false,List.of()),List.of()));
  jdbc.update("UPDATE learning_progress_snapshots SET refresh_after=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE user_id=?",id);
  dispatcher().enviarPendientes();
  assertEquals(2,jdbc.queryForObject("SELECT aggregate_version FROM learning_progress_snapshots WHERE user_id=?",Integer.class,id));
  assertEquals(1,jdbc.queryForObject("SELECT (payload#>>'{data,progress,total}')::int FROM learning_progress_snapshots WHERE user_id=?",Integer.class,id));
 }
}
