package com.stockquest.simulacion.partidas.Infrastructure.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockquest.simulacion.Application.IdentidadActual;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.Infrastructure.AtributosHttp;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

public final class FiltroIdentidad extends OncePerRequestFilter {
    public static final String USUARIO = AtributosHttp.USUARIO;
    public static final String CORRELACION = AtributosHttp.CORRELACION;
    private final IdentidadActual identidad;
    private final ObjectMapper mapper;
    public FiltroIdentidad(IdentidadActual identidad, ObjectMapper mapper) { this.identidad = identidad; this.mapper = mapper; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String id = request.getHeader("X-Correlation-Id");
        if (id == null || !id.matches("[A-Za-z0-9._-]{1,100}")) id = UUID.randomUUID().toString();
        request.setAttribute(CORRELACION, id); response.setHeader("X-Correlation-Id", id);
        try {
            request.setAttribute(USUARIO, identidad.resolver(request.getHeader("Authorization")));
        } catch (Fallo fallo) {
            response.setStatus(ErroresHttp.status(fallo)); response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
            mapper.writeValue(response.getWriter(), Map.of("message", fallo.getMessage())); return;
        }
        chain.doFilter(request, response);
    }
}
