import { useRouter } from 'next/router';
import Layout from '../src/components/Layout';
import Dashboard from '../src/pages/Dashboard';

export default function DashboardPage() {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}
