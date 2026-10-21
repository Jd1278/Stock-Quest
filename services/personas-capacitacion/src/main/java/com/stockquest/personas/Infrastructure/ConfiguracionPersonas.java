package com.stockquest.personas.Infrastructure;

import com.stockquest.personas.Application.*;
import com.stockquest.personas.identidad.Application.*;
import com.stockquest.personas.identidad.Infrastructure.*;
import com.stockquest.personas.usuarios.Application.*;
import com.stockquest.personas.usuarios.Infrastructure.PersonasJdbc;
import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.Infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.net.URI;
import java.time.Clock;

@Configuration
public class ConfiguracionPersonas {
 @Bean Clock clock() {return Clock.systemUTC();}
 @Bean Jackson2ObjectMapperBuilderCustomizer jsonEstricto() {return b->b.postConfigurer(JsonHttp::configurar);}
 @Bean JsonPersistencia json(ObjectMapper mapper) {return new JsonPersistencia(mapper);}
 @Bean UnidadDeTrabajo tx(PlatformTransactionManager manager) {return new UnidadDeTrabajoJdbc(manager);}
 @Bean Personas personas(JdbcTemplate jdbc) {return new PersonasJdbc(jdbc);}
 @Bean Grupos grupos(JdbcTemplate jdbc) {return new GruposJdbc(jdbc);}
 @Bean Claves claves() {return new ClavesBcrypt();}
 @Bean Tokens tokens(@Value("${people.jwt-secret}") String secret,@Value("${people.jwt-duration}") String duration,Clock clock) {return new TokensJwt(secret,duration,clock);}
 @Bean GestionIdentidad identidad(Personas p,Claves c,Tokens t,UnidadDeTrabajo tx,Clock clock) {return new GestionIdentidad(p,c,t,tx,clock);}
 @Bean HechosPersonas hechos(JdbcTemplate jdbc,JsonPersistencia json,Clock clock) {return new HechosPersonasJdbc(jdbc,json,clock);}
 @Bean GestionEquipo gestionarEquipo(Personas p,UnidadDeTrabajo tx,HechosPersonas hechos) {return new GestionEquipo(p,tx,hechos);}
 @Bean GestionGrupos gestionarGrupos(Grupos g,Personas p,UnidadDeTrabajo tx,HechosPersonas h,Clock clock) {return new GestionGrupos(g,p,tx,h,clock);}
 @Bean ProyeccionesProgreso proyecciones(JdbcTemplate jdbc,PlatformTransactionManager manager,JsonPersistencia json) {return new ProyeccionesProgresoJdbc(jdbc,manager,json);}
 @Bean FuenteSnapshots fuenteSnapshots(@Value("${people.learning-url}") URI url,@Value("${people.learning-token}") String token,ObjectMapper mapper) {return new FuenteSnapshotsHttp(url,token,mapper);}
 @Bean ConsultarInformesProyectados informesProyectados(ProyeccionesProgreso p,FuenteSnapshots f) {return new ConsultarInformesProyectados(p,f);}
 @Bean @Primary InformesAprendizaje informes(@Value("${people.learning-url}") URI url,@Value("${people.learning-token}") String token,ObjectMapper mapper,
   ConsultarInformesProyectados proyecciones,@Value("${people.reports-mode:http}") String mode) {
  if(!java.util.Set.of("http","projection").contains(mode))throw new IllegalArgumentException("Modo de informes inválido.");
  return mode.equals("projection")?proyecciones:new InformesAprendizajeHttp(url,token,mapper);
 }
 @Bean FilterRegistrationBean<FiltroServicio> servicioFiltro(@Value("${people.service-token}") String token,ObjectMapper mapper) {
  var r=new FilterRegistrationBean<>(new FiltroServicio(token,mapper));r.addUrlPatterns("/internal/progress-events","/internal/progress-projections/*");r.setOrder(0);return r;
 }
 @Bean ConsultarEquipo consultarEquipo(Personas p,InformesAprendizaje i) {return new ConsultarEquipo(p,i);}
 @Bean FilterRegistrationBean<FiltroIdentidad> identidadFiltro(GestionIdentidad identidad,ObjectMapper mapper) {
  var r=new FilterRegistrationBean<>(new FiltroIdentidad(identidad,mapper));r.addUrlPatterns("/api/*");r.setOrder(1);return r;
 }
}
