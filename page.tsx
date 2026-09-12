'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("admin_logged") !== "true") {
      router.push("/admin/login");
    } else {
      router.replace('/cabildos');
    }
  }, [router]);

  return null;
}
