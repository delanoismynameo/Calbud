-- Migration 20261028000002: link a meal_prep session to the food it makes.
--
-- Why: "log a serving" needs nutrition, and a prep dish is saved as one of
-- the household's custom foods. The session points at that food, so
-- leftovers can be logged later from Add food like any other food.
--
-- No new policies are needed: meal_prep rows are already limited to the
-- caller's household, and an embedded foods(*) read is limited by the foods
-- policies. Deleting the food keeps the session and clears the link.

alter table public.meal_prep
    add column food_id uuid references public.foods(id) on delete set null;
