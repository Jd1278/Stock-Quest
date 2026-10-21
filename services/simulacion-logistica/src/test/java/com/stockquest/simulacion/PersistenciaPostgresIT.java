package com.stockquest.simulacion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.stockquest.simulacion.Infrastructure.*;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.escenarios.Infrastructure.CatalogoEscenariosJdbc;
import com.stockquest.simulacion.partidas.Application.*;
import com.stockquest.simulacion.partidas.Infrastructure.persistence.*;
import com.stockquest.simulacion.partidas.domain.Partida;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import com.stockquest.simulacion.partidas.Infrastructure.events.OutboxDispatcher;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class PersistenciaPostgresIT {
    private static JdbcTemplate jdbc;
    private static JsonPersistencia json;
    private static UnidadDeTrabajoJdbc tx;
    private static PartidaJdbc repo;
    private static OutboxJdbc outbox;
    private static GestionPartidas partidas;
    private static RegistrarDecision decisiones;
    private static DataSourceTransactionManager manager;
    private String scenarioId;

    @BeforeAll static void conectarSoloABaseDePruebas() {
        String url=required("SQ_TEST_JDBC_URL");
        if(!url.startsWith("jdbc:postgresql://")) throw new IllegalStateException("SQ_TEST_JDBC_URL debe usar PostgreSQL.");
        var parsed=URI.create(url.substring(5));
        if(parsed.getPath()==null || !parsed.getPath().matches("/(sq_test_|stockquest_test)[A-Za-z0-9_]*"))
            throw new IllegalStateException("Las IT requieren una base exclusiva sq_test_* o stockquest_test*.");
        var ds=new DriverManagerDataSource(url,required("SQ_TEST_DB_USER"),required("SQ_TEST_DB_PASSWORD"));
        Flyway.configure().dataSource(ds).cleanDisabled(true).load().migrate();
        jdbc=new JdbcTemplate(ds);
        json=new JsonPersistencia(new ObjectMapper().registerModule(new JavaTimeModule()));
        manager=new DataSourceTransactionManager(ds);
        tx=new UnidadDeTrabajoJdbc(manager);
        repo=new PartidaJdbc(jdbc,json); outbox=new OutboxJdbc(jdbc,json);
        partidas=new GestionPartidas(repo,new CatalogoEscenariosJdbc(jdbc,json),tx,Clock.systemUTC());
        decisiones=new RegistrarDecision(repo,tx,outbox,Clock.systemUTC());
    }
    private static String required(String name) {
        String value=System.getenv(name);
        if(value==null||value.isBlank()) throw new IllegalStateException("Falta variable de prueba: "+name);
        return value;
    }
    @BeforeEach void escenarioPropio() {
        scenarioId="it-"+UUID.randomUUID();
        jdbc.update("INSERT INTO simulation_scenarios(id,parameters) VALUES (?,?::jsonb)",scenarioId,json.escribir(Fixtures.escenario()));
    }
    @AfterEach void retirarSoloFixturesPropios() {
        if(scenarioId==null || jdbc==null)return;
        jdbc.update("DELETE FROM simulation_outbox_deliveries WHERE event_id IN (SELECT event_id FROM simulation_outbox WHERE aggregate_id IN (SELECT id FROM simulation_runs WHERE scenario_id = ?))",scenarioId);
        jdbc.update("DELETE FROM simulation_outbox WHERE aggregate_id IN (SELECT id FROM simulation_runs WHERE scenario_id = ?)",scenarioId);
        jdbc.update("DELETE FROM simulation_results WHERE simulation_id IN (SELECT id FROM simulation_runs WHERE scenario_id = ?)",scenarioId);
        jdbc.update("DELETE FROM simulation_runs WHERE scenario_id = ?",scenarioId);
        jdbc.update("DELETE FROM simulation_scenarios WHERE id = ?",scenarioId);
    }
    @Test void eliminarEscenarioSinUsoYRepeticionDevuelve404() {
        var catalogo=new CatalogoEscenariosJdbc(jdbc,json);
        var casos=new com.stockquest.simulacion.escenarios.Application.GestionEscenarios(catalogo,tx);
        var gestor=new com.stockquest.simulacion.domain.UsuarioAutenticado("g",com.stockquest.simulacion.domain.UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO);
        casos.eliminar(gestor,scenarioId);assertTrue(catalogo.publicado(scenarioId).isEmpty());
        assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->casos.eliminar(gestor,scenarioId)).tipo());
    }
    @Test void eliminarEscenarioConPartidaConservaSnapshotYPartida() {
        var run=partidas.iniciar(Fixtures.aprendiz(),scenarioId);
        var casos=new com.stockquest.simulacion.escenarios.Application.GestionEscenarios(new CatalogoEscenariosJdbc(jdbc,json),tx);
        var gestor=new com.stockquest.simulacion.domain.UsuarioAutenticado("g",com.stockquest.simulacion.domain.UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO);
        assertEquals(Fallo.Tipo.CONFLICTO,assertThrows(Fallo.class,()->casos.eliminar(gestor,scenarioId)).tipo());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM simulation_runs WHERE id=?",Integer.class,run.id()));
        assertTrue(new CatalogoEscenariosJdbc(jdbc,json).publicado(scenarioId).isPresent());
    }
    @Test void dosDecisionesConcurrentesProducenUnExitoYUnConflicto() throws Exception {
        var run=partidas.iniciar(Fixtures.aprendiz(),scenarioId);
        var start=new CountDownLatch(1); var pool=Executors.newFixedThreadPool(2);
        try {
            var task=(java.util.concurrent.Callable<Integer>)()->{
                if(!start.await(5,TimeUnit.SECONDS))throw new IllegalStateException("Barrier timeout");
                try { decisiones.ejecutar(Fixtures.aprendiz(),run.id(),0,10,"concurrent"); return 200; }
                catch(Fallo e){if(e.tipo()==Fallo.Tipo.CONFLICTO)return 409;throw e;}
            };
            var a=pool.submit(task);var b=pool.submit(task);start.countDown();
            assertEquals(List.of(200,409),java.util.stream.Stream.of(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS)).sorted().toList());
            assertEquals(1,partidas.obtener(Fixtures.aprendiz(),run.id()).day());
        } finally { pool.shutdownNow(); assertTrue(pool.awaitTermination(10,TimeUnit.SECONDS)); }
    }
    @Test void falloDeOutboxRevierteDiaYResultadoYPermiteReintento() throws Exception {
        var run=partidas.iniciar(Fixtures.aprendiz(),scenarioId);
        decisiones.ejecutar(Fixtures.aprendiz(),run.id(),0,10,"a"); decisiones.ejecutar(Fixtures.aprendiz(),run.id(),1,0,"b");
        var failing=new RegistrarDecision(repo,tx,event->{throw new IllegalStateException("Outbox failure fixture");},Clock.systemUTC());
        assertThrows(IllegalStateException.class,()->failing.ejecutar(Fixtures.aprendiz(),run.id(),2,0,"c"));
        Partida after=partidas.obtener(Fixtures.aprendiz(),run.id()); assertEquals(2,after.day()); assertNull(after.result());
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM simulation_results WHERE simulation_id = ?",Integer.class,run.id()));
        var done=decisiones.ejecutar(Fixtures.aprendiz(),run.id(),2,0,"d");
        assertNotNull(done.result()); assertEquals(6,done.result().profit());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM simulation_results WHERE simulation_id = ?",Integer.class,run.id()));
        var event=new ObjectMapper().readTree(jdbc.queryForObject("SELECT payload::text FROM simulation_outbox WHERE aggregate_id = ?",String.class,run.id()));
        assertEquals("SimulacionFinalizada",event.path("type").asText()); assertEquals(86,event.path("data").path("score").asInt());
        assertEquals(3,event.path("aggregateVersion").asInt());
    }
    @Test void snapshotYPropiedadSeConservan() {
        var run=partidas.iniciar(Fixtures.aprendiz(),scenarioId);
        jdbc.update("UPDATE simulation_scenarios SET parameters = jsonb_set(parameters,'{initialStock}','999') WHERE id = ?",scenarioId);
        jdbc.update("UPDATE simulation_scenarios SET parameters = jsonb_set(parameters,'{title}','\"Editado\"') WHERE id = ?",scenarioId);
        assertEquals(10,partidas.obtener(Fixtures.aprendiz(),run.id()).snapshot().initialStock());
        assertEquals("Test",partidas.obtener(Fixtures.aprendiz(),run.id()).snapshot().title());
        assertEquals("Editado",partidas.historial(Fixtures.aprendiz()).stream().filter(entry -> entry.partida().id().equals(run.id())).findFirst().orElseThrow().scenarioTitle());
        assertTrue(repo.propia(run.id(),"other-user").isEmpty());
    }
    @Test void resumenIncluyeMasDeCienPartidas() {
        jdbc.update("""
            INSERT INTO simulation_runs(id,user_id,scenario_id,snapshot,decisions,day,created_at)
            SELECT ?||n::text,'learner-1',?,?::jsonb,'[10,0,0]'::jsonb,3,CURRENT_TIMESTAMP FROM generate_series(1,101) n
            """,scenarioId,scenarioId,json.escribir(Fixtures.escenario()));
        jdbc.update("""
            INSERT INTO simulation_results(id,simulation_id,score,profit,service_rate,feedback,timeline,created_at)
            SELECT 'result-'||id,id,86,6,0.8,'fixture','[]'::jsonb,CURRENT_TIMESTAMP FROM simulation_runs WHERE scenario_id=?
            """,scenarioId);
        var summary=repo.resumen("learner-1");
        assertEquals(101,summary.completedCount());assertEquals(8686,summary.scoreTotal());assertTrue(summary.hasPassingRun());assertNotNull(summary.firstCompletedAt());
    }
    @Test void dispatcherConfirmaEntregaRealYNoRepiteEventoEntregado() throws Exception {
        var run=partidas.iniciar(Fixtures.aprendiz(),scenarioId);
        decisiones.ejecutar(Fixtures.aprendiz(),run.id(),0,10,"a");decisiones.ejecutar(Fixtures.aprendiz(),run.id(),1,0,"b");decisiones.ejecutar(Fixtures.aprendiz(),run.id(),2,0,"c");
        var requests=new AtomicInteger();var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        String token="phase5-event-integration-token-exclusive";
        server.createContext("/internal/events",exchange->{
            var payload=new ObjectMapper().readTree(exchange.getRequestBody());
            if(!token.equals(exchange.getRequestHeaders().getFirst("X-StockQuest-Event-Token"))||!run.id().equals(payload.path("aggregateId").asText())) {
                exchange.sendResponseHeaders(400,-1);
            } else {requests.incrementAndGet();exchange.sendResponseHeaders(204,-1);}
            exchange.close();
        });server.start();
        try {
            var dispatcher=new OutboxDispatcher(jdbc,manager,URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/internal/events"),token);
            dispatcher.enviarPendientes();dispatcher.enviarPendientes();
            assertEquals(1,requests.get());
            assertEquals("DELIVERED",jdbc.queryForObject("SELECT status FROM simulation_outbox WHERE aggregate_id=?",String.class,run.id()));
        } finally {server.stop(0);}
    }
}
