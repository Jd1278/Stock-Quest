package com.stockquest.personas.capacitacion.Application;

import com.stockquest.personas.capacitacion.domain.Grupo;
import java.util.*;

public interface Grupos {
 List<Grupo> delLider(String leaderId);
 Optional<Grupo> bloquearPropio(String leaderId,String id);
 Grupo crear(Grupo grupo);
 Grupo renombrar(Grupo grupo,String name);
 void eliminar(String id);
 boolean asignar(String groupId,String userId);
 boolean retirar(String groupId,String userId);
}
