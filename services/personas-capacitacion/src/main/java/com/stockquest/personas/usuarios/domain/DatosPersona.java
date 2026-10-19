package com.stockquest.personas.usuarios.domain;

import com.stockquest.personas.domain.Fallo;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class DatosPersona {
 private DatosPersona() { }
 public record Registro(String name,String document,String email,String company,String password) {
  public Registro {
   name=texto(name,100);document=texto(document,30);email=correo(email);company=texto(company,100);clave(password);
  }
 }
 public static String texto(String value,int max) {
  if(value==null||value.trim().isEmpty()||value.trim().length()>max)throw Fallo.invalido("Revisa los campos del formulario.");return value.trim();
 }
 public static String correo(String value) {String email=texto(value,191).toLowerCase(Locale.ROOT);if(!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw Fallo.invalido("Correo inválido.");return email;}
 public static void clave(String value) {if(value==null||value.length()<10||value.length()>72||value.getBytes(StandardCharsets.UTF_8).length>72)throw Fallo.invalido("La contraseña debe tener al menos 10 caracteres y como máximo 72 bytes.");}
 public static Map<String,Object> perfil(Map<String,Object> values) {
  var result=new HashMap<String,Object>();
  for(var e:values.entrySet()) {
   if(!Set.of("name","email","phone","password","currentPassword").contains(e.getKey()))throw Fallo.invalido("Campo de perfil desconocido.");
   if(e.getKey().equals("phone")&&e.getValue()==null) {result.put("phone",null);continue;}
   if(!(e.getValue() instanceof String value))throw Fallo.invalido("Tipo de campo inválido.");
   switch(e.getKey()) {
    case "name" -> result.put("name",texto(value,100));
    case "email" -> result.put("email",correo(value));
    case "phone" -> {if(value.trim().length()>30)throw Fallo.invalido("Teléfono demasiado largo.");result.put("phone",value.trim());}
    case "password" -> {clave(value);result.put("password",value);}
    case "currentPassword" -> {if(value.length()>100)throw Fallo.invalido("Contraseña actual inválida.");result.put("currentPassword",value);}
    default -> throw new IllegalStateException();
   }
  }
  return Collections.unmodifiableMap(result);
 }
 public static Map<String,Object> empleado(Map<String,Object> values) {
  var result=new HashMap<String,Object>();
  for(var e:values.entrySet()) {
   if(e.getKey().equals("active")&&e.getValue() instanceof Boolean)result.put("active",e.getValue());
   else if(Set.of("name","company").contains(e.getKey())&&e.getValue() instanceof String s)result.put(e.getKey(),texto(s,100));
   else throw Fallo.invalido("Campo de empleado inválido.");
  }
  return Map.copyOf(result);
 }
}
