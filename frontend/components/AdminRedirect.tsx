"use client";

import React from "react";

/**
 * Cho phép tài khoản Admin xem và duyệt tất cả các trang trên storefront (client) bình thường.
 */
const AdminRedirect = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export default AdminRedirect;