package com.stockquest.aprendizaje.Infrastructure;

import com.stockquest.aprendizaje.domain.Fallo;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class ErroresHttp {
    public static int status(Fallo fallo) {
        return switch (fallo.tipo()) {
            case INVALIDO -> 400; case SIN_SESION -> 401; case PROHIBIDO -> 403;
            case NO_ENCONTRADO -> 404; case CONFLICTO -> 409; case NO_DISPONIBLE -> 503;
        };
    }
    @ExceptionHandler(Fallo.class)
    public ResponseEntity<?> negocio(Fallo fallo) { return ResponseEntity.status(status(fallo)).body(Map.of("message", fallo.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> campos(MethodArgumentNotValidException error) {
        var issues = error.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", e.getDefaultMessage() == null ? "Campo inválido." : e.getDefaultMessage())).toList();
        return ResponseEntity.badRequest().body(Map.of("message", "Revisa los campos del formulario.", "issues", issues));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, ConstraintViolationException.class})
    public ResponseEntity<?> entrada(Exception error) {
        return ResponseEntity.badRequest().body(Map.of("message", "Revisa los campos del formulario.", "issues", List.of()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflictoDatos(DataIntegrityViolationException error) {
        return ResponseEntity.status(409).body(Map.of("message", "El registro ya existe, la posición está ocupada o una referencia es inválida."));
    }
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> datos(DataAccessException error) {
        return ResponseEntity.status(503).body(Map.of("message", "La persistencia de aprendizaje no está disponible."));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> inesperado(Exception error) {
        return ResponseEntity.internalServerError().body(Map.of("message", "No fue posible completar la operación."));
    }
}
