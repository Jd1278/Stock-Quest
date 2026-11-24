-- Ejecutar mediante importar-dataset.ps1 en la base elegida expresamente.
-- CREATE sin IF NOT EXISTS: detener si ya existe una carga anterior.
CREATE SCHEMA dataset_lab;

CREATE TABLE dataset_lab.inventario_original (
    id_registro integer,
    dia_operacion integer,
    almacen text,
    categoria text,
    proveedor text,
    stock_inicial integer,
    demanda integer,
    unidades_recibidas integer,
    unidades_vendidas integer,
    stock_final integer,
    costo_unitario numeric(18,6),
    precio_unitario numeric(18,6),
    plazo_entrega_dias integer,
    costo_pedido numeric(18,6),
    canal_venta text
);

COMMENT ON TABLE dataset_lab.inventario_original IS
    '100000 movimientos sinteticos de laboratorio: incluye faltantes, duplicados, negativos y outliers; no son datos operativos de Stock Quest.';

CREATE TABLE dataset_lab.inventario_limpio (
    id_registro integer PRIMARY KEY,
    dia_operacion integer NOT NULL CHECK (dia_operacion BETWEEN 1 AND 365),
    almacen text NOT NULL CHECK (almacen IN ('norte','sur','centro')),
    categoria text NOT NULL CHECK (categoria IN ('alimentos','aseo','papeleria','tecnologia')),
    proveedor text NOT NULL CHECK (proveedor IN ('P01','P02','P03','P04','P05')),
    stock_inicial integer NOT NULL CHECK (stock_inicial >= 0),
    demanda integer NOT NULL CHECK (demanda >= 0),
    unidades_recibidas integer NOT NULL CHECK (unidades_recibidas >= 0),
    unidades_vendidas integer NOT NULL CHECK (unidades_vendidas >= 0),
    stock_final integer NOT NULL CHECK (stock_final >= 0),
    costo_unitario numeric(18,6) NOT NULL CHECK (costo_unitario >= 0),
    precio_unitario numeric(18,6) NOT NULL CHECK (precio_unitario >= costo_unitario),
    plazo_entrega_dias integer NOT NULL CHECK (plazo_entrega_dias >= 0),
    costo_pedido numeric(18,6) NOT NULL CHECK (costo_pedido >= 0),
    canal_venta text NOT NULL CHECK (canal_venta IN ('tienda','web','mayorista')),
    CHECK (stock_final = stock_inicial + unidades_recibidas - unidades_vendidas),
    CHECK (unidades_vendidas = LEAST(stock_inicial + unidades_recibidas, demanda))
);

COMMENT ON TABLE dataset_lab.inventario_limpio IS
    '88000 movimientos sinteticos tras la practica de limpieza; tabla separada del original y de las tablas de microservicios.';
