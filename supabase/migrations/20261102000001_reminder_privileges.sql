-- Migration 20261102000001: grant update privilege on reminder_time column.
--
-- Why: the reminder_time column needs to be writable by authenticated users
-- after adding it to the profiles table.

grant update (reminder_time) on public.profiles to authenticated;