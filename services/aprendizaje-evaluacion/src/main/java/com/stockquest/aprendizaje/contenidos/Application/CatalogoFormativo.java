package com.stockquest.aprendizaje.contenidos.Application;

import com.stockquest.aprendizaje.contenidos.domain.ContenidoFormativo.*;
import java.util.*;

public interface CatalogoFormativo {
    List<Modulo> modulos(boolean incluirBorradores);
    Optional<Pregunta> pregunta(String id);
    Modulo guardarModulo(String id,String title,String description,int position,boolean published);
    void eliminarModulo(String id);
    void eliminarLeccion(String id);
    void eliminarPregunta(String id);
    Leccion guardarLeccion(String id,String moduleId,String title,String body,int position,int minutes,String youtubeId);
    Pregunta guardarPregunta(String id,String lessonId,String question,List<String> options,int correctIndex,String explanation);
}
