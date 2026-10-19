package com.stockquest.personas.identidad.Infrastructure;

import com.stockquest.personas.identidad.Application.GestionIdentidad;
import com.stockquest.personas.Infrastructure.*;
import com.stockquest.personas.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.*;

public final class FiltroIdentidad extends OncePerRequestFilter {
 public static final String PERFIL="stockquest.perfil";
 private final GestionIdentidad identidad;private final ObjectMapper mapper;
 public FiltroIdentidad(GestionIdentidad identidad,ObjectMapper mapper) {this.identidad=identidad;this.mapper=mapper;}
 @Override protected boolean shouldNotFilter(HttpServletRequest req) {
  return req.getMethod().equals("POST")&&Set.of("/api/auth/register","/api/auth/login").contains(req.getRequestURI());
 }
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException {
  String correlation=req.getHeader("X-Correlation-Id");if(correlation==null||!correlation.matches("[A-Za-z0-9._-]{1,100}"))correlation=UUID.randomUUID().toString();
  req.setAttribute(AtributosHttp.CORRELACION,correlation);res.setHeader("X-Correlation-Id",correlation);
  try {
   var p=identidad.autenticar(req.getHeader("Authorization"));
   req.setAttribute(AtributosHttp.USUARIO,new UsuarioAutenticado(p.id(),p.role()));req.setAttribute(PERFIL,p.perfil());
  }catch(Fallo f){error(res,ErroresHttp.status(f),f.getMessage());return;}
   catch(org.springframework.dao.DataAccessException e){error(res,503,"El servicio de identidad no está disponible.");return;}
  chain.doFilter(req,res);
 }
 private void error(HttpServletResponse res,int status,String message)throws IOException {res.setStatus(status);res.setContentType("application/json");res.setCharacterEncoding("UTF-8");mapper.writeValue(res.getWriter(),Map.of("message",message));}
}
