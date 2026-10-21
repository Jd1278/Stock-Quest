package com.stockquest.personas;
import com.stockquest.personas.capacitacion.Infrastructure.FuenteSnapshotsHttp;
import com.stockquest.personas.Infrastructure.JsonHttp;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class FuenteSnapshotsHttpTest {
 HttpServer server;ObjectMapper mapper;String body;int code=200;
 @BeforeEach void start()throws Exception {
  mapper=new ObjectMapper().registerModule(new JavaTimeModule());JsonHttp.configurar(mapper);
  body=mapper.writeValueAsString(Map.of("snapshots",List.of(ProyeccionesProgresoTest.event("u",1,86))));
  server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/internal/progress-snapshots/query",e->{var bytes=body.getBytes(java.nio.charset.StandardCharsets.UTF_8);e.sendResponseHeaders(code,bytes.length);try(var out=e.getResponseBody()){out.write(bytes);}});server.start();
 }
 @AfterEach void stop(){server.stop(0);}
 FuenteSnapshotsHttp adapter(){return new FuenteSnapshotsHttp(URI.create("http://127.0.0.1:"+server.getAddress().getPort()),"learning-service-test-token-minimum32",mapper);}
 @Test void devuelveElSnapshotCompletoYVersionado(){assertEquals(86,adapter().consultar(List.of("u")).getFirst().data().progress().xp());}
 @Test void noAceptaUsuariosAjenosALaConsulta(){assertThrows(Fallo.class,()->adapter().consultar(List.of("other")));}
 @Test void camposAusentesNoSeInterpretanComoProgresoCero(){body=body.replace("\"xp\":86.0,","");assertThrows(Fallo.class,()->adapter().consultar(List.of("u")));}
 @Test void fuenteCaidaNoProduceUnaProyeccionVacia(){code=503;assertThrows(Fallo.class,()->adapter().consultar(List.of("u")));}
}
