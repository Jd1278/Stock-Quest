package com.stockquest.personas;
import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.domain.*;
import com.stockquest.personas.capacitacion.Infrastructure.ProyeccionesController;
import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.Infrastructure.*;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProyeccionesProgresoTest {
 ProyeccionesProgreso p=mock(ProyeccionesProgreso.class);FuenteSnapshots f=mock(FuenteSnapshots.class);
 ConsultarInformesProyectados informes=new ConsultarInformesProyectados(p,f);
 static InformeAprendizaje report(String id,int xp) {return new InformeAprendizaje(id,new InformeAprendizaje.Progreso(0,0,0,xp,1,List.of(),List.of(),0,false,List.of()),List.of());}
 static EventoProgreso event(String id,long version,int xp) {return new EventoProgreso(UUID.randomUUID(),"ProgresoActualizado",1,"aprendizaje-evaluacion",Instant.EPOCH,id,version,"test",report(id,xp));}
 @Test void proyeccionExistenteNoConsultaRedNiDependeDeAprendizaje() {
  var r=report("u",86);when(p.consultar("u")).thenReturn(Optional.of(r));
  assertEquals(List.of(r),informes.consultar(List.of("u")));verifyNoInteractions(f);
 }
 @Test void usuarioSinProyeccionSeInicializaConSnapshotSinInventarCeros() {
  var e=event("u",1,86);when(p.consultar("u")).thenReturn(Optional.empty(),Optional.of(e.data()));when(f.consultar(List.of("u"))).thenReturn(List.of(e));
  assertEquals(86,informes.consultar(List.of("u")).getFirst().progress().xp());verify(p).recibir(e);
 }
 @Test void fuenteIncompletaNoSeAceptaComoProgresoVacio() {
  when(f.consultar(List.of("u"))).thenReturn(List.of());assertThrows(Fallo.class,()->informes.reconstruir(List.of("u")));verify(p,never()).recibir(any());
 }
 @Test void snapshotDeOtroUsuarioNoSeAplica() {
  when(f.consultar(List.of("u"))).thenReturn(List.of(event("other",1,0)));assertThrows(Fallo.class,()->informes.reconstruir(List.of("u")));verify(p,never()).recibir(any());
 }
 @Test void versionYProductorSonParteDelContrato() {
  assertThrows(IllegalArgumentException.class,()->event("u",0,0));
  assertThrows(IllegalArgumentException.class,()->new EventoProgreso(UUID.randomUUID(),"ProgresoActualizado",1,"other",Instant.EPOCH,"u",1,"test",report("u",0)));
  assertThrows(IllegalArgumentException.class,()->new EventoProgreso(UUID.randomUUID(),"ProgresoActualizado",1,"aprendizaje-evaluacion",Instant.EPOCH,"u",1,"test",report("other",0)));
 }
 MockMvc mvc;ObjectMapper mapper;final String token="projection-event-test-token-minimum32";
 @BeforeEach void setupHttp() {
  mapper=new ObjectMapper().registerModule(new JavaTimeModule());JsonHttp.configurar(mapper);
  mvc=MockMvcBuilders.standaloneSetup(new ProyeccionesController(p,informes,mock(Personas.class),mapper)).setControllerAdvice(new ErroresHttp())
   .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).addFilters(new FiltroServicio(token,mapper)).build();
 }
 @Test void eventoExigeCredencialAntesDeProcesarJson()throws Exception {
  mvc.perform(post("/internal/progress-events").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());verifyNoInteractions(p);
 }
 @Test void eventoValidoSeConfirmaCon204()throws Exception {
  var e=event("u",1,86);mvc.perform(post("/internal/progress-events").header("X-StockQuest-Service-Token",token).contentType("application/json").content(mapper.writeValueAsString(e))).andExpect(status().isNoContent());verify(p).recibir(e);
 }
 @Test void xpAusenteNoSeConvierteEnCero()throws Exception {
  var node=mapper.valueToTree(event("u",1,86));((com.fasterxml.jackson.databind.node.ObjectNode)node.path("data").path("progress")).remove("xp");
  mvc.perform(post("/internal/progress-events").header("X-StockQuest-Service-Token",token).contentType("application/json").content(mapper.writeValueAsString(node))).andExpect(status().isBadRequest());verifyNoInteractions(p);
 }
 @Test void conflictosDelInboxConservan409()throws Exception {
  doThrow(new Fallo(Fallo.Tipo.CONFLICTO,"Conflict")).when(p).recibir(any());
  mvc.perform(post("/internal/progress-events").header("X-StockQuest-Service-Token",token).contentType("application/json").content(mapper.writeValueAsString(event("u",1,0)))).andExpect(status().isConflict());
 }
}
