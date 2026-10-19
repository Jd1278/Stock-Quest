package com.stockquest.aprendizaje.evaluaciones.domain;

import java.time.Instant;

public record Intento(String id,String userId,String challengeId,int answer,int score,Instant createdAt) { }
