package com.stockquest.aprendizaje;

import com.stockquest.aprendizaje.Infrastructure.*;
import com.stockquest.aprendizaje.Application.*;
import com.stockquest.aprendizaje.contenidos.Application.*;
import com.stockquest.aprendizaje.contenidos.Infrastructure.*;
import com.stockquest.aprendizaje.evaluaciones.Application.*;
import com.stockquest.aprendizaje.evaluaciones.Infrastructure.*;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.progreso.Infrastructure.*;
import com.stockquest.aprendizaje.progreso.domain.*;
import com.stockquest.aprendizaje.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.junit.jupiter.api.*;
import java.net.URI;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class PersistenciaAprendizajeIT {
    static JdbcTemplate jdbc;static UnidadDeTrabajoJdbc tx;static CatalogoFormativoJdbc catalogo;static RegistroProgresoJdbc registro;static IntentosJdbc intentos;static HechosAprendizajeJdbc hechos;
    static Clock clock=Clock.systemUTC();String moduleId,firstId,secondId,challengeId,userId;
    RutaAprendizaje ruta;ResponderDesafio responder;CompletarLeccion completar;UsuarioAutenticado user;
    @BeforeAll static void conectar() {
        String url=required("SQ_LEARNING_TEST_JDBC_URL");
        if(!url.startsWith("jdbc:postgresql://"))throw new IllegalStateException("Usa JDBC PostgreSQL para las IT.");
        var parsed=URI.create(url.substring(5));
        if(!parsed.getPath().matches("/(stockquest_test_learning|sq_test_learning_[A-Za-z0-9_]+)"))
            throw new IllegalStateException("Usa una base exclusiva stockquest_test_learning o sq_test_learning_*; no reutilices las bases de simulación/backend.");
        var ds=new DriverManagerDataSource(url,required("SQ_LEARNING_TEST_DB_USER"),required("SQ_LEARNING_TEST_DB_PASSWORD"));
        Flyway.configure().dataSource(ds).cleanDisabled(true).load().migrate();jdbc=new JdbcTemplate(ds);tx=new UnidadDeTrabajoJdbc(new DataSourceTransactionManager(ds));
        var json=new JsonPersistencia(new ObjectMapper().registerModule(new JavaTimeModule()));
        catalogo=new CatalogoFormativoJdbc(jdbc,json);registro=new RegistroProgresoJdbc(jdbc);intentos=new IntentosJdbc(jdbc);hechos=new HechosAprendizajeJdbc(jdbc,json);
    }
    static String required(String name) {String v=System.getenv(name);if(v==null||v.isBlank())throw new IllegalStateException("Falta "+name);return v;}
    @BeforeEach void fixtures() {
        userId="it-"+UUID.randomUUID();user=new UsuarioAutenticado(userId,UsuarioAutenticado.Rol.APRENDIZ);
        int position=jdbc.queryForObject("SELECT COALESCE(MAX(position),0)+1 FROM learning_modules",Integer.class);
        moduleId=tx.ejecutar(()->catalogo.guardarModulo(null,"IT","Fixture",position,true)).id();
        firstId=tx.ejecutar(()->catalogo.guardarLeccion(null,moduleId,"Uno","Texto",1,5,"abcdefghijk")).id();
        secondId=tx.ejecutar(()->catalogo.guardarLeccion(null,moduleId,"Dos","Texto",2,5,null)).id();
        challengeId=tx.ejecutar(()->catalogo.guardarPregunta(null,firstId,"2+2",List.of("3","4"),1,"Cuatro")).id();
        ruta=new RutaAprendizaje(catalogo,registro);responder=new ResponderDesafio(catalogo,ruta,intentos,registro,tx,clock,hechos);completar=new CompletarLeccion(ruta,intentos,registro,tx,clock,hechos);
    }
    @AfterEach void limpiarSoloPropios() {
        if(jdbc==null||moduleId==null)return;
        jdbc.update("DELETE FROM learning_outbox WHERE user_id=?",userId);jdbc.update("DELETE FROM learning_versions WHERE user_id=?",userId);
        jdbc.update("DELETE FROM learning_simulation_inbox WHERE user_id=?",userId);jdbc.update("DELETE FROM learning_achievements WHERE user_id=?",userId);
        jdbc.update("DELETE FROM learning_progress WHERE user_id=?",userId);jdbc.update("DELETE FROM learning_attempts WHERE user_id=?",userId);
        jdbc.update("DELETE FROM learning_challenges WHERE lesson_id IN (SELECT id FROM learning_lessons WHERE module_id=?)",moduleId);
        jdbc.update("DELETE FROM learning_lessons WHERE module_id=?",moduleId);jdbc.update("DELETE FROM learning_modules WHERE id=?",moduleId);
    }
    @Test void flujoPersistidoDesbloqueaYNoDuplicaFinalizacion() {
        assertThrows(Fallo.class,()->ruta.leccion(userId,secondId));assertThrows(Fallo.class,()->completar.ejecutar(user,firstId,"it"));
        responder.ejecutar(user,challengeId,1,"it");completar.ejecutar(user,firstId,"it");completar.ejecutar(user,firstId,"it");
        assertTrue(ruta.leccion(userId,secondId).unlocked());
        assertEquals(1,count("learning_progress"));assertEquals(1,count("learning_achievements"));assertEquals(2,count("learning_outbox"));
    }
    @Test void xpConReintentosUsaMejorNotaYPromedioDelTemaUsaTodosLosIntentos() {
        responder.ejecutar(user,challengeId,0,"it");responder.ejecutar(user,challengeId,1,"it");
        var p=new ConsultarProgreso(catalogo,intentos,registro,id->new EstadoProgreso.ResumenSimulacion(id,0,0,false,null)).progreso(userId);
        assertEquals(20,p.xp());assertEquals(50,p.topics().stream().filter(t->t.id().equals(moduleId)).findFirst().orElseThrow().score());
    }
    @Test void falloDeOutboxRevierteIntento() {
        HechosAprendizaje broken=(u,t,d,f,c)->{throw new IllegalStateException("fixture rollback");};
        var command=new ResponderDesafio(catalogo,ruta,intentos,registro,tx,clock,broken);
        assertThrows(IllegalStateException.class,()->command.ejecutar(user,challengeId,1,"it"));assertEquals(0,count("learning_attempts"));
    }
    @Test void inboxConcurrenteDeduplicaYRechazaPayloadDistinto() throws Exception {
        var event=new EventoSimulacion(UUID.randomUUID(),"SimulacionFinalizada",1,"simulacion-logistica",clock.instant(),"sim-"+userId,3,"it",
                new EventoSimulacion.Datos("sim-"+userId,userId,"scenario",86,18,14.0/17,clock.instant()));
        var consumer=new RecibirSimulacion(registro,tx);var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        try {
            Callable<Void> task=()->{if(!start.await(5,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");consumer.ejecutar(event,"a".repeat(64));return null;};
            var first=pool.submit(task);var second=pool.submit(task);start.countDown();first.get(15,TimeUnit.SECONDS);second.get(15,TimeUnit.SECONDS);
        }finally{pool.shutdownNow();}
        assertEquals(1,count("learning_simulation_inbox"));assertEquals(1,count("learning_achievements"));
        assertEquals(Fallo.Tipo.CONFLICTO,assertThrows(Fallo.class,()->consumer.ejecutar(event,"b".repeat(64))).tipo());
    }
    @Test void completarConcurrentementePublicaUnSoloHecho() throws Exception {
        responder.ejecutar(user,challengeId,1,"it");var pool=Executors.newFixedThreadPool(2);
        try {
            var a=pool.submit(()->completar.ejecutar(user,firstId,"it"));var b=pool.submit(()->completar.ejecutar(user,firstId,"it"));
            a.get(15,TimeUnit.SECONDS);b.get(15,TimeUnit.SECONDS);
        }finally{pool.shutdownNow();}
        assertEquals(1,count("learning_progress"));assertEquals(2,count("learning_outbox"));
    }
    @Test void putSinYoutubeEliminaVideoYConflictoRevierteCambio() {
        assertEquals(1,ruta.leccion(userId,firstId).contents().size());
        tx.ejecutar(()->catalogo.guardarLeccion(firstId,moduleId,"Uno","Texto",1,5,null));
        assertTrue(ruta.leccion(userId,firstId).contents().isEmpty());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->tx.ejecutar(()->catalogo.guardarLeccion(firstId,moduleId,"Cambio","Texto",2,5,"abcdefghijk")));
        assertEquals("Uno",ruta.leccion(userId,firstId).title());
    }
    int count(String table) {
        if(!Set.of("learning_progress","learning_attempts","learning_achievements","learning_outbox","learning_simulation_inbox").contains(table))throw new IllegalArgumentException();
        return jdbc.queryForObject("SELECT count(*) FROM "+table+" WHERE user_id=?",Integer.class,userId);
    }
}
