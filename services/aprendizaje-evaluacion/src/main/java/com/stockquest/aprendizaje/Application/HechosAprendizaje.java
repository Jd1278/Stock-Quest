package com.stockquest.aprendizaje.Application;

import java.time.Instant;
import java.util.Map;

public interface HechosAprendizaje {
    void registrar(String userId,String tipo,Map<String,Object> datos,Instant fecha,String correlationId);
}
