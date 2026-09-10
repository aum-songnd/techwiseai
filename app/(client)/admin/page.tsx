import React from "react";
import Link from "next/link";

const Admin = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Bảng điều khiển</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/categories"
          className="bg-white border rounded-lg p-6 hoverEffect hover:shadow-md"
        >
          <h2 className="font-medium text-lg mb-1">Danh mục</h2>
          <p className="text-sm text-lightColor">
            Tạo, sửa danh mục sản phẩm
          </p>
        </Link>
        <Link
          href="/admin/products"
          className="bg-white border rounded-lg p-6 hoverEffect hover:shadow-md"
        >
          <h2 className="font-medium text-lg mb-1">Sản phẩm</h2>
          <p className="text-sm text-lightColor">
            Tạo, sửa, xóa (mềm) sản phẩm
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Admin;