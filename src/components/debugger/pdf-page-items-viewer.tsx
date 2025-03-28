import { Input } from "antd";
import { TextItem } from "pdfjs-dist/types/src/display/api";
import React, { useMemo, useState } from "react";

const PdfPageItemsViewer: React.FC = () => {
  const [itemsJson, setItemsJson] = useState<string>('');
  const [viewerSize, setViewerSize] = useState<{ width: string, height: string }>({ width: 'auto', height: '1000px' });

  const items = useMemo(() => {
    if (!itemsJson) return [];

    try {
      const parsed: TextItem[] = JSON.parse(itemsJson);
      return parsed;
    } catch (error) {
      console.log(error);
      return []
    }
  }, [itemsJson]);

  return (
    <div className="pdf-page">
      <div className="pdf-page-editor">
        Items JSON: <Input.TextArea value={itemsJson} onChange={(e) => setItemsJson(e.target.value)} />
        Viewer Width: <Input style={{ width: 100 }} value={viewerSize.width} onChange={(e) => setViewerSize((s) => ({ ...s, width: e.target.value }))} />
        Viewer Height: <Input style={{ width: 100 }} value={viewerSize.height} onChange={(e) => setViewerSize((s) => ({ ...s, height: e.target.value }))} />
      </div>
      <div className="pdf-page-viewer" style={viewerSize}>
        {items.map((item) => {
          const itemStyle: React.CSSProperties = {
            position: "absolute",
            overflow: 'visible',
            whiteSpace: 'nowrap',
            width: `${item.width}px`,
            height: `${item.height}px`,
            fontSize: `${item.height}px`,
            lineHeight: `${item.height}px`,
            left: `${item.transform[4]}px`,
            bottom: `${item.transform[5]}px`,
          };
          return <div style={itemStyle}>{item.str}</div>
        })}
      </div>
    </div>
  )
};

export default PdfPageItemsViewer;
