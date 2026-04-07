import POSClient from './components/POSClient';

// POSClient renders its own full layout (Sidebar + Topbar) — no AppLayout wrapper needed
export default function POSPage() {
  return <POSClient />;
}
