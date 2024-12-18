import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createStyles } from 'antd-style';
import type { Components } from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-python';

// 自定义深色主题
const customPrismStyles = `
  code[class*="language-"],
  pre[class*="language-"] {
    color: #d4d4d4;
    text-shadow: none;
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: 14px;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    line-height: 1.5;
    tab-size: 4;
    hyphens: none;
  }

  pre[class*="language-"] {
    background: #1e1e1e;
    border-radius: 8px;
    padding: 1em;
    margin: 0;
    overflow: auto;
  }

  :not(pre) > code[class*="language-"] {
    background: #2d2d2d;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    white-space: normal;
  }

  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: #6a9955;
  }

  .token.punctuation {
    color: #d4d4d4;
  }

  .token.property,
  .token.tag,
  .token.boolean,
  .token.number,
  .token.constant,
  .token.symbol,
  .token.deleted {
    color: #b5cea8;
  }

  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin,
  .token.inserted {
    color: #ce9178;
  }

  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string {
    color: #d4d4d4;
    background: transparent;
  }

  .token.atrule,
  .token.attr-value,
  .token.keyword {
    color: #569cd6;
  }

  .token.function {
    color: #dcdcaa;
  }

  .token.regex,
  .token.important,
  .token.variable {
    color: #d16969;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }

  .token.italic {
    font-style: italic;
  }
`;

const useStyles = createStyles(({ token, css }) => ({
  markdown: css`
    font-size: 14px;
    line-height: 1.6;
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: ${token.colorBgTextHover};
      border-radius: 6px;
      font-family: ${token.fontFamilyCode};
    }
    
    pre {
      margin: 16px 0;
      padding: 0;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      border-radius: ${token.borderRadiusLG}px;
      border: none;
      
      code {
        background: none;
        padding: 0;
        border-radius: 0;
      }
    }
    
    ul, ol {
      padding-left: 2em;
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    table {
      display: block;
      width: 100%;
      overflow: auto;
      margin-top: 0;
      margin-bottom: 16px;
      border-spacing: 0;
      border-collapse: collapse;
      
      th, td {
        padding: 6px 13px;
        border: 1px solid ${token.colorBorder};
      }
      
      tr {
        background-color: ${token.colorBgContainer};
        border-top: 1px solid ${token.colorBorder};
      }
      
      tr:nth-child(2n) {
        background-color: ${token.colorBgTextHover};
      }
    }
    
    blockquote {
      margin: 0;
      margin-bottom: 16px;
      padding: 0 1em;
      color: ${token.colorTextSecondary};
      border-left: 0.25em solid ${token.colorBorder};
    }
    
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: ${token.colorBorder};
      border: 0;
    }
    
    img {
      max-width: 100%;
      box-sizing: border-box;
    }
    
    a {
      color: ${token.colorPrimary};
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

    ${customPrismStyles}
  `,
}));

interface MarkdownProps {
  content: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  const { styles } = useStyles();

  useEffect(() => {
    Prism.highlightAll();
  }, [content]);

  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !match;

      if (isInline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      return (
        <pre className={`language-${language}`}>
          <code className={`language-${language}`}>
            {String(children).replace(/\n$/, '')}
          </code>
        </pre>
      );
    },
  };

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
