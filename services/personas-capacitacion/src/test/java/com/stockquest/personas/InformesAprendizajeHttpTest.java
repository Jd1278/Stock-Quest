package com.stockquest.personas;

import com.stockquest.personas.capacitacion.Infrastructure.InformesAprendizajeHttp;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class InformesAprendizajeHttpTest {
 HttpServer server;URI origin;String body;int status=200;
 String valid="{\"reports\":[{\"userId\":\"u\",\"progress\":{\"completed\":1,\"total\":1,\"percent\":100,\"xp\":156.0,\"level\":1,\"topics\":[],\"achievements\":[],\"simulations\":1,\"passed\":true,\"recommendations\":[]},\"activities\":[]}]}";
 @BeforeEach void start()throws Exception {
  body=valid;server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);server.createContext("/internal/learning-reports/query",e->{byte[] data=body.getBytes(StandardCharsets.UTF_8);e.sendResponseHeaders(status,data.length);try(var out=e.getResponseBody()){out.write(data);}});server.start();origin=URI.create("http://127.0.0.1:"+server.getAddress().getPort());
 }
 @AfterEach void stop() {server.stop(0);}
 InformesAprendizajeHttp adapter() {return new InformesAprendizajeHttp(origin,"test-learning-service-token-at-least32",new ObjectMapper().registerModule(new JavaTimeModule()));}
 @Test void validaInformeConXpSerializadoComoDouble() {assertEquals(156,adapter().consultar(List.of("u")).getFirst().progress().xp());}
 @Test void rechazaUsuarioNoSolicitado() {body=valid.replace("\"u\"","\"other\"");assertThrows(Fallo.class,()->adapter().consultar(List.of("u")));}
 @Test void camposNumericosAusentesNoSeConviertenEnCero() {body=valid.replace("\"xp\":156.0,","");assertThrows(Fallo.class,()->adapter().consultar(List.of("u")));}
 @Test void indisponibilidadNoSeConvierteEnInformeVacio() {status=503;assertEquals(Fallo.Tipo.NO_DISPONIBLE,assertThrows(Fallo.class,()->adapter().consultar(List.of("u"))).tipo());}
}
