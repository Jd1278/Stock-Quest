package com.stockquest.simulacion;

import com.stockquest.simulacion.Application.UnidadDeTrabajo;
import com.stockquest.simulacion.domain.*;
import com.stockquest.simulacion.escenarios.Application.*;
import com.stockquest.simulacion.escenarios.domain.Escenario;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GestionEscenariosTest {
    private final CatalogoEscenarios catalogo=mock(CatalogoEscenarios.class);
    private final UnidadDeTrabajo tx=new UnidadDeTrabajo(){public <T>T ejecutar(Supplier<T> work){return work.get();}};
    private final GestionEscenarios casos=new GestionEscenarios(catalogo,tx);
    private final UsuarioAutenticado gestor=new UsuarioAutenticado("gestor",UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO);
    @Test void aprendizNoPuedeAdministrar() {
        assertEquals(Fallo.Tipo.PROHIBIDO,assertThrows(Fallo.class,()->casos.guardar(Fixtures.aprendiz(),null,Fixtures.escenario())).tipo());
        verifyNoInteractions(catalogo);
    }
    @Test void gestorCreaYActualizaSinCambiarSnapshotsDePartidas() {
        var nuevo=casos.guardar(gestor,null,Fixtures.escenario());
        verify(catalogo).guardar(nuevo,true);assertNotNull(nuevo.id());
        var editado=casos.guardar(gestor,nuevo.id(),Fixtures.escenario());verify(catalogo).guardar(editado,false);
    }
    @Test void listadoAdministrativoIncluyeNoPublicados() {
        when(catalogo.todos()).thenReturn(List.of(new Escenario("s",Fixtures.escenario())));
        assertEquals(1,casos.todos(gestor).size());verify(catalogo,never()).publicados();
    }
    @Test void demandaTodaCeroSeRechazaEnGestionAunqueMotorSeaRobusto() {
        var s=new ParametrosEscenario("Test","Cero",10,List.of(0,0,0),2,2,5,1,3,4,20,true);
        assertThrows(Fallo.class,()->casos.guardar(gestor,null,s));verifyNoInteractions(catalogo);
    }
}
