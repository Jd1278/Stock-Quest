package com.stockquest.personas.domain;

public record UsuarioAutenticado(String id, Rol role) {
    public enum Rol { APRENDIZ, LIDER, GESTOR_PEDAGOGICO }
    public UsuarioAutenticado {
        if (id == null || id.isBlank() || id.length() > 100 || role == null) throw Fallo.invalido("Identidad inválida.");
    }
    public void exigirAprendiz() {
        if (role != Rol.APRENDIZ) throw new Fallo(Fallo.Tipo.PROHIBIDO, "No tienes permiso para esta acción.");
    }
    public void exigirGestor() {
        if (role != Rol.GESTOR_PEDAGOGICO) throw new Fallo(Fallo.Tipo.PROHIBIDO, "No tienes permiso para esta acción.");
    }
    public void exigirLider() {
        if (role != Rol.LIDER) throw new Fallo(Fallo.Tipo.PROHIBIDO, "No tienes permiso para esta acción.");
    }
}
