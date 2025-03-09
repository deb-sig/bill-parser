import React from "react";
import { Button, Layout } from "antd";
import { GithubOutlined, TransactionOutlined } from "@ant-design/icons";

export const Header: React.FC = () => {
  return (
    <Layout.Header className="app-header">
      <div className="app-header-logo">
        <TransactionOutlined className="app-header-logo-icon" />
        <span className="app-header-logo-text">Bill File Converter</span>
      </div>
      <div className="app-header-links">
        <Button type="text" href="https://github.com/deb-sig/bill-parser/issues" target="_blank">问题反馈</Button>
        <Button type="text" icon={<GithubOutlined />} href="https://github.com/deb-sig/bill-parser" target="_blank">GitHub</Button>
      </div>
    </Layout.Header>
  )
}
