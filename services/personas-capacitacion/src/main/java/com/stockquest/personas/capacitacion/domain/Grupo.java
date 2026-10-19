package com.stockquest.personas.capacitacion.domain;

import com.stockquest.personas.usuarios.domain.Persona;
import java.time.Instant;
import java.util.List;

public record Grupo(String id,String name,String leaderId,Instant createdAt,List<Miembro> members) {
 public Grupo {members=List.copyOf(members);}
 public record Miembro(String groupId,String userId,Persona.Perfil user) { }
 public record Membresia(String groupId,String userId) { }
}
