DO $$
BEGIN
    IF (SELECT count(*) FROM dataset_lab.inventario_original) <> 100000 THEN
        RAISE EXCEPTION 'El original debe tener 100000 filas. Se revierte la carga.';
    END IF;
    IF (SELECT count(*) FROM dataset_lab.inventario_limpio) <> 88000 THEN
        RAISE EXCEPTION 'El limpio de esta practica debe tener 88000 filas. Se revierte la carga.';
    END IF;
    IF (SELECT count(*) - count(DISTINCT id_registro) FROM dataset_lab.inventario_original) <> 2000 THEN
        RAISE EXCEPTION 'No coincide el recuento de IDs repetidos del original.';
    END IF;
    IF (SELECT count(*) FROM dataset_lab.inventario_original WHERE almacen IS NULL) <> 2000
       OR (SELECT count(*) FROM dataset_lab.inventario_original WHERE costo_pedido IS NULL) <> 2000
       OR (SELECT count(*) FROM dataset_lab.inventario_original WHERE costo_pedido < 0) <> 2000
       OR (SELECT count(*) FROM dataset_lab.inventario_original WHERE almacen IN ('NORTE','SUR','CENTRO')) <> 2000 THEN
        RAISE EXCEPTION 'No coinciden las anomalias esperadas del original.';
    END IF;
END $$;

SELECT current_database() AS base, current_user AS usuario;
SELECT 'original' AS conjunto, count(*) AS filas FROM dataset_lab.inventario_original
UNION ALL
SELECT 'limpio', count(*) FROM dataset_lab.inventario_limpio;

SELECT table_name, count(*) AS campos
FROM information_schema.columns
WHERE table_schema = 'dataset_lab'
  AND table_name IN ('inventario_original','inventario_limpio')
GROUP BY table_name ORDER BY table_name;

SELECT
    count(*) FILTER (WHERE almacen IS NULL) AS almacen_faltante,
    count(*) FILTER (WHERE costo_pedido IS NULL) AS costo_pedido_faltante,
    count(*) FILTER (WHERE costo_pedido < 0) AS costo_pedido_negativo,
    count(*) FILTER (WHERE almacen IN ('NORTE','SUR','CENTRO')) AS categoria_inconsistente,
    count(*) - count(DISTINCT id_registro) AS ids_repetidos
FROM dataset_lab.inventario_original;

-- Umbrales del diseno sintetico, no sustituyen al filtro IQR de WEKA.
SELECT count(*) AS outliers_introducidos_segun_diseno
FROM dataset_lab.inventario_original
WHERE plazo_entrega_dias >= 365 OR costo_unitario >= 5000 OR demanda >= 5000;
