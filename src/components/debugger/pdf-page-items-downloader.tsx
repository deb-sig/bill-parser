import React from "react";
import { Button, Upload } from "antd";
import { RcFile } from "antd/es/upload";
import * as pdfjs from 'pdfjs-dist';

const PdfPageItemsDownloader: React.FC = () => {
  const handleUpload = async (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      const pdf = await pdfjs.getDocument(typedArray).promise;
      const numPages = pdf.numPages;
      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const items = textContent.items;
        const jsonData = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `p${pageNumber}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Upload name="pdf" beforeUpload={handleUpload}>
      <Button>上传 PDF</Button>
    </Upload>
  );
};

export default PdfPageItemsDownloader;   
