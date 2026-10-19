package com.stockquest.personas.usuarios.domain;

import com.stockquest.personas.domain.UsuarioAutenticado.Rol;
import java.time.Instant;

public record Persona(String id,String name,String document,String email,String company,String phone,
                      String passwordHash,Rol role,boolean active,int tokenVersion,Instant createdAt,String leaderId) {
 public record Perfil(String id,String name,String email,String document,String company,String phone,Rol role,boolean active,Instant createdAt) { }
 public Perfil perfil() {return new Perfil(id,name,email,document,company,phone,role,active,createdAt);}
 public Persona editar(String name,String email,String company,String phone,String passwordHash,boolean active,int version) {
     return new Persona(id,name,document,email,company,phone,passwordHash,role,active,version,createdAt,leaderId);
 }
}
