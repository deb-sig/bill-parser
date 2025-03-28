import { Tabs, TabsProps } from 'antd';
import React from 'react';
import PdfPageItemsViewer from './pdf-page-items-viewer';
import PdfPageItemsDownloader from './pdf-page-items-downloader';
import './index.css';

const Debugger: React.FC = () => {
  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: 'PDF Page Items Downloader',
      children: <PdfPageItemsDownloader />,
    },
    {
      key: '2',
      label: 'PDF Page Items Viewer',
      children: <PdfPageItemsViewer />,
    }
  ]

  return (
    <div className="app-debugger">
      <Tabs items={tabItems} />
    </div>
  )
};

export default Debugger;
