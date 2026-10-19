package com.stockquest.aprendizaje.contenidos.Application;

import com.stockquest.aprendizaje.Application.UnidadDeTrabajo;
import com.stockquest.aprendizaje.contenidos.domain.ContenidoFormativo.*;
import com.stockquest.aprendizaje.domain.UsuarioAutenticado;
import java.util.List;

public final class AdministrarContenido {
    private final CatalogoFormativo catalogo;private final UnidadDeTrabajo tx;
    public AdministrarContenido(CatalogoFormativo catalogo,UnidadDeTrabajo tx) {this.catalogo=catalogo;this.tx=tx;}
    public List<Modulo> todos(UsuarioAutenticado u) {u.exigirGestor();return catalogo.modulos(true);}
    public Modulo modulo(UsuarioAutenticado u,String id,String title,String description,int position,boolean published) {
        u.exigirGestor();return tx.ejecutar(()->catalogo.guardarModulo(id,title.trim(),description.trim(),position,published));
    }
    public Leccion leccion(UsuarioAutenticado u,String id,String moduleId,String title,String body,int position,int minutes,String youtubeId) {
        u.exigirGestor();return tx.ejecutar(()->catalogo.guardarLeccion(id,moduleId.trim(),title.trim(),body.trim(),position,minutes,youtubeId));
    }
}
