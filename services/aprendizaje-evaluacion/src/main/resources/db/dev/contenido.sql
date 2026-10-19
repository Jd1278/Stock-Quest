-- Explicit fixture for an EMPTY learning development database, after Flyway.
-- Do not load before the isolated PostgreSQL test suite.
BEGIN;
INSERT INTO learning_modules VALUES ('learning-fixture-module','Inventarios: validación','Contenido de desarrollo',1,true)
ON CONFLICT(id) DO NOTHING;
INSERT INTO learning_lessons VALUES
('learning-fixture-first','learning-fixture-module','Primera lección','El inventario permite atender la demanda.',1,5),
('learning-fixture-second','learning-fixture-module','Segunda lección','La reposición requiere anticipación.',2,5)
ON CONFLICT(id) DO NOTHING;
INSERT INTO learning_challenges VALUES
('learning-fixture-challenge','learning-fixture-first','¿Cuánto es 2 + 2?','["3","4"]'::jsonb,1,'2 + 2 = 4.')
ON CONFLICT(id) DO NOTHING;
COMMIT;
