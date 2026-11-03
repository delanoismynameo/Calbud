-- Migration 20261102000000: add reminder_time column to profiles table for meal notifications.
--
-- Why: each user should be able to set their preferred time for meal reminder notifications.
--
-- reminder_time: time of day for meal reminders (null means no reminder).
-- Default is null (no reminder).

alter table public.profiles
    add column reminder_time time;