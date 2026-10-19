package com.stockquest.simulacion.partidas.Application;

import com.stockquest.simulacion.Application.UnidadDeTrabajo;
import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.domain.UsuarioAutenticado;
import com.stockquest.simulacion.escenarios.Application.CatalogoEscenarios;
import com.stockquest.simulacion.partidas.domain.Partida;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

public final class GestionPartidas {
    private final PartidaRepository partidas;
    private final CatalogoEscenarios escenarios;
    private final UnidadDeTrabajo transacciones;
    private final Clock clock;
    public GestionPartidas(PartidaRepository partidas, CatalogoEscenarios escenarios, UnidadDeTrabajo transacciones, Clock clock) {
        this.partidas = partidas; this.escenarios = escenarios; this.transacciones = transacciones; this.clock = clock;
    }
    public Partida iniciar(UsuarioAutenticado usuario, String scenarioId) {
        usuario.exigirAprendiz();
        return transacciones.ejecutar(() -> {
            var escenario = escenarios.publicado(scenarioId).orElseThrow(() -> new Fallo(Fallo.Tipo.NO_ENCONTRADO, "Escenario no disponible."));
            var partida = new Partida(UUID.randomUUID().toString(), usuario.id(), scenarioId, escenario.parametros(), List.of(), 0, clock.instant(), null);
            partidas.crear(partida); return partida;
        });
    }
    public Partida obtener(UsuarioAutenticado usuario, String id) {
        return partidas.propia(id, usuario.id()).orElseThrow(() -> new Fallo(Fallo.Tipo.NO_ENCONTRADO, "Simulación no encontrada."));
    }
    public List<PartidaRepository.RegistroHistorial> historial(UsuarioAutenticado usuario) { return partidas.historial(usuario.id()); }
}
