package com.stockquest.personas.capacitacion.Infrastructure;
import com.stockquest.personas.capacitacion.Application.FuenteSnapshots;
import com.stockquest.personas.capacitacion.domain.EventoProgreso;
import com.stockquest.personas.domain.Fallo;
import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

public final class FuenteSnapshotsHttp implements FuenteSnapshots {
 private final URI target;private final String token;private final ObjectMapper mapper;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).followRedirects(HttpClient.Redirect.NEVER).build();
 public FuenteSnapshotsHttp(URI origin,String token,ObjectMapper mapper) {
  boolean local=Set.of("localhost","127.0.0.1","[::1]").contains(origin.getHost()==null?"":origin.getHost());
  if(origin.getHost()==null||(!"https".equals(origin.getScheme())&&!("http".equals(origin.getScheme())&&local))||origin.getUserInfo()!=null||origin.getQuery()!=null||origin.getFragment()!=null||!(origin.getPath().isEmpty()||origin.getPath().equals("/")))throw new IllegalArgumentException("Origen de snapshots inválido.");
  target=URI.create(origin.toString().replaceAll("/$","")+"/internal/progress-snapshots/query");this.token=token;
  this.mapper=mapper.copy().enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES,DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES);
 }
 @Override public List<EventoProgreso> consultar(List<String> ids) {
  if(ids.isEmpty()||ids.size()>100||new HashSet<>(ids).size()!=ids.size()||token.length()<32)throw unavailable();
  var events=new ArrayList<EventoProgreso>();
  try {
   for(int offset=0;offset<ids.size();offset+=5) {
    var request=HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(15)).header("Content-Type","application/json").header("X-StockQuest-Service-Token",token)
     .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("userIds",ids.subList(offset,Math.min(offset+5,ids.size())))))).build();
    var response=client.send(request,HttpResponse.BodyHandlers.ofString());if(response.statusCode()!=200)throw unavailable();
    var node=mapper.readTree(response.body());if(node==null||!node.path("snapshots").isArray())throw unavailable();
    for(var value:node.path("snapshots"))events.add(mapper.treeToValue(value,EventoProgreso.class));
   }
   if(events.size()!=ids.size()||!new HashSet<>(events.stream().map(EventoProgreso::aggregateId).toList()).equals(new HashSet<>(ids)))throw unavailable();
   return List.copyOf(events);
  }catch(InterruptedException e){Thread.currentThread().interrupt();throw unavailable();}
   catch(java.io.IOException|IllegalArgumentException e){throw unavailable();}
 }
 private static Fallo unavailable(){return new Fallo(Fallo.Tipo.NO_DISPONIBLE,"No fue posible recuperar snapshots de aprendizaje.");}
}
