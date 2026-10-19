package com.stockquest.simulacion.escenarios.Application;

import com.stockquest.simulacion.Application.UnidadDeTrabajo;
import com.stockquest.simulacion.domain.*;
import com.stockquest.simulacion.escenarios.domain.Escenario;
import java.util.List;
import java.util.UUID;

public final class GestionEscenarios {
    private final CatalogoEscenarios catalogo;
    private final UnidadDeTrabajo transacciones;
    public GestionEscenarios(CatalogoEscenarios catalogo, UnidadDeTrabajo transacciones) { this.catalogo=catalogo; this.transacciones=transacciones; }
    private void gestor(UsuarioAutenticado usuario) {
        if (usuario.role()!=UsuarioAutenticado.Rol.GESTOR_PEDAGOGICO) throw new Fallo(Fallo.Tipo.PROHIBIDO,"No tienes permiso para esta acción.");
    }
    public List<Escenario> todos(UsuarioAutenticado usuario) { gestor(usuario); return catalogo.todos(); }
    public Escenario guardar(UsuarioAutenticado usuario, String id, ParametrosEscenario parametros) {
        gestor(usuario);
        if (parametros.demand().stream().noneMatch(n -> n > 0)) throw Fallo.invalido("Incluye demanda positiva.");
        return transacciones.ejecutar(() -> {
            var escenario=new Escenario(id==null?UUID.randomUUID().toString():id,parametros);
            catalogo.guardar(escenario,id==null); return escenario;
        });
    }
}
