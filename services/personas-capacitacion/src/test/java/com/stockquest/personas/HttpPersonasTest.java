package com.stockquest.personas;

import com.stockquest.personas.Infrastructure.*;
import com.stockquest.personas.identidad.Application.GestionIdentidad;
import com.stockquest.personas.identidad.Infrastructure.*;
import com.stockquest.personas.usuarios.domain.Persona;
import com.stockquest.personas.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HttpPersonasTest {
 GestionIdentidad identidad;MockMvc mvc;
 @BeforeEach void setup() {
  identidad=mock(GestionIdentidad.class);var mapper=new ObjectMapper().registerModule(new JavaTimeModule());JsonHttp.configurar(mapper);
  mvc=MockMvcBuilders.standaloneSetup(new IdentidadController(identidad)).setControllerAdvice(new ErroresHttp())
   .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).addFilters(new FiltroIdentidad(identidad,mapper)).build();
 }
 @Test void registerNoPermiteInyectarRol()throws Exception {
  mvc.perform(post("/api/auth/register").contentType("application/json").content("{\"name\":\"A\",\"document\":\"D\",\"email\":\"a@example.test\",\"company\":\"C\",\"password\":\"password-for-test\",\"role\":\"LIDER\"}"))
   .andExpect(status().isBadRequest());verifyNoInteractions(identidad);
 }
 @Test void registerExigeClave()throws Exception {
  mvc.perform(post("/api/auth/register").contentType("application/json").content("{\"name\":\"A\",\"document\":\"D\",\"email\":\"a@example.test\",\"company\":\"C\"}"))
   .andExpect(status().isBadRequest());verifyNoInteractions(identidad);
 }
 @Test void registroInvalidoEnBytesNoLlegaAlCasoDeUso()throws Exception {
  mvc.perform(post("/api/auth/register").contentType("application/json").content("{\"name\":\"A\",\"document\":\"D\",\"email\":\"a@example.test\",\"company\":\"C\",\"password\":\""+"á".repeat(37)+"\"}"))
   .andExpect(status().isBadRequest());verifyNoInteractions(identidad);
 }
 @Test void perfilNuncaExponeHashNiVersionNiLeaderId()throws Exception {
  when(identidad.autenticar("Bearer valid")).thenReturn(new Persona("u","A","D","a@example.test","C",null,"secret-hash",UsuarioAutenticado.Rol.APRENDIZ,true,9,Instant.EPOCH,"leader"));
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer valid")).andExpect(status().isOk())
   .andExpect(jsonPath("$.id").value("u")).andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.tokenVersion").doesNotExist()).andExpect(jsonPath("$.leaderId").doesNotExist());
 }
 @Test void filtroTraduceSesionRevocadaA401()throws Exception {
  when(identidad.autenticar("Bearer revoked")).thenThrow(new Fallo(Fallo.Tipo.SIN_SESION,"Sesión no disponible."));
  mvc.perform(get("/api/auth/me").header("Authorization","Bearer revoked")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Sesión no disponible."));
 }
}
