package com.stockquest.simulacion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.stockquest.simulacion.Infrastructure.JsonHttp;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.escenarios.Application.CatalogoEscenarios;
import com.stockquest.simulacion.partidas.Application.*;
import com.stockquest.simulacion.partidas.Infrastructure.http.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PartidasHttpTest {
    private final RegistrarDecision decisiones=mock(RegistrarDecision.class);
    private MockMvc mvc;
    @BeforeEach void setup() {
        var mapper=new ObjectMapper().registerModule(new JavaTimeModule()); JsonHttp.configurar(mapper);
        var controller=new PartidasController(mock(GestionPartidas.class),decisiones,mock(CatalogoEscenarios.class));
        var filter=new FiltroIdentidad(token->{
            if (token==null) throw new Fallo(Fallo.Tipo.SIN_SESION,"Inicia sesión para continuar.");
            if ("Bearer unavailable".equals(token)) throw new Fallo(Fallo.Tipo.NO_DISPONIBLE,"El servicio de identidad no está disponible.");
            return Fixtures.aprendiz();
        },mapper);
        mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new ErroresHttp())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).addFilters(filter).build();
    }
    @Test void conservaRunDtoSinExponerDemandaFutura() throws Exception {
        when(decisiones.ejecutar(any(),eq("run-1"),eq(0),eq(10),any())).thenReturn(Fixtures.partida(List.of(10)));
        mvc.perform(post("/api/simulations/run-1/decisions").header("Authorization","Bearer test").contentType("application/json")
                .content("{\"day\":0,\"quantity\":10}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.day").value(1)).andExpect(jsonPath("$.pending[0].arrivalDay").value(3))
                .andExpect(jsonPath("$.timeline[0].stock").value(5)).andExpect(jsonPath("$.demand").doesNotExist())
                .andExpect(jsonPath("$.userId").doesNotExist()).andExpect(jsonPath("$.finished").value(false));
    }
    @Test void rechazaCamposExtraFraccionesYNumerosComoTexto() throws Exception {
        for(String body:List.of("{\"day\":0,\"quantity\":1,\"score\":100}","{\"day\":0.5,\"quantity\":1}","{\"day\":\"0\",\"quantity\":1}","{\"day\":0,\"quantity\":null}"))
            mvc.perform(post("/api/simulations/run-1/decisions").header("Authorization","Bearer test").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isString());
        verifyNoInteractions(decisiones);
    }
    @Test void conservaConflicto409() throws Exception {
        when(decisiones.ejecutar(any(),anyString(),anyInt(),anyInt(),anyString())).thenThrow(new Fallo(Fallo.Tipo.CONFLICTO,"La decisión ya fue procesada."));
        mvc.perform(post("/api/simulations/run-1/decisions").header("Authorization","Bearer test").contentType("application/json").content("{\"day\":0,\"quantity\":1}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("La decisión ya fue procesada."));
    }
    @Test void sinBearerNoAccedeAlCasoDeUso() throws Exception {
        mvc.perform(post("/api/simulations/run-1/decisions").contentType("application/json").content("{\"day\":0,\"quantity\":1}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").isString());
        verifyNoInteractions(decisiones);
    }
    @Test void identidadInaccesibleDevuelve503SinAutorizar() throws Exception {
        mvc.perform(post("/api/simulations/run-1/decisions").header("Authorization","Bearer unavailable")
                .contentType("application/json").content("{\"day\":0,\"quantity\":1}"))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.message").isString());
        verifyNoInteractions(decisiones);
    }
}
