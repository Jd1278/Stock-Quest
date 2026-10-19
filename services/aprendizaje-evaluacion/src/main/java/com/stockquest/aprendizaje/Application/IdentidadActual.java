package com.stockquest.aprendizaje.Application;

import com.stockquest.aprendizaje.domain.UsuarioAutenticado;

public interface IdentidadActual {
    UsuarioAutenticado resolver(String bearer);
}
