package com.stockquest.personas.capacitacion.Infrastructure;

import com.stockquest.personas.capacitacion.Application.Grupos;
import com.stockquest.personas.capacitacion.domain.Grupo;
import com.stockquest.personas.usuarios.domain.Persona;
import com.stockquest.personas.domain.UsuarioAutenticado.Rol;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.*;
import java.util.*;

public final class GruposJdbc implements Grupos {
 private final JdbcTemplate jdbc;
 public GruposJdbc(JdbcTemplate jdbc) {this.jdbc=jdbc;}
 private Grupo fila(ResultSet r,int n)throws SQLException {
  return new Grupo(r.getString("id"),r.getString("name"),r.getString("leader_id"),r.getTimestamp("created_at").toInstant(),List.of());
 }
 private Grupo.Miembro miembro(ResultSet r,int n)throws SQLException {
  return new Grupo.Miembro(r.getString("group_id"),r.getString("id"),new Persona.Perfil(r.getString("id"),r.getString("name"),r.getString("email"),
   r.getString("document"),r.getString("company"),r.getString("phone"),Rol.valueOf(r.getString("role")),r.getBoolean("active"),r.getTimestamp("created_at").toInstant()));
 }
 private List<Grupo> conMiembros(List<Grupo> groups,String sql,Object... args) {
  if(groups.isEmpty())return groups;
  // The group result set is already closed: no connection is borrowed inside a row mapper.
  var members=new HashMap<String,List<Grupo.Miembro>>();
  for(var m:jdbc.query(sql,this::miembro,args))members.computeIfAbsent(m.groupId(),key->new ArrayList<>()).add(m);
  return groups.stream().map(g->new Grupo(g.id(),g.name(),g.leaderId(),g.createdAt(),members.getOrDefault(g.id(),List.of()))).toList();
 }
 @Override public List<Grupo> delLider(String id) {
  var groups=jdbc.query("SELECT * FROM people_groups WHERE leader_id=? ORDER BY created_at,id",this::fila,id);
  return conMiembros(groups,"SELECT m.group_id,u.* FROM people_memberships m JOIN people_groups g ON g.id=m.group_id JOIN people_users u ON u.id=m.user_id WHERE g.leader_id=? ORDER BY u.created_at,u.id",id);
 }
 @Override public Optional<Grupo> bloquearPropio(String leaderId,String id) {
  var groups=jdbc.query("SELECT * FROM people_groups WHERE leader_id=? AND id=? FOR UPDATE",this::fila,leaderId,id);
  return conMiembros(groups,"SELECT m.group_id,u.* FROM people_memberships m JOIN people_users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY u.created_at,u.id",id).stream().findFirst();
 }
 @Override public Grupo crear(Grupo g) {jdbc.update("INSERT INTO people_groups VALUES (?,?,?,?)",g.id(),g.name(),g.leaderId(),Timestamp.from(g.createdAt()));return g;}
 @Override public Grupo renombrar(Grupo g,String name) {jdbc.update("UPDATE people_groups SET name=? WHERE id=?",name,g.id());return new Grupo(g.id(),name,g.leaderId(),g.createdAt(),g.members());}
 @Override public void eliminar(String id) {jdbc.update("DELETE FROM people_groups WHERE id=?",id);}
 @Override public boolean asignar(String id,String userId) {return jdbc.update("INSERT INTO people_memberships VALUES (?,?) ON CONFLICT DO NOTHING",id,userId)==1;}
 @Override public boolean retirar(String id,String userId) {return jdbc.update("DELETE FROM people_memberships WHERE group_id=? AND user_id=?",id,userId)==1;}
}
