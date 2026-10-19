package com.stockquest.aprendizaje.contenidos.domain;

import java.util.List;

public final class ContenidoFormativo {
    private ContenidoFormativo() { }
    public record Modulo(String id,String title,String description,int position,boolean published,List<Leccion> lessons) {
        public Modulo { lessons=List.copyOf(lessons); }
    }
    public record Leccion(String id,String moduleId,String title,String body,int position,int minutes,
                          List<Video> contents,List<Pregunta> challenges) {
        public Leccion { contents=List.copyOf(contents); challenges=List.copyOf(challenges); }
    }
    public record Video(String id,String lessonId,String title,String youtubeId) { }
    public record Pregunta(String id,String lessonId,String question,List<String> options,int correctIndex,String explanation) {
        public Pregunta { options=List.copyOf(options); }
    }
}
