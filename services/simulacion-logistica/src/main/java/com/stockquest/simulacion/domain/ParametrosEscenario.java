package com.stockquest.simulacion.domain;

import java.util.List;

public record ParametrosEscenario(String title, String description, int initialStock, List<Integer> demand,
        int leadTime, double unitCost, double salePrice, double holdingCost, double shortageCost,
        double orderCost, int maxOrder, boolean published) {
    public ParametrosEscenario {
        if (title == null || title.isBlank() || title.length() > 150 || description == null || description.isBlank()
                || description.length() > 3000) throw Fallo.invalido("Descripción de escenario inválida.");
        if (initialStock < 0 || initialStock > 10000 || leadTime < 1 || leadTime > 10 || maxOrder < 1 || maxOrder > 10000)
            throw Fallo.invalido("Parámetros de escenario fuera de rango.");
        if (demand == null || demand.size() < 3 || demand.size() > 30
                || demand.stream().anyMatch(n -> n == null || n < 0 || n > 10000)) throw Fallo.invalido("Demanda inválida.");
        demand = List.copyOf(demand);
        for (double cost : new double[]{unitCost, salePrice, holdingCost, shortageCost, orderCost})
            if (!Double.isFinite(cost) || cost < 0 || cost > 100000) throw Fallo.invalido("Costos inválidos.");
        if (salePrice <= 0 || salePrice < unitCost) throw Fallo.invalido("Precio de venta inválido.");
        // Zero demand is accepted internally for engine robustness, not by a scenario creation API.
    }
}
