import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ClientPostJobRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/jobs/create');
  }, [router]);
  return null;
}
