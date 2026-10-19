package com.stockquest.aprendizaje.evaluaciones.Application;

import com.stockquest.aprendizaje.evaluaciones.domain.Intento;
import java.util.List;

public interface Intentos {
    List<Intento> delUsuario(String userId);
    int registrar(Intento intento);
}
