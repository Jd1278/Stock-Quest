package com.stockquest.personas.usuarios.Infrastructure;

import com.stockquest.personas.usuarios.Application.GestionEquipo;
import com.stockquest.personas.identidad.Application.GestionIdentidad;
import com.stockquest.personas.usuarios.domain.DatosPersona;
import com.stockquest.personas.Infrastructure.AtributosHttp;
import com.stockquest.personas.domain.UsuarioAutenticado;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import java.util.Map;

@RestController @Validated
public class UsuariosController {
 public record RegistroEmpleado(@NotBlank @Size(max=100) String name,@NotBlank @Size(max=30) String document,
  @NotBlank @Email @Size(max=191) String email,@NotBlank @Size(max=100) String company,@NotNull @Size(min=10,max=72) String password) {
  public RegistroEmpleado {name=name==null?null:name.trim();document=document==null?null:document.trim();email=email==null?null:email.trim();company=company==null?null:company.trim();}
  DatosPersona.Registro datos() {return new DatosPersona.Registro(name,document,email,company,password);}
 }
 private final GestionIdentidad identidad;private final GestionEquipo equipo;
 public UsuariosController(GestionIdentidad i,GestionEquipo e) {this.identidad=i;this.equipo=e;}
 @PostMapping("/api/users") @ResponseStatus(HttpStatus.CREATED)
 public Object crear(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@Valid @RequestBody RegistroEmpleado b) {return identidad.registrar(b.datos(),u);}
 @PatchMapping("/api/users/{id}") public Object editar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,
  @RequestAttribute(AtributosHttp.CORRELACION) String correlation,@PathVariable @Size(min=1,max=100) String id,@RequestBody Map<String,Object> b) {return equipo.editar(u,id,b,correlation);}
}
