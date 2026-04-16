import { Metadata } from 'next';
import SuppliersManagement from './components/SuppliersManagement';
export const metadata: Metadata = { title: 'Proveedores — Aldente' };
export default function SuppliersPage() { return <SuppliersManagement />; }
