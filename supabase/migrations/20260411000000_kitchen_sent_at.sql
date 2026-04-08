-- Timestamp when the order was first sent to kitchen.
-- KDS uses this to show only items that existed at send time,
-- ignoring billing items added afterward.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS kitchen_sent_at TIMESTAMPTZ;
