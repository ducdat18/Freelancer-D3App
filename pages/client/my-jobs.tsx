import { useRouter } from 'next/router';
import Layout from '../../src/components/Layout';
import MyJobs from '../../src/pages/client/MyJobs';

export default function MyJobsPage() {
  return (
    <Layout>
      <MyJobs />
    </Layout>
  );
}
