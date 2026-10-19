package com.stockquest.personas.usuarios.Application;

import com.stockquest.personas.usuarios.domain.Persona;
import java.util.*;

public interface Personas {
 Optional<Persona> porId(String id);
 Optional<Persona> porCorreo(String email);
 Optional<Persona> bloquear(String id);
 void crear(Persona persona);
 void actualizar(Persona persona);
 List<Persona.Perfil> equipo(String leaderId);
}
