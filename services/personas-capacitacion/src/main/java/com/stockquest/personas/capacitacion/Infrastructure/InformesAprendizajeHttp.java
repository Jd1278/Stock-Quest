package com.stockquest.personas.capacitacion.Infrastructure;

import com.stockquest.personas.capacitacion.Application.InformesAprendizaje;
import com.stockquest.personas.capacitacion.domain.InformeAprendizaje;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

public final class InformesAprendizajeHttp implements InformesAprendizaje {
 private final URI endpoint;private final String token;private final ObjectMapper mapper;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).followRedirects(HttpClient.Redirect.NEVER).build();
 public InformesAprendizajeHttp(URI origin,String token,ObjectMapper mapper) {
  boolean local=Set.of("localhost","127.0.0.1","[::1]","::1").contains(origin.getHost()==null?"":origin.getHost());
  if((!"https".equals(origin.getScheme())&&!("http".equals(origin.getScheme())&&local))||origin.getHost()==null||origin.getUserInfo()!=null||origin.getQuery()!=null||origin.getFragment()!=null
   ||(!origin.getPath().isEmpty()&&!origin.getPath().equals("/")))throw new IllegalArgumentException("Configura origen HTTPS o loopback HTTP de aprendizaje.");
  this.endpoint=URI.create(origin.toString().replaceAll("/$","")+"/internal/learning-reports/query");this.token=token;
  this.mapper=mapper.copy().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
   .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES,DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES);
 }
 @Override public List<InformeAprendizaje> consultar(List<String> ids) {
  if(ids.isEmpty()||ids.size()>100||new HashSet<>(ids).size()!=ids.size()||token.length()<32)throw unavailable();
  try {
   var request=HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(2)).header("Content-Type","application/json").header("X-StockQuest-Service-Token",token)
    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("userIds",ids)))).build();
   var response=client.send(request,HttpResponse.BodyHandlers.ofString());if(response.statusCode()!=200)throw unavailable();
   var node=mapper.readTree(response.body());if(node==null||!node.path("reports").isArray()||node.path("reports").size()!=ids.size())throw unavailable();
   var reports=new ArrayList<InformeAprendizaje>();var seen=new HashSet<String>();
   for(var report:node.path("reports")) {
    var id=report.path("userId");
    if(!id.isTextual()||!ids.contains(id.asText())||!seen.add(id.asText()))throw unavailable();
    // Typed output strips unknown fields instead of relaying arbitrary remote JSON.
    if(!report.path("progress").isObject()||!report.path("activities").isArray())throw unavailable();
    reports.add(mapper.treeToValue(report,InformeAprendizaje.class));
   }
   return List.copyOf(reports);
  }catch(InterruptedException e){Thread.currentThread().interrupt();throw unavailable();}
   catch(java.io.IOException|IllegalArgumentException e){throw unavailable();}
 }
 private static Fallo unavailable() {return new Fallo(Fallo.Tipo.NO_DISPONIBLE,"El servicio de aprendizaje no está disponible o devolvió un informe inválido.");}
}
