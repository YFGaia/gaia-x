import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <DefaultFooter
      style={{
        background: 'none',
      }}
      copyright="Powered by Gaia-X"
      links={[
        {
          key: 'Gaia-X-Admin',
          title: 'Gaia-X-Admin',
          href: 'https://github.com/YFGaia/gaia-x',
          blankTarget: true,
        },
        {
          key: 'github',
          title: <GithubOutlined />,
          href: 'https://github.com/YFGaia/gaia-x',
          blankTarget: true,
        },
        {
          key: 'Gaia-X',
          title: 'Gaia-X',
          href: 'https://github.com/YFGaia/gaia-x',
          blankTarget: true,
        },
      ]}
    />
  );
};

export default Footer;
