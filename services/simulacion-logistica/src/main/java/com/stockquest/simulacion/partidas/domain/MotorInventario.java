package com.stockquest.simulacion.partidas.domain;

import com.stockquest.simulacion.domain.Fallo;
import com.stockquest.simulacion.domain.ParametrosEscenario;
import java.util.ArrayList;
import java.util.List;

public final class MotorInventario {
    private MotorInventario() { }
    public record Dia(int day, int demand, int received, int ordered, int sold, int lost, int stock,
                      double revenue, double cost, double profit) { }
    public record Evaluacion(List<Dia> timeline, int stock, double profit, double serviceRate,
                             int score, String feedback, int sold, int lost) {
        public Evaluacion { timeline = List.copyOf(timeline); }
    }
    public static Evaluacion evaluar(ParametrosEscenario s, List<Integer> orders) {
        if (orders == null || orders.size() > s.demand().size()
                || orders.stream().anyMatch(q -> q == null || q < 0 || q > s.maxOrder())) throw Fallo.invalido("Decisiones inválidas.");
        int stock = s.initialStock(), sold = 0, lost = 0;
        double totalCost = s.initialStock() * s.unitCost(), revenue = 0;
        List<Dia> timeline = new ArrayList<>();
        for (int day = 0; day < orders.size(); day++) {
            int quantity = orders.get(day);
            int received = day >= s.leadTime() ? orders.get(day - s.leadTime()) : 0;
            stock += received;
            int demand = s.demand().get(day), served = Math.min(stock, demand), shortage = demand - served;
            stock -= served;
            double cost = quantity * s.unitCost() + (quantity > 0 ? s.orderCost() : 0)
                    + stock * s.holdingCost() + shortage * s.shortageCost();
            totalCost += cost; revenue += served * s.salePrice(); sold += served; lost += shortage;
            timeline.add(new Dia(day + 1, demand, received, quantity, served, shortage, stock,
                    served * s.salePrice(), cost, revenue - totalCost));
        }
        double serviceRate = sold + lost > 0 ? (double) sold / (sold + lost) : 1;
        double profit = Math.round((revenue - totalCost) * 100) / 100.0;
        int score = (int) Math.round(serviceRate * 80 + (profit >= 0 ? 20 : Math.max(0, 20 + profit / Math.max(revenue, 1) * 20)));
        double averageDemand = (double) s.demand().stream().mapToInt(Integer::intValue).sum() / s.demand().size();
        String feedback = lost > 0
                ? "Quedaron " + lost + " unidades de demanda sin atender. Anticipa los pedidos " + s.leadTime() + " días y considera un stock de protección."
                : stock > averageDemand * 2
                    ? "Atendiste toda la demanda, pero quedó exceso de stock. Reduce el tamaño de los pedidos para bajar almacenamiento."
                    : "Buen equilibrio entre disponibilidad y costos. Mantén la reposición anticipada y revisa la demanda antes de cada pedido.";
        return new Evaluacion(timeline, stock, profit, serviceRate, score, feedback, sold, lost);
    }
}
