package com.stockquest.simulacion.escenarios.Application;

import java.util.List;
import java.util.Optional;
import com.stockquest.simulacion.escenarios.domain.Escenario;

public interface CatalogoEscenarios {
    Optional<Escenario> publicado(String id);
    List<Escenario> publicados();
    List<Escenario> todos();
    void guardar(Escenario escenario, boolean nuevo);
}
