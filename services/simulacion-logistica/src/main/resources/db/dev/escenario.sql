-- Explicit development fixture. Run personally against the new simulation development database after Flyway.
INSERT INTO simulation_scenarios(id, parameters) VALUES ('phase4-fixture',
'{"title":"Escenario de validación fase 4","description":"Tres días para verificar decisiones y consecuencias.","initialStock":10,"demand":[5,8,4],"leadTime":2,"unitCost":2,"salePrice":5,"holdingCost":1,"shortageCost":3,"orderCost":4,"maxOrder":20,"published":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;
