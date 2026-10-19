package com.stockquest.simulacion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockquest.simulacion.Infrastructure.FiltroServicio;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.junit.jupiter.api.Assertions.*;

class FiltroServicioTest {
    private final String token="phase5-internal-service-token-for-tests";
    @Test void sinTokenNoAccedeAlResumen() throws Exception {
        var req=new MockHttpServletRequest("GET","/internal/users/u/simulation-summary");
        var res=new MockHttpServletResponse();var chain=new MockFilterChain();
        new FiltroServicio(token,new ObjectMapper()).doFilter(req,res,chain);
        assertEquals(401,res.getStatus());assertNull(chain.getRequest());
    }
    @Test void tokenCorrectoPermiteContinuarSinSuplantarUsuario() throws Exception {
        var req=new MockHttpServletRequest("GET","/internal/users/u/simulation-summary");req.addHeader("X-StockQuest-Service-Token",token);
        var res=new MockHttpServletResponse();var chain=new MockFilterChain();
        new FiltroServicio(token,new ObjectMapper()).doFilter(req,res,chain);
        assertSame(req,chain.getRequest());
    }
    @Test void faltaConfiguracionCierraElAcceso() throws Exception {
        var res=new MockHttpServletResponse();var chain=new MockFilterChain();
        new FiltroServicio("",new ObjectMapper()).doFilter(new MockHttpServletRequest(),res,chain);
        assertEquals(503,res.getStatus());assertNull(chain.getRequest());
    }
}
