import { useRouter } from 'next/router';
import Layout from '../src/components/Layout';
import HowItWorks from '../src/pages/shared/HowItWorks';

export default function HowItWorksPage() {
  return (
    <Layout>
      <HowItWorks />
    </Layout>
  );
}
