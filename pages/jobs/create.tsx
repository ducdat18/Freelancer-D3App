import { useRouter } from 'next/router';
import Layout from '../../src/components/Layout';
import CreateJob from '../../src/pages/CreateJob';

// Re-export the existing CreateJob component
export default function CreateJobPage() {
  return (
    <Layout>
      <CreateJob />
    </Layout>
  );
}
