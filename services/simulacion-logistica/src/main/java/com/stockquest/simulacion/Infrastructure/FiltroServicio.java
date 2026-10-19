package com.stockquest.simulacion.Infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

public final class FiltroServicio extends OncePerRequestFilter {
    private final String token;
    private final ObjectMapper mapper;
    public FiltroServicio(String token,ObjectMapper mapper) {this.token=token;this.mapper=mapper;}
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        if(token.length()<32) {error(res,503,"Las credenciales internas no están configuradas.");return;}
        String received=req.getHeader("X-StockQuest-Service-Token");
        if(received==null||!MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),received.getBytes(StandardCharsets.UTF_8))) {
            error(res,401,"Credencial de servicio inválida.");return;
        }
        chain.doFilter(req,res);
    }
    private void error(HttpServletResponse res,int status,String message) throws IOException {
        res.setStatus(status);res.setContentType("application/json");res.setCharacterEncoding("UTF-8");mapper.writeValue(res.getWriter(),Map.of("message",message));
    }
}
