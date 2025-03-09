import React from "react";
import { Layout } from "antd";

export const Footer: React.FC = () => {
  return (
    <Layout.Footer className="app-footer">
      © {new Date().getFullYear()} Bill File Converter
    </Layout.Footer>
  )
}
