"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, isAdminUser } from "@/lib/auth";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const AdminRedirect = ({ children }: { children?: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);

  useIsoLayoutEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (getToken() && isAdminUser()) {
      setRedirecting(true);
      router.replace("/admin");
    }
  }, [pathname, router]);

  if (redirecting) return null;
  return <>{children}</>;
};

export default AdminRedirect;