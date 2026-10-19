package com.stockquest.simulacion.escenarios.Infrastructure;

import com.stockquest.simulacion.domain.*;
import com.stockquest.simulacion.escenarios.Application.GestionEscenarios;
import com.stockquest.simulacion.escenarios.domain.Escenario;
import com.stockquest.simulacion.Infrastructure.AtributosHttp;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @Validated
public class EscenariosController {
    public record Entrada(@NotBlank String title,@NotBlank String description,@NotNull @Min(0) @Max(10000) Integer initialStock,
            @NotNull @Size(min=3,max=30) List<@NotNull @Min(0) @Max(10000) Integer> demand,
            @NotNull @Min(1) @Max(10) Integer leadTime,@NotNull Double unitCost,@NotNull Double salePrice,
            @NotNull Double holdingCost,@NotNull Double shortageCost,@NotNull Double orderCost,
            @NotNull @Min(1) @Max(10000) Integer maxOrder,@NotNull Boolean published) {
        ParametrosEscenario parametros() { return new ParametrosEscenario(title.trim(),description.trim(),initialStock,demand,leadTime,
                unitCost,salePrice,holdingCost,shortageCost,orderCost,maxOrder,published); }
    }
    public record Salida(String id,String title,String description,int initialStock,List<Integer> demand,int leadTime,
            double unitCost,double salePrice,double holdingCost,double shortageCost,double orderCost,int maxOrder,boolean published) {
        public static Salida de(Escenario e) {var p=e.parametros(); return new Salida(e.id(),p.title(),p.description(),p.initialStock(),p.demand(),p.leadTime(),
                p.unitCost(),p.salePrice(),p.holdingCost(),p.shortageCost(),p.orderCost(),p.maxOrder(),p.published());}
    }
    private final GestionEscenarios casos;
    public EscenariosController(GestionEscenarios casos) {this.casos=casos;}
    @GetMapping("/internal/admin/scenarios")
    public List<Salida> todos(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado usuario) {
        return casos.todos(usuario).stream().map(Salida::de).toList();
    }
    @PostMapping("/api/admin/scenarios") @ResponseStatus(HttpStatus.CREATED)
    public Salida crear(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado usuario,@Valid @RequestBody Entrada body) {
        return Salida.de(casos.guardar(usuario,null,body.parametros()));
    }
    @PutMapping("/api/admin/scenarios/{id}")
    public Salida editar(@RequestAttribute(AtributosHttp.USUARIO) UsuarioAutenticado usuario,
            @PathVariable @Size(min=1,max=100) String id,@Valid @RequestBody Entrada body) {
        return Salida.de(casos.guardar(usuario,id,body.parametros()));
    }
}
