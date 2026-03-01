import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FreelancerBrowseRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/jobs');
  }, [router]);
  return null;
}
