package com.stockquest.simulacion.partidas.Infrastructure.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockquest.simulacion.Application.IdentidadActual;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.domain.UsuarioAutenticado;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

public final class IdentidadHttp implements IdentidadActual {
    private final URI endpoint;
    private final HttpClient client;
    private final ObjectMapper mapper;
    public IdentidadHttp(URI endpoint, ObjectMapper mapper) {
        boolean local = Set.of("localhost", "127.0.0.1", "[::1]", "::1").contains(endpoint.getHost() == null ? "" : endpoint.getHost());
        if ((!"https".equals(endpoint.getScheme()) && !("http".equals(endpoint.getScheme()) && local))
                || endpoint.getUserInfo() != null || endpoint.getQuery() != null || endpoint.getFragment() != null || endpoint.getHost() == null)
            throw new IllegalArgumentException("El destino de identidad debe ser HTTPS o localhost HTTP, sin credenciales ni query.");
        this.endpoint = endpoint; this.mapper = mapper;
        client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).followRedirects(HttpClient.Redirect.NEVER).build();
    }
    @Override public UsuarioAutenticado resolver(String bearer) {
        if (bearer == null || !bearer.matches("Bearer [^\\s]+")) throw new Fallo(Fallo.Tipo.SIN_SESION, "Inicia sesión para continuar.");
        var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(2))
                .header("Authorization", bearer).header("Accept", "application/json").GET().build();
        try {
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401) throw new Fallo(Fallo.Tipo.SIN_SESION, "Sesión no disponible.");
            if (response.statusCode() != 200) throw unavailable();
            JsonNode user = mapper.readTree(response.body());
            if (user == null || !user.path("id").isTextual() || user.path("id").asText().isBlank()
                    || user.path("id").asText().length() > 100 || !user.path("active").isBoolean()
                    || !user.path("active").asBoolean() || !user.path("role").isTextual()) throw unavailable();
            try { return new UsuarioAutenticado(user.path("id").asText(), UsuarioAutenticado.Rol.valueOf(user.path("role").asText())); }
            catch (IllegalArgumentException e) { throw unavailable(); }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw unavailable();
        } catch (IOException e) { throw unavailable(); }
    }
    private static Fallo unavailable() { return new Fallo(Fallo.Tipo.NO_DISPONIBLE, "El servicio de identidad no está disponible."); }
}
