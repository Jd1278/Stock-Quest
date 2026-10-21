package com.stockquest.aprendizaje.evaluaciones.Infrastructure;

import com.stockquest.aprendizaje.Infrastructure.AtributosHttp;
import com.stockquest.aprendizaje.evaluaciones.Application.AdministrarEvaluaciones;
import com.stockquest.aprendizaje.evaluaciones.Application.ResponderDesafio;
import com.stockquest.aprendizaje.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import java.util.List;

@RestController @Validated
public class DesafiosController {
    public record RespuestaEntrada(@NotNull @Min(0) @Max(5) Integer answer) { }
    public record DesafioEntrada(@NotBlank @Size(max=100) String lessonId,@NotBlank @Size(max=3000) String question,
            @NotNull @Size(min=2,max=6) List<@NotBlank @Size(max=500) String> options,
            @NotNull @Min(0) Integer correctIndex,@NotBlank @Size(max=3000) String explanation) { }
    private final AdministrarEvaluaciones administrar;private final ResponderDesafio responder;
    public DesafiosController(AdministrarEvaluaciones administrar,ResponderDesafio responder) {this.administrar=administrar;this.responder=responder;}
    @PostMapping("/api/challenges/{id}/attempts") public ResponseEntity<?> responder(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@RequestAttribute(AtributosHttp.CORRELACION) String correlationId,@PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody RespuestaEntrada b) {
        return ResponseEntity.status(201).body(responder.ejecutar(u,id,b.answer(),correlationId));
    }
    @PostMapping("/api/admin/challenges") public ResponseEntity<?> crear(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@Valid @RequestBody DesafioEntrada b) {return guardar(u,null,b);}
    @PutMapping("/api/admin/challenges/{id}") public ResponseEntity<?> editar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody DesafioEntrada b) {return guardar(u,id,b);}
    @DeleteMapping("/api/admin/challenges/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void eliminar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id) {administrar.eliminar(u,id);}
    private ResponseEntity<?> guardar(UsuarioAutenticado u,String id,DesafioEntrada b) {
        return ResponseEntity.status(id==null?201:200).body(administrar.guardar(u,id,b.lessonId(),b.question(),b.options(),b.correctIndex(),b.explanation()));
    }
}
