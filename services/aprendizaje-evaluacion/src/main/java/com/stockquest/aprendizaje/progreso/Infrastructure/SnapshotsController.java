package com.stockquest.aprendizaje.progreso.Infrastructure;
import com.stockquest.aprendizaje.progreso.Application.SnapshotsProgreso;
import com.stockquest.aprendizaje.domain.Fallo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
public class SnapshotsController {
 public record Consulta(@NotNull @Size(min=1,max=5) List<@NotBlank @Size(max=100) String> userIds) { }
 private final SnapshotsProgreso snapshots;
 public SnapshotsController(SnapshotsProgreso snapshots){this.snapshots=snapshots;}
 @PostMapping("/internal/progress-snapshots/query") public Object consultar(@Valid @RequestBody Consulta b){return resultado(b,false);}
 @PostMapping("/internal/progress-snapshots/replay") public Object replay(@Valid @RequestBody Consulta b){return resultado(b,true);}
 private Object resultado(Consulta b,boolean replay) {
  if(new HashSet<>(b.userIds()).size()!=b.userIds().size())throw Fallo.invalido("No repitas usuarios.");
  var events=b.userIds().stream().map(snapshots::capturar).toList();if(replay)b.userIds().forEach(snapshots::reintentar);
  return Map.of("snapshots",events);
 }
}
