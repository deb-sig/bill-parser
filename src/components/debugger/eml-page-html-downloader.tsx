import React from "react";
import { Button, Upload } from "antd";
import { RcFile } from "antd/es/upload";
import PostalMime from "postal-mime";

const EmlPageHtmlDownloader: React.FC = () => {
  const handleUpload = async (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      const email = await PostalMime.parse(typedArray);
      const blob = new Blob([email.html || ""], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `page.html`;
      a.click();
      URL.revokeObjectURL(url);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Upload name="eml" beforeUpload={handleUpload}>
      <Button>上传 EML</Button>
    </Upload>
  );
};

export default EmlPageHtmlDownloader;   
