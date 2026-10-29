-- Migration 20261029000003: foods built from ingredients.
--
-- Why: a dish such as chicken cooked with a sauce packet, or a yogurt bowl, is
-- saved as one custom food whose nutrition is the sum of its ingredients. The
-- ingredient list is kept with the food so it can be opened and changed later.
--
-- foods.recipe is null for ordinary foods. For a built food it holds
-- { ingredients: [{ food, amount, unit }], yield: { kind, ... } }, where each
-- ingredient's food is a snapshot of its per-100 g values when it was added.
-- Row-level security on foods already covers the new column.

alter table public.foods
    add column recipe jsonb
    check (recipe is null or jsonb_typeof(recipe) = 'object');
