import { useRouter } from 'next/router';
import CreateJob from '../../src/pages/CreateJob';

// Re-export the existing CreateJob component
export default function CreateJobPage() {
  return (
    <>
      <CreateJob />
    </>
  );
}
