package com.stockquest.personas.capacitacion.Application;
import com.stockquest.personas.capacitacion.domain.*;
import java.util.Optional;
public interface ProyeccionesProgreso {
 /** Inbox and monotonic projection update commit together. Replays can reconstruct a missing projection. */
 void recibir(EventoProgreso evento);
 Optional<InformeAprendizaje> consultar(String userId);
}
