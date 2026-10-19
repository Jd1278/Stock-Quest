package com.stockquest.simulacion.partidas.Infrastructure.http;

import com.stockquest.simulacion.partidas.Application.PartidaRepository;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @Validated
public class ResumenInternoController {
    private final PartidaRepository partidas;
    public ResumenInternoController(PartidaRepository partidas) {this.partidas=partidas;}
    @GetMapping("/internal/users/{userId}/simulation-summary")
    public PartidaRepository.Resumen resumen(@PathVariable @Size(min=1,max=100) String userId) {return partidas.resumen(userId);}
}
