package com.stockquest.aprendizaje;

import com.stockquest.aprendizaje.Infrastructure.*;
import com.stockquest.aprendizaje.contenidos.Application.*;
import com.stockquest.aprendizaje.contenidos.Infrastructure.ContenidoController;
import com.stockquest.aprendizaje.evaluaciones.Application.ResponderDesafio;
import com.stockquest.aprendizaje.evaluaciones.Application.AdministrarEvaluaciones;
import com.stockquest.aprendizaje.evaluaciones.Infrastructure.DesafiosController;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.progreso.Infrastructure.EventosController;
import com.stockquest.aprendizaje.Application.UnidadDeTrabajo;
import com.stockquest.aprendizaje.domain.UsuarioAutenticado;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HttpAprendizajeTest {
    MockMvc mvc;ResponderDesafio responder;RutaAprendizaje ruta;RecibirSimulacion recibir;
    UsuarioAutenticado user=new UsuarioAutenticado("u",UsuarioAutenticado.Rol.APRENDIZ);
    @BeforeEach void setup() {
        var mapper=new ObjectMapper().registerModule(new JavaTimeModule());JsonHttp.configurar(mapper);
        responder=mock(ResponderDesafio.class);ruta=mock(RutaAprendizaje.class);recibir=mock(RecibirSimulacion.class);
        var catalogo=mock(CatalogoFormativo.class);var tx=mock(UnidadDeTrabajo.class);
        mvc=MockMvcBuilders.standaloneSetup(new ContenidoController(new AdministrarContenido(catalogo,tx),ruta),new DesafiosController(new AdministrarEvaluaciones(catalogo,tx),responder),
                new EventosController(recibir,new JsonPersistencia(mapper),"test-event-token-at-least-32-characters"))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).setControllerAdvice(new ErroresHttp()).build();
    }
    @Test void soloGestorPuedeEliminarModulos()throws Exception {
        mvc.perform(delete("/api/admin/modules/m").requestAttr(AtributosHttp.USUARIO,user)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/modules/m").requestAttr(AtributosHttp.USUARIO,new UsuarioAutenticado("g",UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO)))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
    }
    @Test void soloGestorPuedeEliminarLeccionesYDesafios()throws Exception {
        for(String path:List.of("/api/admin/lessons/l","/api/admin/challenges/c")) {
            mvc.perform(delete(path).requestAttr(AtributosHttp.USUARIO,user)).andExpect(status().isForbidden());
            mvc.perform(delete(path).requestAttr(AtributosHttp.USUARIO,new UsuarioAutenticado("g",UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO)))
                    .andExpect(status().isNoContent()).andExpect(content().string(""));
        }
    }
    @Test void respuestasPublicasNoExponenSolucion() throws Exception {
        when(ruta.ruta("u")).thenReturn(List.of(new RutaAprendizaje.ModuloPublico("m","Tema","Texto",1,true,List.of(
                new RutaAprendizaje.LeccionPublica("l","m","Lección","Texto",1,5,List.of(),List.of(new RutaAprendizaje.PreguntaPublica("c","Pregunta",List.of("A","B"))),false,true)))));
        mvc.perform(get("/api/modules").requestAttr(AtributosHttp.USUARIO,user)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].lessons[0].challenges[0].correctIndex").doesNotExist())
                .andExpect(jsonPath("$[0].lessons[0].challenges[0].explanation").doesNotExist());
    }
    @Test void answerObligatorio() throws Exception {
        mvc.perform(post("/api/challenges/c/attempts").requestAttr(AtributosHttp.USUARIO,user).requestAttr(AtributosHttp.CORRELACION,"test")
                .contentType("application/json").content("{}" )).andExpect(status().isBadRequest());verifyNoInteractions(responder);
    }
    @Test void rechazaCoercionDeTipos() throws Exception {
        mvc.perform(post("/api/challenges/c/attempts").requestAttr(AtributosHttp.USUARIO,user).requestAttr(AtributosHttp.CORRELACION,"test")
                .contentType("application/json").content("{\"answer\":\"1\"}")).andExpect(status().isBadRequest());verifyNoInteractions(responder);
    }
    @Test void rechazaCamposDesconocidos() throws Exception {
        mvc.perform(post("/api/challenges/c/attempts").requestAttr(AtributosHttp.USUARIO,user).requestAttr(AtributosHttp.CORRELACION,"test")
                .contentType("application/json").content("{\"answer\":1,\"userId\":\"other\"}")).andExpect(status().isBadRequest());verifyNoInteractions(responder);
    }
    @Test void aprendizNoCreaContenido() throws Exception {
        mvc.perform(post("/api/admin/modules").requestAttr(AtributosHttp.USUARIO,user).contentType("application/json")
                .content("{\"title\":\"Tema\",\"description\":\"Texto\",\"position\":1,\"published\":true}")).andExpect(status().isForbidden());
    }
    private String evento() {return """
        {"eventId":"123e4567-e89b-42d3-a456-426614174000","type":"SimulacionFinalizada","schemaVersion":1,"producer":"simulacion-logistica",
        "occurredAt":"2026-10-19T00:00:00Z","aggregateId":"sim","aggregateVersion":3,"correlationId":"test",
        "data":{"simulationId":"sim","userId":"u","scenarioId":"s","score":86,"profit":18,"serviceRate":0.8,"completedAt":"2026-10-19T00:00:00Z"}}
        """;}
    @Test void eventoSinCredencialNoSeAplica() throws Exception {
        mvc.perform(post("/internal/events").contentType("application/json").content(evento())).andExpect(status().isUnauthorized());verifyNoInteractions(recibir);
    }
    @Test void eventoValidadoSeConfirmaCon204() throws Exception {
        mvc.perform(post("/internal/events").header("X-StockQuest-Event-Token","test-event-token-at-least-32-characters").contentType("application/json").content(evento())).andExpect(status().isNoContent());
        verify(recibir).ejecutar(any(),matches("[a-f0-9]{64}"));
    }
    @Test void eventoSinScoreNoSeInterpretaComoCero() throws Exception {
        mvc.perform(post("/internal/events").header("X-StockQuest-Event-Token","test-event-token-at-least-32-characters").contentType("application/json").content(evento().replace("\"score\":86,",""))).andExpect(status().isBadRequest());verifyNoInteractions(recibir);
    }
}
