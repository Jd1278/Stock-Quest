package com.stockquest.aprendizaje.contenidos.Infrastructure;

import com.stockquest.aprendizaje.Infrastructure.AtributosHttp;
import com.stockquest.aprendizaje.contenidos.Application.*;
import com.stockquest.aprendizaje.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;

@RestController @Validated
public class ContenidoController {
    public record ModuloEntrada(@NotBlank @Size(max=150) String title,@NotBlank @Size(max=5000) String description,
                                @NotNull @Min(1) @Max(1000) Integer position,@NotNull Boolean published) { }
    public record LeccionEntrada(@NotBlank @Size(max=100) String moduleId,@NotBlank @Size(max=150) String title,
            @NotBlank @Size(max=20000) String body,@NotNull @Min(1) @Max(1000) Integer position,
            @NotNull @Min(1) @Max(120) Integer minutes,@Pattern(regexp="[\\w-]{11}") String youtubeId) { }
    private final AdministrarContenido administrar;private final RutaAprendizaje ruta;
    public ContenidoController(AdministrarContenido administrar,RutaAprendizaje ruta) {this.administrar=administrar;this.ruta=ruta;}
    @GetMapping("/api/modules") public Object ruta(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u) {return ruta.ruta(u.id());}
    @GetMapping("/api/lessons/{id}") public Object leccion(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id) {return ruta.leccion(u.id(),id);}
    @GetMapping("/internal/admin/modules") public Object todos(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u) {return administrar.todos(u);}
    @PostMapping("/api/admin/modules") public ResponseEntity<?> crearModulo(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@Valid @RequestBody ModuloEntrada b) {return guardarModulo(u,null,b);}
    @PutMapping("/api/admin/modules/{id}") public ResponseEntity<?> editarModulo(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody ModuloEntrada b) {return guardarModulo(u,id,b);}
    private ResponseEntity<?> guardarModulo(UsuarioAutenticado u,String id,ModuloEntrada b) {
        var m=administrar.modulo(u,id,b.title(),b.description(),b.position(),b.published());
        return ResponseEntity.status(id==null?201:200).body(java.util.Map.of("id",m.id(),"title",m.title(),"description",m.description(),"position",m.position(),"published",m.published()));
    }
    @PostMapping("/api/admin/lessons") public ResponseEntity<?> crearLeccion(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@Valid @RequestBody LeccionEntrada b) {return guardarLeccion(u,null,b);}
    @PutMapping("/api/admin/lessons/{id}") public ResponseEntity<?> editarLeccion(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody LeccionEntrada b) {return guardarLeccion(u,id,b);}
    private ResponseEntity<?> guardarLeccion(UsuarioAutenticado u,String id,LeccionEntrada b) {
        var l=administrar.leccion(u,id,b.moduleId(),b.title(),b.body(),b.position(),b.minutes(),b.youtubeId());
        return ResponseEntity.status(id==null?201:200).body(java.util.Map.of("id",l.id(),"moduleId",l.moduleId(),"title",l.title(),"body",l.body(),"position",l.position(),"minutes",l.minutes()));
    }
}
