import { Button, Segmented, Upload } from "antd";
import React, { useState } from "react";
import { SegmentedOptions } from "antd/es/segmented";
import { RcFile } from "antd/es/upload";
import { CheckCircleOutlined, ClockCircleOutlined, CloudUploadOutlined, DownloadOutlined, LoadingOutlined } from "@ant-design/icons";
import { AdapterMap, AdapterList } from '../../adapters';
import { downloadCsvFile } from "../../utils";
import './index.css';

const options: SegmentedOptions<string> = AdapterList.map((a) => {
  return (
    {
      label: (
        <div style={{ padding: 4 }}>
          <div>{a.name}</div>
        </div>
      ),
      value: a.key,
    }
  )
});

const Convertor: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>(AdapterList[0]?.key);
  const [sourceFile, setSourceFile] = useState<File>();
  const [csv, setCsv] = useState<string>();
  const selectedAdapter = AdapterMap[selectedKey];

  const handleSelectorChange = (k: string) => {
    setSelectedKey(k);
    setSourceFile(undefined);
    setCsv(undefined);
  }

  const handleUpload = async (file: RcFile) => {
    setSourceFile(file);
    const csv = await selectedAdapter.converter(file);
    setCsv(csv);
  };

  const handleDownload = () => {
    if (sourceFile && csv) {
      downloadCsvFile(csv, sourceFile.name);
    }
  }

  const renderStatus = () => {
    if (sourceFile && !csv) {
      return <><LoadingOutlined /> 文件转换中：{sourceFile.name || '未知文件名'}</>;
    }

    if (sourceFile && csv) {
      return <><CheckCircleOutlined /> 文件转换完成：{sourceFile.name || '未知文件名'}</>;
    }

    return <><ClockCircleOutlined /> 等待文件上传</>;
  }

  return (
    <div className="app-convertor">
      <Segmented<string>
        className="app-convertor-selector"
        options={options}
        value={selectedKey}
        onChange={handleSelectorChange}
      />
      <div className="app-convertor-files">
        <Upload.Dragger
          className="app-convertor-upload"
          name="file"
          multiple={false}
          showUploadList={false}
          accept={selectedAdapter.sourceFileFormat.map((f) => `.${f}`).join(',')}
          beforeUpload={handleUpload}
        >
          <CloudUploadOutlined className="app-convertor-upload-icon" />
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">支持的格式：{selectedAdapter.sourceFileFormat.join('/')}</p>
        </Upload.Dragger>
        <div className="app-convertor-download">
          <div className="app-convertor-download-status">
            {renderStatus()}
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!csv}
            onClick={handleDownload}
          >
            下载 CSV
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Convertor;
