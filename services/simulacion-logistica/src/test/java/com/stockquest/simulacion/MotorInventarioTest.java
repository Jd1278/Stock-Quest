package com.stockquest.simulacion;

import com.stockquest.simulacion.domain.*;
import com.stockquest.simulacion.partidas.domain.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class MotorInventarioTest {
    @Test void recepcionCostesYScoreCoincidenConTypeScript() {
        var result = MotorInventario.evaluar(Fixtures.escenario(), List.of(10,0,0));
        assertEquals(List.of(0,0,10), result.timeline().stream().map(MotorInventario.Dia::received).toList());
        assertEquals(List.of(5,0,6), result.timeline().stream().map(MotorInventario.Dia::stock).toList());
        assertEquals(3, result.lost()); assertEquals(14, result.sold()); assertEquals(6, result.profit());
        assertEquals(14.0/17, result.serviceRate(), 1e-12); assertEquals(86, result.score());
        assertEquals("Quedaron 3 unidades de demanda sin atender. Anticipa los pedidos 2 días y considera un stock de protección.", result.feedback());
    }
    @Test void pedidosFueraDelHorizonteSeCobran() {
        var base = MotorInventario.evaluar(Fixtures.escenario(), List.of(0,0,0));
        var late = MotorInventario.evaluar(Fixtures.escenario(), List.of(0,0,10));
        assertEquals(base.profit()-24, late.profit()); assertEquals(base.sold(), late.sold());
    }
    @Test void demandaCeroNoDividePorCero() {
        var s = new ParametrosEscenario("Cero", "Prueba interna",10,List.of(0,0,0),2,2,5,1,3,4,20,true);
        assertEquals(1, MotorInventario.evaluar(s, List.of(0,0,0)).serviceRate());
    }
    @Test void replayEsDeterministaYLasListasSonInmutables() {
        var s = Fixtures.escenario();
        assertEquals(MotorInventario.evaluar(s,List.of(5,5,5)),MotorInventario.evaluar(s,List.of(5,5,5)));
        assertThrows(UnsupportedOperationException.class, () -> s.demand().add(5));
    }
    @Test void inversionInicialSeIncluyeAntesDePrimeraDecision() {
        var e = MotorInventario.evaluar(Fixtures.escenario(),List.of());
        assertEquals(-20,e.profit()); assertEquals(10,e.stock()); assertTrue(e.timeline().isEmpty());
    }
    @Test void nuncaStockNegativoYScoreAcotado() {
        for (int stock=0;stock<30;stock++) {
            var s = new ParametrosEscenario("Test","Límites",stock,List.of(5,8,4),2,2,5,1,3,4,20,true);
            var e = MotorInventario.evaluar(s,List.of(0,20,0));
            assertTrue(e.timeline().stream().allMatch(d -> d.stock()>=0)); assertTrue(e.score()>=0 && e.score()<=100);
        }
    }
    @Test void rechazaCantidadMaximaYDiaRepetido() {
        assertEquals(Fallo.Tipo.INVALIDO, assertThrows(Fallo.class, () -> Fixtures.partida(List.of()).avanzar(0,21)).tipo());
        assertEquals(Fallo.Tipo.CONFLICTO, assertThrows(Fallo.class, () -> Fixtures.partida(List.of(1)).avanzar(0,1)).tipo());
        assertThrows(Fallo.class, () -> Fixtures.partida(List.of(1,1,1)).avanzar(3,1));
    }
    @Test void rechazaCostosNoFinitos() {
        assertThrows(Fallo.class, () -> new ParametrosEscenario("Test","Finito",10,List.of(5,8,4),2,Double.NaN,5,1,3,4,20,true));
    }
}
