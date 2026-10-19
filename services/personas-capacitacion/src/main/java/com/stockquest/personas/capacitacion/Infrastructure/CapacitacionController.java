package com.stockquest.personas.capacitacion.Infrastructure;

import com.stockquest.personas.capacitacion.Application.*;
import com.stockquest.personas.capacitacion.domain.Grupo;
import com.stockquest.personas.Infrastructure.AtributosHttp;
import com.stockquest.personas.domain.UsuarioAutenticado;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import java.util.*;

@RestController @Validated
public class CapacitacionController {
 public record Nombre(@NotBlank @Size(max=100) String name) {
  public Nombre {if(name!=null)name=name.trim();}
 }
 public record Miembro(@NotBlank @Size(max=100) String userId) { }
 public record FilaGrupo(String id,String name,String leaderId,java.time.Instant createdAt) {
  static FilaGrupo de(Grupo g) {return new FilaGrupo(g.id(),g.name(),g.leaderId(),g.createdAt());}
 }
 private final GestionGrupos grupos;private final ConsultarEquipo equipo;private final ObjectMapper mapper;
 public CapacitacionController(GestionGrupos g,ConsultarEquipo e,ObjectMapper mapper) {this.grupos=g;this.equipo=e;this.mapper=mapper;}
 @GetMapping("/api/groups") public Object listar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u) {return grupos.listar(u);}
 @PostMapping("/api/groups") @ResponseStatus(HttpStatus.CREATED)
 public Object crear(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@Valid @RequestBody Nombre b) {return FilaGrupo.de(grupos.crear(u,b.name()));}
 @PatchMapping("/api/groups/{id}") public Object renombrar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody Nombre b) {return FilaGrupo.de(grupos.renombrar(u,id,b.name()));}
 @DeleteMapping("/api/groups/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
 public void eliminar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@RequestAttribute(AtributosHttp.CORRELACION) String c) {grupos.eliminar(u,id,c);}
 @PostMapping("/api/groups/{id}/members") public Object asignar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody Miembro b,@RequestAttribute(AtributosHttp.CORRELACION) String c) {return grupos.asignar(u,id,b.userId(),c);}
 @DeleteMapping("/api/groups/{id}/members/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT)
 public void retirar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@PathVariable @Size(min=1,max=100) String userId,@RequestAttribute(AtributosHttp.CORRELACION) String c) {grupos.retirar(u,id,userId,c);}
 @GetMapping("/api/reports") public Object equipo(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u) {return equipo.equipo(u).stream().map(r->reporte(r,false)).toList();}
 @GetMapping("/api/reports/{id}") public Object individual(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id) {return reporte(equipo.individual(u,id),true);}
 private Map<String,Object> reporte(ConsultarEquipo.Reporte r,boolean activities) {
  Map<String,Object> result=mapper.convertValue(r.user(),new TypeReference<LinkedHashMap<String,Object>>(){});
  result.put("progress",r.learning().progress());if(activities)result.put("activities",r.learning().activities());return result;
 }
}
