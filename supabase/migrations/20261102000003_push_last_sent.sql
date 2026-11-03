-- Migration 20261102000003: remember the last local day a push reminder went out,
-- so the scheduler sends at most one per person per day however often it runs.

alter table public.push_subscriptions
    add column last_sent_on date;
