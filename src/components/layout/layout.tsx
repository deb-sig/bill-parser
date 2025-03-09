import React, { PropsWithChildren } from "react";
import { Layout as AntdLayout } from "antd";
import './index.css';

export const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntdLayout className="app-layout">
      {children}
    </AntdLayout>
  )
}

export default Layout;
