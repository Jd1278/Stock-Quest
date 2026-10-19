package com.stockquest.simulacion.Infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockquest.simulacion.Application.*;
import com.stockquest.simulacion.escenarios.Application.CatalogoEscenarios;
import com.stockquest.simulacion.escenarios.Application.GestionEscenarios;
import com.stockquest.simulacion.escenarios.Infrastructure.CatalogoEscenariosJdbc;
import com.stockquest.simulacion.partidas.Application.*;
import com.stockquest.simulacion.partidas.Infrastructure.identity.IdentidadHttp;
import com.stockquest.simulacion.partidas.Infrastructure.persistence.*;
import com.stockquest.simulacion.partidas.Infrastructure.http.FiltroIdentidad;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.net.URI;
import java.time.Clock;

@Configuration
public class ConfiguracionSimulacion {
    @Bean Jackson2ObjectMapperBuilderCustomizer jsonHttpEstricto() { return builder -> builder.postConfigurer(JsonHttp::configurar); }
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean JsonPersistencia json(ObjectMapper mapper) { return new JsonPersistencia(mapper); }
    @Bean UnidadDeTrabajo transacciones(PlatformTransactionManager manager) { return new UnidadDeTrabajoJdbc(manager); }
    @Bean CatalogoEscenarios escenarios(JdbcTemplate jdbc, JsonPersistencia json) { return new CatalogoEscenariosJdbc(jdbc, json); }
    @Bean GestionEscenarios gestionEscenarios(CatalogoEscenarios escenarios,UnidadDeTrabajo tx) {return new GestionEscenarios(escenarios,tx);}
    @Bean PartidaRepository partidas(JdbcTemplate jdbc, JsonPersistencia json) { return new PartidaJdbc(jdbc, json); }
    @Bean Outbox outbox(JdbcTemplate jdbc, JsonPersistencia json) { return new OutboxJdbc(jdbc, json); }
    @Bean RegistrarDecision registrarDecision(PartidaRepository partidas, UnidadDeTrabajo tx, Outbox outbox, Clock clock) {
        return new RegistrarDecision(partidas, tx, outbox, clock);
    }
    @Bean GestionPartidas gestionPartidas(PartidaRepository partidas, CatalogoEscenarios escenarios, UnidadDeTrabajo tx, Clock clock) {
        return new GestionPartidas(partidas, escenarios, tx, clock);
    }
    @Bean IdentidadActual identidad(@Value("${simulation.identity-me-url}") URI endpoint, ObjectMapper mapper) { return new IdentidadHttp(endpoint, mapper); }
    @Bean FilterRegistrationBean<FiltroIdentidad> filtro(IdentidadActual identidad, ObjectMapper mapper) {
        var registration = new FilterRegistrationBean<>(new FiltroIdentidad(identidad, mapper));
        registration.addUrlPatterns("/api/simulations", "/api/simulations/*", "/api/admin/scenarios", "/api/admin/scenarios/*", "/internal/admin/*"); registration.setOrder(1);
        return registration;
    }
    @Bean FilterRegistrationBean<FiltroServicio> filtroServicio(@Value("${simulation.service-token}") String token,ObjectMapper mapper) {
        var registration=new FilterRegistrationBean<>(new FiltroServicio(token,mapper));
        registration.addUrlPatterns("/internal/*"); registration.setOrder(0);return registration;
    }
}
