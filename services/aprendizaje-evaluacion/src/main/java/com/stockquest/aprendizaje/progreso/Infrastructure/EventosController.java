package com.stockquest.aprendizaje.progreso.Infrastructure;

import com.stockquest.aprendizaje.progreso.Application.RecibirSimulacion;
import com.stockquest.aprendizaje.progreso.domain.EventoSimulacion;
import com.stockquest.aprendizaje.Infrastructure.JsonPersistencia;
import com.stockquest.aprendizaje.domain.Fallo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

@RestController
public class EventosController {
    public record Datos(@NotBlank @Size(max=100) String simulationId,@NotBlank @Size(max=100) String userId,
            @NotBlank @Size(max=100) String scenarioId,@NotNull @Min(0) @Max(100) Integer score,
            @NotNull Double profit,@NotNull @DecimalMin("0") @DecimalMax("1") Double serviceRate,@NotNull Instant completedAt) { }
    public record Evento(@NotNull UUID eventId,@NotBlank String type,@NotNull Integer schemaVersion,@NotBlank String producer,
            @NotNull Instant occurredAt,@NotBlank @Size(max=100) String aggregateId,@NotNull @Min(1) Integer aggregateVersion,
            @NotBlank @Size(max=100) String correlationId,@NotNull @Valid Datos data) { }
    private final RecibirSimulacion recibir;private final JsonPersistencia json;private final String token;
    public EventosController(RecibirSimulacion recibir,JsonPersistencia json,@Value("${learning.event-token}") String token) {this.recibir=recibir;this.json=json;this.token=token;}
    @PostMapping("/internal/events") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recibir(@RequestHeader(value="X-StockQuest-Event-Token",required=false) String actual,@Valid @RequestBody Evento b) {
        if(token.length()<32)throw new Fallo(Fallo.Tipo.NO_DISPONIBLE,"Las credenciales de eventos no están configuradas.");
        if(actual==null||!MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),actual.getBytes(StandardCharsets.UTF_8)))
            throw new Fallo(Fallo.Tipo.SIN_SESION,"Credencial de servicio inválida.");
        var d=b.data();var evento=new EventoSimulacion(b.eventId(),b.type(),b.schemaVersion(),b.producer(),b.occurredAt(),b.aggregateId(),b.aggregateVersion(),b.correlationId(),
                new EventoSimulacion.Datos(d.simulationId(),d.userId(),d.scenarioId(),d.score(),d.profit(),d.serviceRate(),d.completedAt()));
        try {
            var hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.escribir(evento).getBytes(StandardCharsets.UTF_8)));
            recibir.ejecutar(evento,hash);
        }catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
