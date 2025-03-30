import React, { useState } from "react";
import { Button, Upload } from "antd";
import { RcFile } from "antd/es/upload";
import * as pdfjs from 'pdfjs-dist';

const PdfPageItemsDownloader: React.FC = () => {
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);

  const handleUpload = async (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      const pdf = await pdfjs.getDocument(typedArray).promise;
      setPdf(pdf);
      setNumPages(pdf.numPages);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownload = async (num: number) => {
    const page = await pdf?.getPage(num);
    const textContent = await page?.getTextContent();
    const items = textContent?.items;
    const jsonData = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p${num}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Upload name="pdf" beforeUpload={handleUpload}>
        <Button>上传 PDF</Button>
      </Upload>
      {Array(numPages).fill(0).map((_, i) => (
        <Button onClick={() => handleDownload(i + 1)}>下载  P{i + 1}</Button>
      ))}
    </>
  );
};

export default PdfPageItemsDownloader;   
