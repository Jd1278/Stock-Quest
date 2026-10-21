package com.stockquest.aprendizaje.Infrastructure;

import com.stockquest.aprendizaje.Application.*;
import com.stockquest.aprendizaje.contenidos.Application.*;
import com.stockquest.aprendizaje.contenidos.Infrastructure.CatalogoFormativoJdbc;
import com.stockquest.aprendizaje.evaluaciones.Application.*;
import com.stockquest.aprendizaje.evaluaciones.Infrastructure.IntentosJdbc;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.progreso.Infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.net.URI;
import java.time.Clock;

@Configuration
public class ConfiguracionAprendizaje {
    @Bean Jackson2ObjectMapperBuilderCustomizer jsonEstricto() {return b->b.postConfigurer(JsonHttp::configurar);}
    @Bean Clock clock() {return Clock.systemUTC();}
    @Bean JsonPersistencia json(ObjectMapper mapper) {return new JsonPersistencia(mapper);}
    @Bean UnidadDeTrabajo tx(PlatformTransactionManager manager) {return new UnidadDeTrabajoJdbc(manager);}
    @Bean CatalogoFormativo catalogo(JdbcTemplate jdbc,JsonPersistencia json) {return new CatalogoFormativoJdbc(jdbc,json);}
    @Bean RegistroProgreso registro(JdbcTemplate jdbc) {return new RegistroProgresoJdbc(jdbc);}
    @Bean Intentos intentos(JdbcTemplate jdbc) {return new IntentosJdbc(jdbc);}
    @Bean RutaAprendizaje ruta(CatalogoFormativo c,RegistroProgreso p) {return new RutaAprendizaje(c,p);}
    @Bean AdministrarContenido administrarContenido(CatalogoFormativo c,UnidadDeTrabajo tx) {return new AdministrarContenido(c,tx);}
    @Bean AdministrarEvaluaciones administrarEvaluaciones(CatalogoFormativo c,UnidadDeTrabajo tx) {return new AdministrarEvaluaciones(c,tx);}
    @Bean HechosAprendizaje hechos(JdbcTemplate jdbc,JsonPersistencia json) {return new HechosAprendizajeJdbc(jdbc,json);}
    @Bean ResponderDesafio responder(CatalogoFormativo c,RutaAprendizaje r,Intentos i,RegistroProgreso p,UnidadDeTrabajo tx,Clock clock,HechosAprendizaje hechos) {return new ResponderDesafio(c,r,i,p,tx,clock,hechos);}
    @Bean CompletarLeccion completar(RutaAprendizaje r,Intentos i,RegistroProgreso p,UnidadDeTrabajo tx,Clock clock,HechosAprendizaje hechos) {return new CompletarLeccion(r,i,p,tx,clock,hechos);}
    @Bean ResultadosSimulacion resultados(@Value("${learning.simulation-url}") URI uri,@Value("${learning.simulation-token}") String token,ObjectMapper mapper) {return new ResultadosSimulacionHttp(uri,token,mapper);}
    @Bean ConsultarProgreso consultar(CatalogoFormativo c,Intentos i,RegistroProgreso p,ResultadosSimulacion s) {return new ConsultarProgreso(c,i,p,s);}
    @Bean RecibirSimulacion recibir(RegistroProgreso p,UnidadDeTrabajo tx,HechosAprendizaje hechos) {return new RecibirSimulacion(p,tx,hechos);}
    @Bean SnapshotsProgresoJdbc snapshots(JdbcTemplate jdbc,PlatformTransactionManager manager,ConsultarProgreso consultar,JsonPersistencia json) {return new SnapshotsProgresoJdbc(jdbc,manager,consultar,json);}
    @Bean IdentidadActual identidad(@Value("${learning.identity-me-url}") URI uri,ObjectMapper mapper) {return new IdentidadHttp(uri,mapper);}
    @Bean FilterRegistrationBean<FiltroIdentidad> identidadFiltro(IdentidadActual identidad,ObjectMapper mapper) {
        var r=new FilterRegistrationBean<>(new FiltroIdentidad(identidad,mapper));r.addUrlPatterns("/api/*","/internal/admin/*");r.setOrder(1);return r;
    }
    @Bean FilterRegistrationBean<FiltroServicio> servicioFiltro(@Value("${learning.service-token}") String token,ObjectMapper mapper) {
        var r=new FilterRegistrationBean<>(new FiltroServicio(token,mapper));r.addUrlPatterns("/internal/users/*","/internal/admin/*","/internal/learning-reports/*","/internal/progress-snapshots/*");r.setOrder(0);return r;
    }
}
