import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Aldente',
  description: 'Consejos prácticos para restauranteros: costos, operación, tecnología y rentabilidad.',
};

// Static posts — replace with CMS/DB when you have real content
const POSTS = [
  {
    slug: 'costo-real-platillo',
    title: 'Cómo calcular el costo real de un platillo (y por qué la mayoría lo hace mal)',
    excerpt: 'El food cost no es solo materia prima. Te explicamos cómo incluir mano de obra y overhead para conocer tu margen real.',
    date: '2026-04-01',
    category: 'Rentabilidad',
    readTime: '6 min',
  },
  {
    slug: 'reducir-desperdicio-cocina',
    title: 'Cómo reducir el desperdicio en tu cocina sin sacrificar calidad',
    excerpt: 'El 30-40% de los alimentos en un restaurante promedio terminan en la basura. Aquí hay 5 cambios operativos que puedes implementar esta semana.',
    date: '2026-03-15',
    category: 'Operación',
    readTime: '8 min',
  },
  {
    slug: 'por-que-fracasan-restaurantes',
    title: 'Por qué el 60% de los restaurantes cierran en el primer año (y cómo no ser uno de ellos)',
    excerpt: 'Spoiler: no es la comida. Es la falta de control sobre costos, inventario y flujo de caja.',
    date: '2026-03-01',
    category: 'Negocio',
    readTime: '10 min',
  },
];

const CAT_COLORS: Record<string, string> = {
  'Rentabilidad': '#c8861f',
  'Operación': '#2563eb',
  'Negocio': '#16a34a',
};

export default function BlogPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #f5f0e8; font-family: 'Outfit', sans-serif; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        .nav { position: sticky; top: 0; z-index: 100; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(24px,5vw,64px); background: rgba(8,8,8,0.88); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #c9963a; letter-spacing: 0.06em; text-transform: uppercase; }
        .nav-back { font-size: 13px; color: rgba(245,240,232,0.45); display: flex; align-items: center; gap: 6px; transition: color .15s; }
        .nav-back:hover { color: rgba(245,240,232,0.7); }
        .hero { padding: clamp(60px,8vw,100px) clamp(24px,6vw,80px) clamp(40px,5vw,60px); max-width: 800px; margin: 0 auto; }
        .eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: #c9963a; margin-bottom: 16px; display: flex; align-items: center; gap: 14px; }
        .eyebrow::after { content: ''; flex: 1; max-width: 48px; height: 1px; background: rgba(201,150,58,0.3); }
        .hero-h1 { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px,5vw,56px); font-weight: 300; letter-spacing: -1px; line-height: 1.1; margin-bottom: 16px; }
        .hero-sub { font-size: 16px; color: rgba(245,240,232,0.55); font-weight: 300; line-height: 1.7; }
        .posts { max-width: 800px; margin: 0 auto; padding: 0 clamp(24px,6vw,80px) clamp(60px,8vw,100px); display: flex; flex-direction: column; gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; }
        .post { background: #0d0d0d; padding: 32px 28px; transition: background .2s; }
        .post:hover { background: #131313; }
        .post-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 12px; }
        .post-cat { padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 500; letter-spacing: 0.05em; }
        .post-date { color: rgba(245,240,232,0.3); }
        .post-read { color: rgba(245,240,232,0.3); }
        .post-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(20px,2.5vw,26px); font-weight: 500; color: #f5f0e8; line-height: 1.25; margin-bottom: 10px; letter-spacing: -0.3px; }
        .post-excerpt { font-size: 14px; color: rgba(245,240,232,0.55); line-height: 1.7; font-weight: 300; }
        .cta-bar { max-width: 800px; margin: 40px auto; padding: 0 clamp(24px,6vw,80px) clamp(60px,8vw,80px); text-align: center; }
        .cta-bar p { font-size: 15px; color: rgba(245,240,232,0.45); margin-bottom: 20px; font-weight: 300; }
        .cta-btn { display: inline-block; padding: 13px 28px; border-radius: 11px; background: #c9963a; color: #080808; font-size: 14px; font-weight: 600; transition: background .15s; }
        .cta-btn:hover { background: #dba84a; }
      `}</style>

      <nav className="nav">
        <span className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><img src="/assets/images/logo_aldente.png" alt="" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />Aldente</span>
        <a href="/" className="nav-back">← Inicio</a>
      </nav>

      <div className="hero">
        <div className="eyebrow">Blog</div>
        <h1 className="hero-h1">Para restauranteros,<br/>por restauranteros</h1>
        <p className="hero-sub">Consejos prácticos sobre costos, operación y rentabilidad.<br/>Sin teoría — solo lo que funciona en la cocina real.</p>
      </div>

      <div className="posts">
        {POSTS.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="post">
            <div className="post-meta">
              <span className="post-cat" style={{ background: `${CAT_COLORS[post.category]}18`, color: CAT_COLORS[post.category] }}>
                {post.category}
              </span>
              <span className="post-date">{new Date(post.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="post-read">{post.readTime} de lectura</span>
            </div>
            <h2 className="post-title">{post.title}</h2>
            <p className="post-excerpt">{post.excerpt}</p>
          </Link>
        ))}
      </div>

      <div className="cta-bar">
        <p>¿Quieres que tu restaurante funcione con estos principios?</p>
        <a href="/registro" className="cta-btn">Prueba Aldente 14 días gratis →</a>
      </div>
    </>
  );
}
