import Layout from '../../src/components/Layout';
import Dashboard from '../../src/pages/Dashboard';

export default function FreelancerDashboardPage() {
  return (
    <Layout>
      <Dashboard forceRole="freelancer" />
    </Layout>
  );
}
