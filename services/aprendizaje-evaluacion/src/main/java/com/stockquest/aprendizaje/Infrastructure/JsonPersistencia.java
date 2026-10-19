package com.stockquest.aprendizaje.Infrastructure;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class JsonPersistencia {
    private final ObjectMapper mapper;
    public JsonPersistencia(ObjectMapper mapper) { this.mapper = mapper; }
    public String escribir(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new IllegalStateException("No fue posible serializar datos de aprendizaje.", e); }
    }
    public <T> T leer(String value, Class<T> type) {
        try { return mapper.readValue(value, type); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Datos persistidos inválidos.", e); }
    }
    public <T> T leer(String value, TypeReference<T> type) {
        try { return mapper.readValue(value, type); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Datos persistidos inválidos.", e); }
    }
}
