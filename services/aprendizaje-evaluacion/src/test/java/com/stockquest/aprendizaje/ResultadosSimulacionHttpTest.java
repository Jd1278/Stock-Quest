package com.stockquest.aprendizaje;

import com.stockquest.aprendizaje.progreso.Infrastructure.ResultadosSimulacionHttp;
import com.stockquest.aprendizaje.domain.Fallo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class ResultadosSimulacionHttpTest {
    HttpServer server;URI origin;int status=200;
    AtomicReference<String> body=new AtomicReference<>();AtomicReference<String> token=new AtomicReference<>();
    String valid="{\"userId\":\"u\",\"completedCount\":101,\"scoreTotal\":8686,\"hasPassingRun\":true,\"firstCompletedAt\":\"2026-10-19T00:00:00Z\"}";
    @BeforeEach void start() throws Exception {
        body.set(valid);server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/internal/users/u/simulation-summary",e->{
            token.set(e.getRequestHeaders().getFirst("X-StockQuest-Service-Token"));
            byte[] bytes=body.get().getBytes(StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type","application/json");
            e.sendResponseHeaders(status,bytes.length);try(var out=e.getResponseBody()){out.write(bytes);}
        });server.start();origin=URI.create("http://127.0.0.1:"+server.getAddress().getPort());
    }
    @AfterEach void stop() {server.stop(0);}
    ResultadosSimulacionHttp adapter() {return new ResultadosSimulacionHttp(origin,"simulation-test-service-token-at-least32",new ObjectMapper());}
    @Test void resumenIncluyeMasDe100YPropagaCredencial() {
        var summary=adapter().resumen("u");assertEquals(101,summary.completedCount());assertEquals(8686,summary.scoreTotal());
        assertEquals("simulation-test-service-token-at-least32",token.get());
    }
    @Test void rechazaResumenAjeno() {
        body.set(valid.replace("\"u\"","\"other\""));assertEquals(Fallo.Tipo.NO_DISPONIBLE,assertThrows(Fallo.class,()->adapter().resumen("u")).tipo());
    }
    @Test void rechazaResumenNumericamenteInconsistente() {
        body.set(valid.replace("8686","10101"));assertThrows(Fallo.class,()->adapter().resumen("u"));
    }
    @Test void dependenciaCaidaNoSeConvierteEnCeroSimulaciones() {
        status=503;assertEquals(Fallo.Tipo.NO_DISPONIBLE,assertThrows(Fallo.class,()->adapter().resumen("u")).tipo());
    }
    @Test void prohibeDestinosInseguros() {
        assertThrows(IllegalArgumentException.class,()->new ResultadosSimulacionHttp(URI.create("http://example.test"),"token",new ObjectMapper()));
        assertThrows(IllegalArgumentException.class,()->new ResultadosSimulacionHttp(URI.create("http://127.0.0.1:4010/another"),"token",new ObjectMapper()));
    }
}
