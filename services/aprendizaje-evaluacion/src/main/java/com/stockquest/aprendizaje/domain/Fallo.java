package com.stockquest.aprendizaje.domain;

public final class Fallo extends RuntimeException {
    public enum Tipo { INVALIDO, NO_ENCONTRADO, CONFLICTO, PROHIBIDO, SIN_SESION, NO_DISPONIBLE }
    private final Tipo tipo;
    public Fallo(Tipo tipo, String message) { super(message); this.tipo = tipo; }
    public Tipo tipo() { return tipo; }
    public static Fallo invalido(String message) { return new Fallo(Tipo.INVALIDO, message); }
}
