import { Button, Segmented, Upload } from "antd";
import React, { useState } from "react";
import { BillType, BillTypeList, BillTypeTextMap } from "../../utils/constants";
import { SegmentedOptions } from "antd/es/segmented";
import { ClockCircleOutlined, CloudUploadOutlined, DownloadOutlined } from "@ant-design/icons";

// import CmbCredit from '../../bocom-credit';
// import CmbDebit from '../../cmb-debit';
// import BocomCredit from '../../bocom-credit';

import './index.css';

// const BillTypeCompMap: Record<BillType, React.FC> = {
//   'cmb_debit': CmbDebit,
//   'cmb_credit': CmbCredit,
//   'bocom_credit': BocomCredit,
// }


const options: SegmentedOptions<BillType> = BillTypeList.map((t) => {
  return (
    {
      label: (
        <div style={{ padding: 4 }}>
          <div>{BillTypeTextMap[t]}</div>
        </div>
      ),
      value: t,
    }
  )
});

const Convertor: React.FC = () => {
  const [billType, setBillType] = useState<BillType>('cmb_debit');
  // const Comp = BillTypeCompMap[billType];

  return (
    <div className="app-convertor">
      <Segmented<BillType>
        className="app-convertor-selector"
        options={options}
        value={billType}
        onChange={(t) => setBillType(t)}
      />
      {/* <Comp /> */}
      <div className="app-convertor-files">
        <Upload.Dragger className="app-convertor-upload">
          <CloudUploadOutlined className="app-convertor-upload-icon" />
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">支持的格式：PDF/EML</p>
        </Upload.Dragger>
        <div className="app-convertor-download">
          <div className="app-convertor-download-status">
            <ClockCircleOutlined /> 等待文件上传
          </div>
          <Button type="primary" icon={<DownloadOutlined />}>
            下载 CSV
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Convertor;
