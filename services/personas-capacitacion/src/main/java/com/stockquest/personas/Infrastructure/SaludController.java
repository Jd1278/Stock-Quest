package com.stockquest.personas.Infrastructure;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class SaludController {
    private final JdbcTemplate jdbc;
    public SaludController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @GetMapping("/health/live") public Map<String, String> live() { return Map.of("status", "ok"); }
    @GetMapping("/health/ready") public ResponseEntity<?> ready() {
        try { jdbc.queryForObject("SELECT 1", Integer.class); return ResponseEntity.ok(Map.of("status", "ok")); }
        catch (RuntimeException e) { return ResponseEntity.status(503).body(Map.of("status", "unavailable")); }
    }
}
