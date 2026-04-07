import KitchenModule from './components/KitchenModule';

// KitchenModule renders its own full layout (Sidebar + Topbar) — no AppLayout wrapper needed
export default function CocinaPage() {
  return <KitchenModule />;
}
