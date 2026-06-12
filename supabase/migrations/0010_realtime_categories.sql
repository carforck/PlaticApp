-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Habilitar Realtime en categories
--  El dashboard ya se suscribe a esta tabla; faltaba en la publicación,
--  por lo que crear/editar/borrar categorías no refrescaba en vivo.
-- ════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table categories;
