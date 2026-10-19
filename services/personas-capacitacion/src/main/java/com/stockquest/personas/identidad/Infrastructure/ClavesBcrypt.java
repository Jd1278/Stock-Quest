package com.stockquest.personas.identidad.Infrastructure;

import com.stockquest.personas.identidad.Application.Claves;
import com.stockquest.personas.usuarios.domain.DatosPersona;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.nio.charset.StandardCharsets;

public final class ClavesBcrypt implements Claves {
 private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(BCryptPasswordEncoder.BCryptVersion.$2B,12);
 @Override public String hash(String plain) {DatosPersona.clave(plain);return encoder.encode(plain);}
 @Override public boolean coincide(String plain,String hash) {
  if(plain==null||plain.getBytes(StandardCharsets.UTF_8).length>72)return false;
  return encoder.matches(plain,hash);
 }
}
