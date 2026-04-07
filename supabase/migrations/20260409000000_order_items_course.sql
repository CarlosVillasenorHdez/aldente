-- =============================================================================
-- Migration: Course/timing system for order items
-- Allows waitstaff to specify when each item should be sent to kitchen:
--   course = 1 → fire immediately when order is sent
--   course = 2 → fire when waiter triggers "second course"
--   course = 3 → fire when waiter triggers "third course"
-- Items with course = null behave as course = 1 (backwards compatible)
-- =============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS course SMALLINT NOT NULL DEFAULT 1;

-- Index for kitchen queries filtered by course
CREATE INDEX IF NOT EXISTS idx_order_items_course
  ON public.order_items(order_id, course);
