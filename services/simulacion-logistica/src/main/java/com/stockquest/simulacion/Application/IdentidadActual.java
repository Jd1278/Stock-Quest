package com.stockquest.simulacion.Application;

import com.stockquest.simulacion.domain.UsuarioAutenticado;

public interface IdentidadActual {
    UsuarioAutenticado resolver(String bearer);
}
