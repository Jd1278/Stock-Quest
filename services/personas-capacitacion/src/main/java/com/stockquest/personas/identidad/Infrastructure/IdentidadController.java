package com.stockquest.personas.identidad.Infrastructure;

import com.stockquest.personas.identidad.Application.GestionIdentidad;
import com.stockquest.personas.usuarios.domain.*;
import com.stockquest.personas.domain.UsuarioAutenticado;
import com.stockquest.personas.Infrastructure.AtributosHttp;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class IdentidadController {
 public record Registro(@NotBlank @Size(max=100) String name,@NotBlank @Size(max=30) String document,
  @NotBlank @Email @Size(max=191) String email,@NotBlank @Size(max=100) String company,@NotNull @Size(min=10,max=72) String password) {
  public Registro {name=name==null?null:name.trim();document=document==null?null:document.trim();email=email==null?null:email.trim();company=company==null?null:company.trim();}
  public DatosPersona.Registro datos() {return new DatosPersona.Registro(name,document,email,company,password);}
 }
 public record Login(@NotBlank @Email String email,@NotNull @Size(min=1,max=100) String password) {
  public Login {email=email==null?null:email.trim();}
 }
 private final GestionIdentidad identidad;
 public IdentidadController(GestionIdentidad identidad) {this.identidad=identidad;}
 @PostMapping("/api/auth/register") @ResponseStatus(HttpStatus.CREATED)
 public Object registrar(@Valid @RequestBody Registro b) {return identidad.registrar(b.datos(),null);}
 @PostMapping("/api/auth/login") public Object login(@Valid @RequestBody Login b) {return identidad.login(b.email(),b.password());}
 @GetMapping("/api/auth/me") public Object me(@RequestAttribute(FiltroIdentidad.PERFIL) Persona.Perfil p) {return p;}
 @PostMapping("/api/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
 public void logout(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u) {identidad.logout(u);}
 @PatchMapping("/api/users/me") public Object editar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado u,@RequestBody Map<String,Object> b) {return identidad.perfil(u,b);}
}
