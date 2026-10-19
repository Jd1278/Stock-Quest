package com.stockquest.personas.identidad.Infrastructure;

import com.stockquest.personas.identidad.Application.Tokens;
import com.stockquest.personas.identidad.domain.Sesion;
import com.stockquest.personas.domain.Fallo;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

public final class TokensJwt implements Tokens {
 private final JwtEncoder encoder;private final JwtDecoder decoder;private final Clock clock;private final long seconds;
 public TokensJwt(String secret,String duration,Clock clock) {
  if(secret==null||secret.getBytes(StandardCharsets.UTF_8).length<32)throw new IllegalArgumentException("Configura PEOPLE_JWT_SECRET con al menos 32 bytes.");
  if(duration==null||!duration.matches("[0-9]+[smhd]"))throw new IllegalArgumentException("Duración JWT inválida.");
  long amount=Long.parseLong(duration.substring(0,duration.length()-1));
  long factor=switch(duration.charAt(duration.length()-1)){case 's'->1;case 'm'->60;case 'h'->3600;default->86400;};
  seconds=Math.multiplyExact(amount,factor);if(seconds<=0)throw new IllegalArgumentException("Duración JWT no positiva.");
  this.clock=clock;var key=new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256");
  encoder=new NimbusJwtEncoder(new ImmutableSecret<>(key));
  var jwtDecoder=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
  var timestamp=new JwtTimestampValidator(Duration.ZERO);timestamp.setClock(clock);
  OAuth2TokenValidator<Jwt> audience=jwt->jwt.getAudience()!=null&&jwt.getAudience().contains("stock-quest-web")?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
  jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamp,new JwtIssuerValidator("stock-quest"),audience));decoder=jwtDecoder;
 }
 @Override public String emitir(String id,int version) {
  var claims=JwtClaimsSet.builder().issuer("stock-quest").subject(id).audience(List.of("stock-quest-web")).issuedAt(clock.instant()).expiresAt(clock.instant().plusSeconds(seconds)).claim("version",version).build();
  return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(),claims)).getTokenValue();
 }
 @Override public Sesion verificar(String bearer) {
  if(bearer==null||!bearer.matches("Bearer [^\\s]+"))throw invalid();
  try {
   var jwt=decoder.decode(bearer.substring(7));Object version=jwt.getClaims().get("version");
   if(jwt.getSubject()==null||jwt.getSubject().isBlank()||jwt.getSubject().length()>100||jwt.getExpiresAt()==null||!jwt.getExpiresAt().isAfter(clock.instant())
    ||!(version instanceof Number number)||number.longValue()<0||number.longValue()>Integer.MAX_VALUE||number.doubleValue()!=number.longValue())throw invalid();
   return new Sesion(jwt.getSubject(),((Number)version).intValue(),jwt.getExpiresAt());
  }catch(JwtException|IllegalArgumentException e){throw invalid();}
 }
 private static Fallo invalid() {return new Fallo(Fallo.Tipo.SIN_SESION,"Tu sesión expiró o es inválida. Inicia sesión nuevamente.");}
}
