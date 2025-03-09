import React from "react";
import { Typography } from 'antd';
import { BranchesOutlined, ThunderboltOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import './index.css';

const Intro: React.FC = () => {
  return (
    <div className="app-intro">
      <Typography.Title level={1}>账单文件格式转换工具</Typography.Title>
      <Typography.Title level={3} className="app-intro-desc">将账单文件轻松转换为 CSV 格式</Typography.Title>
      <div className="app-intro-points">
        <div className="app-intro-points-item">
          <ThunderboltOutlined /> 极速转换
        </div>
        <div className="app-intro-points-item">
        <SafetyCertificateOutlined /> 本地处理
        </div>
        <div className="app-intro-points-item">
          <BranchesOutlined /> 免费开源
        </div>
      </div>
    </div>
  )
}

export default Intro;
