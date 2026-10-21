package com.stockquest.aprendizaje.evaluaciones.Application;

import com.stockquest.aprendizaje.Application.UnidadDeTrabajo;
import com.stockquest.aprendizaje.contenidos.Application.CatalogoFormativo;
import com.stockquest.aprendizaje.contenidos.domain.ContenidoFormativo.Pregunta;
import com.stockquest.aprendizaje.domain.*;
import java.util.List;

public final class AdministrarEvaluaciones {
    private final CatalogoFormativo catalogo;private final UnidadDeTrabajo tx;
    public AdministrarEvaluaciones(CatalogoFormativo catalogo,UnidadDeTrabajo tx) {this.catalogo=catalogo;this.tx=tx;}
    public void eliminar(UsuarioAutenticado u,String id) {
        u.exigirGestor();tx.ejecutar(()->{catalogo.eliminarPregunta(id);return null;});
    }
    public Pregunta guardar(UsuarioAutenticado u,String id,String lessonId,String question,List<String> options,int correctIndex,String explanation) {
        u.exigirGestor();
        if(correctIndex<0||correctIndex>=options.size())throw Fallo.invalido("Respuesta fuera de las opciones.");
        return tx.ejecutar(()->catalogo.guardarPregunta(id,lessonId.trim(),question.trim(),options.stream().map(String::trim).toList(),correctIndex,explanation.trim()));
    }
}
