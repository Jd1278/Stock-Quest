package com.stockquest.personas;

import com.stockquest.personas.Infrastructure.*;
import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.Infrastructure.CapacitacionController;
import com.stockquest.personas.capacitacion.domain.Grupo;
import com.stockquest.personas.domain.UsuarioAutenticado;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import java.time.Instant;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HttpGruposTest {
 GestionGrupos grupos;MockMvc mvc;
 final UsuarioAutenticado lider=new UsuarioAutenticado("leader",UsuarioAutenticado.Rol.LIDER);
 @BeforeEach void preparar() {
  grupos=mock(GestionGrupos.class);
  var mapper=new ObjectMapper().registerModule(new JavaTimeModule());JsonHttp.configurar(mapper);
  mvc=MockMvcBuilders.standaloneSetup(new CapacitacionController(grupos,mock(ConsultarEquipo.class),mapper))
   .setControllerAdvice(new ErroresHttp()).setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).build();
 }
 @Test void crearNormalizaAntesDeComprobarLongitud()throws Exception {
  String name="a".repeat(100);
  when(grupos.crear(lider,name)).thenReturn(new Grupo("g",name,"leader",Instant.EPOCH,List.of()));
  mvc.perform(post("/api/groups").requestAttr(AtributosHttp.USUARIO,lider).contentType("application/json").content("{\"name\":\"  "+name+"  \"}"))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value(name));
  verify(grupos).crear(lider,name);
 }
 @Test void renombrarNormalizaAntesDeComprobarLongitud()throws Exception {
  String name="a".repeat(100);
  when(grupos.renombrar(lider,"g",name)).thenReturn(new Grupo("g",name,"leader",Instant.EPOCH,List.of()));
  mvc.perform(patch("/api/groups/g").requestAttr(AtributosHttp.USUARIO,lider).contentType("application/json").content("{\"name\":\"  "+name+"  \"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(name));
  verify(grupos).renombrar(lider,"g",name);
 }
 @Test void rechazaNombreVacioOLargoTrasNormalizar()throws Exception {
  for(String name:List.of("   ","a".repeat(101))) {
   mvc.perform(post("/api/groups").requestAttr(AtributosHttp.USUARIO,lider).contentType("application/json").content("{\"name\":\""+name+"\"}"))
    .andExpect(status().isBadRequest());
  }
  verifyNoInteractions(grupos);
 }
}
