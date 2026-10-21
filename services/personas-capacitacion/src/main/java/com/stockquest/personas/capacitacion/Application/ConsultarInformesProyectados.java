package com.stockquest.personas.capacitacion.Application;
import com.stockquest.personas.capacitacion.domain.InformeAprendizaje;
import com.stockquest.personas.domain.Fallo;
import java.util.*;

public final class ConsultarInformesProyectados implements InformesAprendizaje {
 private final ProyeccionesProgreso proyecciones;private final FuenteSnapshots fuente;
 public ConsultarInformesProyectados(ProyeccionesProgreso p,FuenteSnapshots f) {proyecciones=p;fuente=f;}
 public void reconstruir(List<String> ids) {
  if(ids.isEmpty()||ids.size()>100||new HashSet<>(ids).size()!=ids.size())throw Fallo.invalido("Consulta de snapshots inválida.");
  var events=fuente.consultar(ids);
  if(events.size()!=ids.size()||!new HashSet<>(events.stream().map(e->e.data().userId()).toList()).equals(new HashSet<>(ids)))
   throw new Fallo(Fallo.Tipo.NO_DISPONIBLE,"La fuente no devolvió todos los snapshots solicitados.");
  events.forEach(proyecciones::recibir);
 }
 @Override public List<InformeAprendizaje> consultar(List<String> ids) {
  if(ids.isEmpty()||ids.size()>100||new HashSet<>(ids).size()!=ids.size())throw Fallo.invalido("Consulta de informes inválida.");
  var missing=ids.stream().filter(id->proyecciones.consultar(id).isEmpty()).toList();
  // Bootstrap only. Existing projections remain readable while learning is unavailable.
  if(!missing.isEmpty())reconstruir(missing);
  return ids.stream().map(id->proyecciones.consultar(id).orElseThrow(()->new Fallo(Fallo.Tipo.NO_DISPONIBLE,"La proyección todavía no está disponible."))).toList();
 }
}
