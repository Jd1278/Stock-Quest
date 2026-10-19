package com.stockquest.simulacion.partidas.Infrastructure.http;

import com.stockquest.simulacion.partidas.domain.*;
import java.util.ArrayList;
import java.util.List;

public record RunDto(String id, int day, int days, String title, String description, int initialStock, int leadTime,
        double unitCost, double salePrice, double holdingCost, double shortageCost, double orderCost, int maxOrder,
        List<Integer> demandRange, List<MotorInventario.Dia> timeline, int stock, double profit, double serviceRate,
        int score, String feedback, int sold, int lost, List<Pendiente> pending, boolean finished, ResultadoSimulacion result) {
    public record Pendiente(int quantity, int arrivalDay) { }
    public static RunDto de(Partida p) {
        var s = p.snapshot(); var e = MotorInventario.evaluar(s, p.decisions());
        List<Pendiente> pending = new ArrayList<>();
        for (int day = 0; day < p.decisions().size(); day++) {
            int quantity = p.decisions().get(day), arrivalDay = day + s.leadTime() + 1;
            if (quantity > 0 && arrivalDay > p.decisions().size()) pending.add(new Pendiente(quantity, arrivalDay));
        }
        return new RunDto(p.id(), p.day(), s.demand().size(), s.title(), s.description(), s.initialStock(), s.leadTime(),
                s.unitCost(), s.salePrice(), s.holdingCost(), s.shortageCost(), s.orderCost(), s.maxOrder(),
                List.of(s.demand().stream().mapToInt(Integer::intValue).min().orElseThrow(), s.demand().stream().mapToInt(Integer::intValue).max().orElseThrow()),
                e.timeline(), e.stock(), e.profit(), e.serviceRate(), e.score(), e.feedback(), e.sold(), e.lost(),
                List.copyOf(pending), p.finalizada(), p.result());
    }
}
