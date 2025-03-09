import React, { PropsWithChildren } from "react";
import { Layout } from "antd";

export const Content: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <Layout.Content className="app-content">
      {children}
    </Layout.Content>
  )
}
