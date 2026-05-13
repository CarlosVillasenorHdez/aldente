'use client';
/**
 * MobileGate — Renderiza mobile o desktop según el dispositivo.
 * Evita duplicar la lógica de useDevice en cada página.
 */
import React from 'react';
import { useDevice } from '@/hooks/useDevice';

interface MobileGateProps {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
}

export default function MobileGate({ mobile, desktop }: MobileGateProps) {
  const { isMobile } = useDevice();
  return <>{isMobile ? mobile : desktop}</>;
}
