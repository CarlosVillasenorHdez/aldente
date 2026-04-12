-- =============================================================================
-- Migration: Add metodo_pago to gastos for Balance Sheet payables tracking
-- =============================================================================

-- Add payment method to recurring expenses
ALTER TABLE public.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago IN ('efectivo','transferencia','credito','tarjeta_empresa','cheque'));

-- Add payment method to actual payments (for cash flow tracking)  
ALTER TABLE public.gastos_pagos
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago IN ('efectivo','transferencia','credito','tarjeta_empresa','cheque'));

-- Add proveedor (supplier) field to gastos for AP aging
ALTER TABLE public.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS proveedor TEXT DEFAULT '';

-- Add dias_credito for credit terms (AP aging bucket)
ALTER TABLE public.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS dias_credito INTEGER NOT NULL DEFAULT 0;
