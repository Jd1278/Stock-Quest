package com.stockquest.personas.identidad.Application;

import com.stockquest.personas.identidad.domain.Sesion;
public interface Tokens {String emitir(String userId,int version);Sesion verificar(String bearer);}
