package com.stockquest.simulacion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.partidas.Infrastructure.identity.IdentidadHttp;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class IdentidadHttpTest {
    private HttpServer server;
    private IdentidadHttp adapter;
    private final AtomicInteger status = new AtomicInteger(200);
    private final AtomicReference<String> body = new AtomicReference<>("{\"id\":\"learner-1\",\"active\":true,\"role\":\"APRENDIZ\"}");
    private final AtomicReference<String> authorization = new AtomicReference<>();
    @BeforeEach void setup() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/api/auth/me",exchange->{
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            var bytes=body.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(status.get(),bytes.length);
            try(var out=exchange.getResponseBody()){out.write(bytes);}
        });
        server.start();
        adapter=new IdentidadHttp(URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/api/auth/me"),new ObjectMapper());
    }
    @AfterEach void close() { server.stop(0); }
    @Test void consultaIdentidadEnCadaPeticionSinCache() {
        assertEquals(Fixtures.aprendiz(),adapter.resolver("Bearer token")); assertEquals("Bearer token",authorization.get());
        status.set(401);
        assertEquals(Fallo.Tipo.SIN_SESION,assertThrows(Fallo.class,()->adapter.resolver("Bearer token")).tipo());
    }
    @Test void errorORespuestaMalformadaEs503() {
        status.set(500);
        assertEquals(Fallo.Tipo.NO_DISPONIBLE,assertThrows(Fallo.class,()->adapter.resolver("Bearer token")).tipo());
        status.set(200); body.set("{\"id\":\"x\",\"role\":\"ADMIN\",\"active\":true}");
        assertEquals(Fallo.Tipo.NO_DISPONIBLE,assertThrows(Fallo.class,()->adapter.resolver("Bearer token")).tipo());
        body.set("not-json");
        assertEquals(Fallo.Tipo.NO_DISPONIBLE,assertThrows(Fallo.class,()->adapter.resolver("Bearer token")).tipo());
    }
    @Test void rechazaDestinoInseguroYBearerAusente() {
        assertThrows(IllegalArgumentException.class,()->new IdentidadHttp(URI.create("http://example.com/api/auth/me"),new ObjectMapper()));
        assertEquals(Fallo.Tipo.SIN_SESION,assertThrows(Fallo.class,()->adapter.resolver(null)).tipo());
    }
}
