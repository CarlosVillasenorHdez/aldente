import { CheckinKiosko } from './CheckinKiosko';

export default async function CheckinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CheckinKiosko slug={slug} />;
}
