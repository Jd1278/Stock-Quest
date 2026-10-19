package com.stockquest.personas.identidad.Application;

public interface Claves {String hash(String plain);boolean coincide(String plain,String hash);}
