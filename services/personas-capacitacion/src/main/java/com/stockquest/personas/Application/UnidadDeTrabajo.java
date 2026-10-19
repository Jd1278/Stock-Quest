package com.stockquest.personas.Application;

import java.util.function.Supplier;

public interface UnidadDeTrabajo {
    <T> T ejecutar(Supplier<T> trabajo);
}
