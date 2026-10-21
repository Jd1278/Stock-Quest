package com.stockquest.aprendizaje;

import com.stockquest.aprendizaje.Application.*;
import com.stockquest.aprendizaje.contenidos.Application.*;
import com.stockquest.aprendizaje.contenidos.domain.ContenidoFormativo.*;
import com.stockquest.aprendizaje.evaluaciones.Application.*;
import com.stockquest.aprendizaje.evaluaciones.domain.Intento;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.progreso.domain.*;
import com.stockquest.aprendizaje.domain.*;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AprendizajeTest {
    CatalogoFormativo catalogo;RegistroProgreso registro;Intentos intentos;HechosAprendizaje hechos;RutaAprendizaje ruta;
    Clock clock=Clock.fixed(Instant.parse("2026-10-19T00:00:00Z"),ZoneOffset.UTC);
    UnidadDeTrabajo tx=new UnidadDeTrabajo(){public <T>T ejecutar(Supplier<T> work){return work.get();}};
    UsuarioAutenticado aprendiz=new UsuarioAutenticado("user",UsuarioAutenticado.Rol.APRENDIZ);
    Pregunta pregunta=new Pregunta("c","l1","Dos más dos",List.of("3","4"),1,"Es cuatro.");
    @BeforeEach void preparar() {
        catalogo=mock(CatalogoFormativo.class);registro=mock(RegistroProgreso.class);intentos=mock(Intentos.class);hechos=mock(HechosAprendizaje.class);
        var first=new Leccion("l1","m","Primera","Texto uno",1,5,List.of(new Video("v","l1","Video","abcdefghijk")),List.of(pregunta));
        var second=new Leccion("l2","m","Segunda","Texto reservado",2,5,List.of(),List.of(new Pregunta("c2","l2","Otra",List.of("A","B"),0,"Explicación")));
        when(catalogo.modulos(false)).thenReturn(List.of(new Modulo("m","Tema","Descripción",1,true,List.of(first,second))));
        when(catalogo.pregunta("c")).thenReturn(Optional.of(pregunta));
        when(registro.estado("user")).thenReturn(new EstadoProgreso(Set.of(),List.of()));
        when(intentos.delUsuario("user")).thenReturn(List.of());
        ruta=new RutaAprendizaje(catalogo,registro);
    }
    @Test void rutaOcultaMaterialBloqueado() {
        var lessons=ruta.ruta("user").getFirst().lessons();
        assertTrue(lessons.getFirst().unlocked());assertFalse(lessons.get(1).unlocked());
        assertEquals("",lessons.get(1).body());assertTrue(lessons.get(1).challenges().isEmpty());
        assertEquals(1,lessons.getFirst().challenges().size());
    }
    @Test void leccionBloqueadaDevuelve403() {
        assertEquals(Fallo.Tipo.PROHIBIDO,assertThrows(Fallo.class,()->ruta.leccion("user","l2")).tipo());
    }
    @Test void leccionInexistenteDevuelve404() {
        assertEquals(Fallo.Tipo.NO_ENCONTRADO,assertThrows(Fallo.class,()->ruta.leccion("user","missing")).tipo());
    }
    @Test void completarPrimeraDesbloqueaLaSegunda() {
        when(registro.estado("user")).thenReturn(new EstadoProgreso(Set.of("l1"),List.of()));
        assertTrue(ruta.leccion("user","l2").unlocked());
    }
    @Test void respuestaCorrectaRegistraIntentoYHecho() {
        when(intentos.registrar(any())).thenReturn(1);
        var result=new ResponderDesafio(catalogo,ruta,intentos,registro,tx,clock,hechos).ejecutar(aprendiz,"c",1,"test");
        assertEquals(100,result.score());assertTrue(result.passed());assertEquals(1,result.attempt());
        verify(registro).bloquearUsuario("user");verify(hechos).registrar(eq("user"),eq("DesafioRespondido"),anyMap(),eq(clock.instant()),eq("test"));
    }
    @Test void respuestaIncorrectaConservaFeedbackYPermiteReintento() {
        when(intentos.registrar(any())).thenReturn(2);
        var result=new ResponderDesafio(catalogo,ruta,intentos,registro,tx,clock,hechos).ejecutar(aprendiz,"c",0,"test");
        assertEquals(0,result.score());assertFalse(result.passed());assertEquals("Es cuatro.",result.feedback());assertEquals(2,result.attempt());
    }
    @Test void opcionFueraDeRangoNoPersiste() {
        assertThrows(Fallo.class,()->new ResponderDesafio(catalogo,ruta,intentos,registro,tx,clock,hechos).ejecutar(aprendiz,"c",2,"test"));
        verify(intentos,never()).registrar(any());verifyNoInteractions(hechos);
    }
    @Test void liderNoRespondeDesafios() {
        var leader=new UsuarioAutenticado("leader",UsuarioAutenticado.Rol.LIDER);
        assertEquals(Fallo.Tipo.PROHIBIDO,assertThrows(Fallo.class,()->new ResponderDesafio(catalogo,ruta,intentos,registro,tx,clock,hechos).ejecutar(leader,"c",1,"test")).tipo());
        verifyNoInteractions(intentos,hechos);
    }
    @Test void noCompletaSinAprobarTodosLosDesafios() {
        assertThrows(Fallo.class,()->new CompletarLeccion(ruta,intentos,registro,tx,clock,hechos).ejecutar(aprendiz,"l1","test"));
        verify(registro,never()).completar(anyString(),anyString(),any());
    }
    @Test void completarRepetidaNoPublicaOtroHecho() {
        when(intentos.delUsuario("user")).thenReturn(List.of(new Intento("a","user","c",1,100,clock.instant())));
        when(registro.completar("user","l1",clock.instant())).thenReturn(true,false);
        var complete=new CompletarLeccion(ruta,intentos,registro,tx,clock,hechos);
        complete.ejecutar(aprendiz,"l1","test");complete.ejecutar(aprendiz,"l1","test");
        verify(hechos,times(1)).registrar(eq("user"),eq("LeccionCompletada"),anyMap(),any(),eq("test"));
    }
    @Test void xpUsaMejorIntentoYTodosLosResultadosDeSimulacion() {
        when(registro.estado("user")).thenReturn(new EstadoProgreso(Set.of("l1"),List.of()));
        when(intentos.delUsuario("user")).thenReturn(List.of(new Intento("a","user","c",0,0,clock.instant()),new Intento("b","user","c",1,100,clock.instant()),new Intento("d","user","c",1,100,clock.instant())));
        ResultadosSimulacion sim=id->new EstadoProgreso.ResumenSimulacion(id,101,8686,true,clock.instant());
        var progress=new ConsultarProgreso(catalogo,intentos,registro,sim).progreso("user");
        assertEquals(8756,progress.xp());assertEquals(101,progress.simulations());assertEquals(67,progress.topics().getFirst().score());
        assertEquals(1,progress.achievements().size());assertFalse(progress.passed());
    }
    @Test void inboxDuplicadoNoConcedeLogroOtraVez() {
        var event=new EventoSimulacion(UUID.randomUUID(),"SimulacionFinalizada",1,"simulacion-logistica",clock.instant(),"sim",3,"test",
                new EventoSimulacion.Datos("sim","user","scenario",86,18,14.0/17,clock.instant()));
        when(registro.registrarEvento(anyString(),anyString(),anyString(),anyString())).thenReturn(true,false);
        var consumer=new RecibirSimulacion(registro,tx,hechos);consumer.ejecutar(event,"hash");consumer.ejecutar(event,"hash");
        verify(registro,times(1)).logro("user","PRIMERA_SIMULACION",clock.instant());
        verify(hechos,times(1)).registrar(eq("user"),eq("ResultadoSimulacionRegistrado"),anyMap(),eq(clock.instant()),eq("test"));
    }
}
