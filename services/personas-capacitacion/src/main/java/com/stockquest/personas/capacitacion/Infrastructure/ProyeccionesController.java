package com.stockquest.personas.capacitacion.Infrastructure;
import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.domain.EventoProgreso;
import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
public class ProyeccionesController {
 public record Consulta(@NotNull @Size(min=1,max=100) List<@NotBlank @Size(max=100) String> userIds) { }
 private final ProyeccionesProgreso proyecciones;private final ConsultarInformesProyectados informes;private final Personas personas;private final ObjectMapper mapper;
 public ProyeccionesController(ProyeccionesProgreso p,ConsultarInformesProyectados i,Personas personas,ObjectMapper mapper) {
  proyecciones=p;informes=i;this.personas=personas;this.mapper=mapper.copy().enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES,DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES);
 }
 @PostMapping("/internal/progress-events") @ResponseStatus(HttpStatus.NO_CONTENT)
 public void recibir(@RequestBody JsonNode body) {
  try{proyecciones.recibir(mapper.treeToValue(body,EventoProgreso.class));}
  catch(com.fasterxml.jackson.core.JsonProcessingException|IllegalArgumentException e){throw Fallo.invalido("Evento de progreso inválido.");}
 }
 @PostMapping("/internal/progress-projections/rebuild") @ResponseStatus(HttpStatus.NO_CONTENT)
 public void reconstruir(@Valid @RequestBody Consulta b) {
  if(new HashSet<>(b.userIds()).size()!=b.userIds().size())throw Fallo.invalido("No repitas usuarios.");
  for(String id:b.userIds())if(personas.porId(id).isEmpty())throw new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Usuario no encontrado.");
  informes.reconstruir(b.userIds());
 }
}
