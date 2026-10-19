package com.stockquest.aprendizaje.progreso.Infrastructure;

import com.stockquest.aprendizaje.progreso.Application.ResultadosSimulacion;
import com.stockquest.aprendizaje.progreso.domain.EstadoProgreso.ResumenSimulacion;
import com.stockquest.aprendizaje.domain.Fallo;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.Set;

public final class ResultadosSimulacionHttp implements ResultadosSimulacion {
    private final String origin,token;private final ObjectMapper mapper;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).followRedirects(HttpClient.Redirect.NEVER).build();
    public ResultadosSimulacionHttp(URI origin,String token,ObjectMapper mapper) {
        boolean local=Set.of("localhost","127.0.0.1","[::1]","::1").contains(origin.getHost()==null?"":origin.getHost());
        if((!"https".equals(origin.getScheme())&&!("http".equals(origin.getScheme())&&local))||origin.getUserInfo()!=null||origin.getQuery()!=null||origin.getFragment()!=null
                ||origin.getHost()==null||(!origin.getPath().isEmpty()&&!origin.getPath().equals("/")))throw new IllegalArgumentException("Configura un origen de simulación HTTPS o loopback HTTP.");
        this.origin=origin.toString().replaceAll("/$","");this.token=token;this.mapper=mapper;
    }
    @Override public ResumenSimulacion resumen(String userId) {
        if(token.length()<32)throw unavailable();
        var uri=URI.create(origin+"/internal/users/"+URLEncoder.encode(userId,StandardCharsets.UTF_8).replace("+","%20")+"/simulation-summary");
        try {
            var response=client.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(2)).header("X-StockQuest-Service-Token",token).GET().build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200)throw unavailable();
            var node=mapper.readTree(response.body());
            if(node==null||!node.path("userId").isTextual()||!userId.equals(node.path("userId").asText())||!node.path("completedCount").isIntegralNumber()
                    ||!node.path("scoreTotal").isIntegralNumber()||!node.path("hasPassingRun").isBoolean()||!node.has("firstCompletedAt")
                    ||!node.path("completedCount").canConvertToLong()||!node.path("scoreTotal").canConvertToLong())throw unavailable();
            long count=node.path("completedCount").asLong(),score=node.path("scoreTotal").asLong();
            boolean passed=node.path("hasPassingRun").asBoolean();var first=node.path("firstCompletedAt");
            if(count<0||count>9007199254740991L/100||score<0||score>count*100||(count==0&&(score!=0||passed||!first.isNull()))||(count>0&&!first.isTextual()))throw unavailable();
            Instant date=first.isNull()?null:OffsetDateTime.parse(first.asText()).toInstant();
            return new ResumenSimulacion(userId,count,score,passed,date);
        } catch(InterruptedException e) {Thread.currentThread().interrupt();throw unavailable();}
        catch(java.io.IOException|java.time.format.DateTimeParseException e) {throw unavailable();}
    }
    private static Fallo unavailable() {return new Fallo(Fallo.Tipo.NO_DISPONIBLE,"No fue posible consultar los resultados de simulación.");}
}
