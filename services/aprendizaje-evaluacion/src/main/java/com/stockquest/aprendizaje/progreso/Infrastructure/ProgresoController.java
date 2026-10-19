package com.stockquest.aprendizaje.progreso.Infrastructure;

import com.stockquest.aprendizaje.Infrastructure.AtributosHttp;
import com.stockquest.aprendizaje.progreso.Application.*;
import com.stockquest.aprendizaje.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import java.util.*;

@RestController @Validated
public class ProgresoController {
    public record Consulta(@NotNull @Size(min=1,max=100) List<@NotBlank @Size(max=100) String> userIds) { }
    private final ConsultarProgreso consultar;private final CompletarLeccion completar;
    public ProgresoController(ConsultarProgreso consultar,CompletarLeccion completar) {this.consultar=consultar;this.completar=completar;}
    @GetMapping("/api/progress") public Object propio(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u) {return consultar.progreso(u.id());}
    @PostMapping("/api/lessons/{id}/complete") public Object completar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@RequestAttribute(AtributosHttp.CORRELACION) String correlationId,@PathVariable @Size(min=1,max=100) String id) {
        return Map.of("message",completar.ejecutar(u,id,correlationId));
    }
    // The authenticated edge checks team membership before making this service-only request.
    @GetMapping("/internal/users/{id}/learning-report") public Object informe(@PathVariable @Size(min=1,max=100) String id) {return consultar.informe(id);}
    @PostMapping("/internal/learning-reports/query") public Object equipo(@Valid @RequestBody Consulta b) {
        if(new HashSet<>(b.userIds()).size()!=b.userIds().size())throw Fallo.invalido("No repitas usuarios en la consulta.");
        return Map.of("reports",b.userIds().stream().map(consultar::informe).toList());
    }
}
