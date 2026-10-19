package com.stockquest.personas.usuarios.Infrastructure;

import com.stockquest.personas.usuarios.Application.Personas;
import com.stockquest.personas.usuarios.domain.Persona;
import com.stockquest.personas.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.*;
import java.util.*;

public final class PersonasJdbc implements Personas {
 private final JdbcTemplate jdbc;
 public PersonasJdbc(JdbcTemplate jdbc) {this.jdbc=jdbc;}
 private Persona fila(ResultSet r,int n)throws SQLException {
  return new Persona(r.getString("id"),r.getString("name"),r.getString("document"),r.getString("email"),r.getString("company"),r.getString("phone"),r.getString("password_hash"),UsuarioAutenticado.Rol.valueOf(r.getString("role")),r.getBoolean("active"),r.getInt("token_version"),r.getTimestamp("created_at").toInstant(),r.getString("leader_id"));
 }
 @Override public Optional<Persona> porId(String id) {return jdbc.query("SELECT * FROM people_users WHERE id=?",this::fila,id).stream().findFirst();}
 @Override public Optional<Persona> porCorreo(String email) {return jdbc.query("SELECT * FROM people_users WHERE email=?",this::fila,email).stream().findFirst();}
 @Override public Optional<Persona> bloquear(String id) {return jdbc.query("SELECT * FROM people_users WHERE id=? FOR UPDATE",this::fila,id).stream().findFirst();}
 @Override public void crear(Persona p) {
  jdbc.update("INSERT INTO people_users VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",p.id(),p.name(),p.document(),p.email(),p.company(),p.phone(),p.passwordHash(),p.role().name(),p.active(),p.tokenVersion(),Timestamp.from(p.createdAt()),p.leaderId());
 }
 @Override public void actualizar(Persona p) {
  if(jdbc.update("UPDATE people_users SET name=?,email=?,company=?,phone=?,password_hash=?,active=?,token_version=? WHERE id=?",p.name(),p.email(),p.company(),p.phone(),p.passwordHash(),p.active(),p.tokenVersion(),p.id())!=1)throw new Fallo(Fallo.Tipo.NO_ENCONTRADO,"Usuario no encontrado.");
 }
 @Override public List<Persona.Perfil> equipo(String leaderId) {return jdbc.query("SELECT * FROM people_users WHERE leader_id=? AND role='APRENDIZ' ORDER BY created_at,id",this::fila,leaderId).stream().map(Persona::perfil).toList();}
}
