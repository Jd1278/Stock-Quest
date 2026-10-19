package com.stockquest.personas.identidad.domain;

import java.time.Instant;

public record Sesion(String userId,int version,Instant expiresAt) { }
