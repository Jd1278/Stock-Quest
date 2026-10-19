package com.stockquest.personas;

import com.stockquest.personas.identidad.Infrastructure.*;
import com.stockquest.personas.domain.Fallo;
import com.stockquest.personas.usuarios.domain.DatosPersona;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class TokensJwtTest {
 String secret="local-unit-test-secret-at-least-32-bytes-long";
 Instant now=Instant.parse("2026-10-19T00:00:00Z");Clock clock=Clock.fixed(now,ZoneOffset.UTC);
 @Test void tokenHs256ConservaUsuarioVersionYVencimiento() {
  var tokens=new TokensJwt(secret,"8h",clock);var session=tokens.verificar("Bearer "+tokens.emitir("user",3));
  assertEquals("user",session.userId());assertEquals(3,session.version());assertEquals(now.plusSeconds(28800),session.expiresAt());
 }
 @Test void tokenVencidoSeRechaza() {
  var original=new TokensJwt(secret,"1s",clock);var future=new TokensJwt(secret,"1s",Clock.fixed(now.plusSeconds(2),ZoneOffset.UTC));
  assertThrows(Fallo.class,()->future.verificar("Bearer "+original.emitir("user",0)));
 }
 @Test void otraFirmaNoSeAcepta() {
  String token=new TokensJwt(secret,"8h",clock).emitir("user",0);
  assertThrows(Fallo.class,()->new TokensJwt(secret+"other","8h",clock).verificar("Bearer "+token));
 }
 @Test void algoritmoNoneNoSeAcepta() {
  var encoder=Base64.getUrlEncoder().withoutPadding();String header=encoder.encodeToString("{\"alg\":\"none\"}".getBytes(StandardCharsets.UTF_8));
  String claims=encoder.encodeToString("{\"sub\":\"user\",\"version\":0}".getBytes(StandardCharsets.UTF_8));
  assertThrows(Fallo.class,()->new TokensJwt(secret,"8h",clock).verificar("Bearer "+header+"."+claims+"."));
 }
 @Test void formatoBearerYSecretoSeValidan() {
  assertThrows(IllegalArgumentException.class,()->new TokensJwt("short","8h",clock));
  assertThrows(Fallo.class,()->new TokensJwt(secret,"8h",clock).verificar("user-controlled"));
 }
 @Test void bcryptRealVerificaSinGuardarTextoPlano() {
  var claves=new ClavesBcrypt();String plain="password-for-unit-test";String hash=claves.hash(plain);
  assertNotEquals(plain,hash);assertTrue(hash.startsWith("$2b$12$"));assertTrue(claves.coincide(plain,hash));assertFalse(claves.coincide("wrong",hash));
 }
}
