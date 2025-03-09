import React from "react";
import { BranchesOutlined, ThunderboltOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import './index.css';

const Advantage: React.FC = () => {
  return (
    <div className="app-advantage">
      <div className="app-advantage-item">
        <ThunderboltOutlined className="app-advantage-item-icon" />
        <p className="app-advantage-item-title">极速转换</p>
        <p className="app-advantage-item-desc">快速转换并下载 CSV 格式文件</p>
      </div>
      <div className="app-advantage-item">
        <SafetyCertificateOutlined className="app-advantage-item-icon" />
        <p className="app-advantage-item-title">本地处理</p>
        <p className="app-advantage-item-desc">文件在本地处理，无需担心数据泄露</p>
      </div>
      <div className="app-advantage-item">
        <BranchesOutlined className="app-advantage-item-icon" />
        <p className="app-advantage-item-title">免费开源</p>
        <p className="app-advantage-item-desc">支持主流银行账单格式转换，持续增加中</p>
      </div>
    </div>
  )
}

export default Advantage;
