package com.stockquest.simulacion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockquest.simulacion.Infrastructure.JsonHttp;
import com.stockquest.simulacion.Application.UnidadDeTrabajo;
import com.stockquest.simulacion.domain.*;
import com.stockquest.simulacion.escenarios.Application.*;
import com.stockquest.simulacion.escenarios.Infrastructure.EscenariosController;
import com.stockquest.simulacion.partidas.Infrastructure.http.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import java.util.function.Supplier;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class EscenariosHttpTest {
    private final CatalogoEscenarios catalogo=mock(CatalogoEscenarios.class);
    private MockMvc mvc;
    private static final String BODY="""
        {"title":"Test","description":"Test","initialStock":10,"demand":[5,8,4],"leadTime":2,
         "unitCost":2,"salePrice":5,"holdingCost":1,"shortageCost":3,"orderCost":4,"maxOrder":20,"published":true}
        """;
    @BeforeEach void setup() {
        var mapper=new ObjectMapper();JsonHttp.configurar(mapper);
        var tx=new UnidadDeTrabajo(){public <T>T ejecutar(Supplier<T> work){return work.get();}};
        var controller=new EscenariosController(new GestionEscenarios(catalogo,tx));
        var filter=new FiltroIdentidad(token->"Bearer gestor".equals(token)
                ?new UsuarioAutenticado("g",UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO):Fixtures.aprendiz(),mapper);
        mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new ErroresHttp())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).addFilters(filter).build();
    }
    @Test void crearConservaRespuestaPlanaDeEscenario() throws Exception {
        mvc.perform(post("/api/admin/scenarios").header("Authorization","Bearer gestor").contentType("application/json").content(BODY))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").isString()).andExpect(jsonPath("$.demand[1]").value(8))
                .andExpect(jsonPath("$.unitCost").value(2)).andExpect(jsonPath("$.parametros").doesNotExist());
        verify(catalogo).guardar(any(),eq(true));
    }
    @Test void rechazaCoercionesNumericasBooleanasYCamposFaltantes() throws Exception {
        for(String body:List.of(BODY.replace("\"unitCost\":2","\"unitCost\":\"2\""),BODY.replace("\"published\":true","\"published\":\"true\""),
                BODY.replace("\"leadTime\":2,","")))
            mvc.perform(post("/api/admin/scenarios").header("Authorization","Bearer gestor").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest());
        verifyNoInteractions(catalogo);
    }
    @Test void aprendizNoPuedeEditarEscenarios() throws Exception {
        mvc.perform(put("/api/admin/scenarios/s").header("Authorization","Bearer aprendiz").contentType("application/json").content(BODY))
                .andExpect(status().isForbidden());verifyNoInteractions(catalogo);
    }
}
