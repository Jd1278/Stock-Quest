package com.stockquest.personas.capacitacion.Application;
import com.stockquest.personas.capacitacion.domain.EventoProgreso;
import java.util.List;
public interface FuenteSnapshots {List<EventoProgreso> consultar(List<String> userIds);}
