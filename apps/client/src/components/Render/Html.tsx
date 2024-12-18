import React, { useRef, useEffect } from 'react';

interface HtmlProps {
  html: string;
  css?: string;
  js?: string;
  width?: string | number;
  height?: string | number;
}

export const Html: React.FC<HtmlProps> = ({
  html = '',
  css = '',
  js = '',
  width = '100%',
  height = '100%'
}) => {
  // 生成完整的 HTML 文档
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          /* 重置默认样式 */
          body { margin: 0; padding: 0; }
          /* 注入的 CSS */
          ${css}
        </style>
      </head>
      <body>
        ${html}
        <script>${js}</script>
      </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={content}
      sandbox="allow-scripts"
      style={{ 
        width, 
        height, 
        border: 'none',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
      title="sandbox"
    />
  );
};
