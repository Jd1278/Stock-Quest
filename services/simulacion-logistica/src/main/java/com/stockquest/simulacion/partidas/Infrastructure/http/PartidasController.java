package com.stockquest.simulacion.partidas.Infrastructure.http;

import com.stockquest.simulacion.domain.UsuarioAutenticado;
import com.stockquest.simulacion.escenarios.Application.CatalogoEscenarios;
import com.stockquest.simulacion.partidas.Application.GestionPartidas;
import com.stockquest.simulacion.partidas.Application.RegistrarDecision;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
import com.stockquest.simulacion.partidas.domain.ResultadoSimulacion;

@RestController
@RequestMapping("/api/simulations")
@Validated
public class PartidasController {
    public record Iniciar(@NotBlank @Size(max = 100) String scenarioId) { }
    public record Decision(@NotNull @Min(0) @Max(29) Integer day, @NotNull @Min(0) @Max(10000) Integer quantity) { }
    public record EscenarioResumen(String id, String title, String description, int initialStock, int leadTime) { }
    public record TituloEscenario(String title) { }
    public record Historial(String id, int day, Instant createdAt, TituloEscenario scenario, ResultadoSimulacion result) { }
    private final GestionPartidas partidas;
    private final RegistrarDecision decisiones;
    private final CatalogoEscenarios escenarios;
    public PartidasController(GestionPartidas partidas, RegistrarDecision decisiones, CatalogoEscenarios escenarios) {
        this.partidas = partidas; this.decisiones = decisiones; this.escenarios = escenarios;
    }
    @GetMapping("/scenarios")
    public List<EscenarioResumen> escenarios() {
        return escenarios.publicados().stream().map(s -> new EscenarioResumen(s.id(), s.parametros().title(), s.parametros().description(),
                s.parametros().initialStock(), s.parametros().leadTime())).toList();
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public RunDto iniciar(@RequestAttribute(FiltroIdentidad.USUARIO) UsuarioAutenticado usuario, @Valid @RequestBody Iniciar body) {
        return RunDto.de(partidas.iniciar(usuario, body.scenarioId()));
    }
    @GetMapping("/{id}")
    public RunDto obtener(@RequestAttribute(FiltroIdentidad.USUARIO) UsuarioAutenticado usuario,
            @PathVariable @Size(min = 1, max = 100) String id) { return RunDto.de(partidas.obtener(usuario, id)); }
    @GetMapping
    public List<Historial> historial(@RequestAttribute(FiltroIdentidad.USUARIO) UsuarioAutenticado usuario) {
        return partidas.historial(usuario).stream().map(entry -> {
            var p = entry.partida();
            return new Historial(p.id(), p.day(), p.createdAt(), new TituloEscenario(entry.scenarioTitle()), p.result());
        }).toList();
    }
    @PostMapping("/{id}/decisions")
    public RunDto decidir(@RequestAttribute(FiltroIdentidad.USUARIO) UsuarioAutenticado usuario,
            @RequestAttribute(FiltroIdentidad.CORRELACION) String correlationId,
            @PathVariable @Size(min = 1, max = 100) String id, @Valid @RequestBody Decision body) {
        return RunDto.de(decisiones.ejecutar(usuario, id, body.day(), body.quantity(), correlationId));
    }
}
