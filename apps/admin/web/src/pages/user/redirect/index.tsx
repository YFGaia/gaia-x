import { useIntl, history } from '@umijs/max';
import { Card, Typography, Button, Space } from 'antd';
import React, { useState, useEffect } from 'react';
import { useModel } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import useStyles from './style.style';

const { Title, Text, Paragraph } = Typography;

/**
 * 重定向页面 - 用于跳回Gaia-x应用
 */
const RedirectPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const intl = useIntl();
  const { styles } = useStyles();

  // 处理取消按钮点击
  const handleCancel = () => {
    // 返回到个人设置页
    history.push('/account/settings');
  };

  // 处理确认按钮点击
  const handleConfirm = () => {
    // 跳转到Gaia-x应用
    window.location.href = 'gaia-x://';
    // 返回到个人设置页
    history.push('/account/settings');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Card bordered={false} className={styles.card}>
          <div className={styles.titleContainer}>
            <Title level={2}>
              {intl.formatMessage({ id: 'pages.redirect.title' })}
            </Title>
          </div>
          
          <div className={styles.userInfo}>
            <div className={styles.subtitle}>
              {intl.formatMessage({ id: 'pages.redirect.subtitle' })}
            </div>
            <div className={styles.username}>
              {currentUser?.nickName || currentUser?.userName || currentUser?.email || ''}
            </div>
          </div>
          
          <Paragraph className={styles.note}>
            {intl.formatMessage({ id: 'pages.redirect.note' })}
          </Paragraph>
          
          <div className={styles.actions}>
            <Button onClick={handleCancel} size="large" style={{ minWidth: '100px' }}>
              {intl.formatMessage({ id: 'pages.redirect.cancel' })}
            </Button>
            <Button 
              type="primary" 
              onClick={handleConfirm} 
              size="large" 
              style={{ 
                fontWeight: 'bold', 
                minWidth: '140px',
                height: '40px',
                fontSize: '16px'
              }}
            >
              {intl.formatMessage({ id: 'pages.redirect.confirm' })}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RedirectPage; 