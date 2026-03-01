import Layout from '../../src/components/Layout';
import Dashboard from '../../src/pages/Dashboard';

export default function ClientDashboardPage() {
  return (
    <Layout>
      <Dashboard forceRole="client" />
    </Layout>
  );
}
