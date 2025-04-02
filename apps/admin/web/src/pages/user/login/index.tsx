import { Footer } from '@/components';
import { getCaptcha, login } from '@/services/gaia-x-admin';
import { checkDBInit } from '@/services/gaia-x-admin/initdb';
import { GithubOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, Helmet, history, SelectLang, useIntl, useModel } from '@umijs/max';
import { Alert, Button, message, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import Settings from '../../../../config/defaultSettings';
import Cookies from 'js-cookie';

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
    captchaContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px',
    },
    captchaInput: {
      flex: 1,
      '.ant-form-item': {
        marginBottom: 0,
      },
    },
    captchaImage: {
      height: '40px',
      cursor: 'pointer',
      borderRadius: '4px',
    },
    loginFormContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '75vw',
      minWidth: 280,
      margin: '0 auto',
    },
    initButton: {
      display: 'flex',
      width: '350px',
      minWidth: 280,
      height: '40px',
    },
  };
});

const ActionIcons = () => {
  const { styles } = useStyles();

  return (
    <>
      <GithubOutlined key="GithubOutlined" className={styles.action} />
    </>
  );
};

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

// 检查用户是否已登录
const checkIsLoggedIn = (): boolean => {
  // 从 cookie 中获取 x-token
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };
  
  // 检查 cookie 中是否有 x-token
  const tokenInCookie = getCookie('x-token');
  
  // 检查 localStorage 中是否有 token
  const tokenInStorage = localStorage.getItem('token');
  
  return !!tokenInCookie || !!tokenInStorage;
};

// 处理自动重定向
const handleRedirect = () => {
  const urlParams = new URL(window.location.href).searchParams;
  const redirectPath = urlParams.get('redirect') || '/';
  window.location.href = redirectPath;
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('account');
  // 验证码相关状态
  const [captchaInfo, setCaptchaInfo] = useState<API.CaptchaResult | null>(null);
  // 初始化状态
  const [initState, setInitState] = useState<{
    needInit: boolean;
    loading: boolean;
  }>({
    needInit: false,
    loading: true,
  });
  const { setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const intl = useIntl();

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const result = await getCaptcha();
      if (result.code === 0) {
        setCaptchaInfo(result.data);
      } else {
        message.error(result.msg || '获取验证码失败');
      }
    } catch (error) {
      console.error('获取验证码出错:', error);
      message.error('获取验证码失败，请稍后重试');
    }
  };

  // 检查是否需要初始化
  const checkInit = async () => {
    try {
      const result = await checkDBInit();
      if (result.code === 0) {
        setInitState({
          needInit: result.data?.needInit || false,
          loading: false,
        });
      } else {
        message.error(result.msg || '检查初始化状态失败');
        setInitState({
          needInit: false,
          loading: false,
        });
      }
    } catch (error) {
      console.error('检查初始化出错:', error);
      setInitState({
        needInit: false,
        loading: false,
      });
    }
  };

  // 组件加载时获取验证码和检查初始化状态，并检查是否已登录
  useEffect(() => {
    // 检查用户是否已登录，已登录则直接跳转
    if (checkIsLoggedIn()) {
      message.success('您已登录，正在跳转...');
      handleRedirect();
      return;
    }
    
    fetchCaptcha();
    checkInit();
  }, []);

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      // 构建登录参数，添加验证码信息
      const loginParams = {
        username: values.username || '',
        password: values.password || '',
        captcha: values.captcha,
        captchaId: captchaInfo?.captchaId,
      };

      // 登录
      const result = await login(loginParams);

      if (result.code === 0) {
        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: '登录成功！',
        });
        message.success(defaultLoginSuccessMessage);
        
        // 设置token到localStorage
        if (result.data?.token) {
          localStorage.setItem('token', result.data.token);
          Cookies.set('x-token', result.data.token);
        }
        
        flushSync(() => {
          setInitialState((s) => ({
            ...s,
            currentUser: result.data?.user,
          }));
        });
        const urlParams = new URL(window.location.href).searchParams;
        window.location.href = urlParams.get('redirect') || '/';
        return;
      }

      // 如果登录失败，刷新验证码
      fetchCaptcha();

      // 设置错误状态
      setUserLoginState({ status: 'error', type: 'account' });
      message.error(result.msg || '登录失败');
    } catch (error) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: '登录失败，请重试！',
      });
      console.error('登录出错:', error);
      message.error(defaultLoginFailureMessage);
      // 刷新验证码
      fetchCaptcha();
    }
  };

  const { status, type: loginType } = userLoginState;

  // 处理初始化按钮点击
  const handleCheckInit = () => {
    if (initState.needInit) {
      history.push('/init');
      message.info('正在前往初始化页面');
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录页',
          })}
          - {Settings.title}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <div className={styles.loginFormContainer}>
          <LoginForm
            contentStyle={{
              width: '100%',
            }}
            logo={<img alt="logo" src="/logo.svg" />}
            title="Gaia-X-Admin"
            subTitle={intl.formatMessage({ id: 'pages.layouts.userLayout.title' })}
            initialValues={{
              autoLogin: true,
            }}
            actions={[
              <FormattedMessage
                key="loginWith"
                id="pages.login.loginWith"
                defaultMessage="其他登录方式"
              />,
              <ActionIcons key="icons" />,
            ]}
            onFinish={async (values) => {
              await handleSubmit(values as API.LoginParams);
            }}
          >
            <Tabs
              activeKey={type}
              onChange={setType}
              centered
              items={[
                {
                  key: 'account',
                  label: intl.formatMessage({
                    id: 'pages.login.accountLogin.tab',
                    defaultMessage: '账户密码登录',
                  }),
                },
              ]}
            />

            {status === 'error' && loginType === 'account' && (
              <LoginMessage
                content={intl.formatMessage({
                  id: 'pages.login.accountLogin.errorMessage',
                  defaultMessage: '账户或密码错误',
                })}
              />
            )}
            {type === 'account' && (
              <>
                <ProFormText
                  name="username"
                  fieldProps={{
                    size: 'large',
                    prefix: <UserOutlined />,
                  }}
                  placeholder="请输入用户名"
                  rules={[
                    {
                      required: true,
                      message: '请输入用户名!',
                    },
                    {
                      min: 5,
                      message: '用户名长度至少为5位',
                    },
                  ]}
                />
                <ProFormText.Password
                  name="password"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined />,
                  }}
                  placeholder="请输入密码"
                  rules={[
                    {
                      required: true,
                      message: '请输入密码！',
                    },
                    {
                      min: 6,
                      message: '密码长度至少为6位',
                    },
                  ]}
                />

                {/* 验证码输入区域，仅在需要验证码时显示 */}
                {captchaInfo?.openCaptcha && (
                  <div className={styles.captchaContainer}>
                    <div className={styles.captchaInput}>
                      <ProFormText
                        name="captcha"
                        fieldProps={{
                          size: 'large',
                        }}
                        placeholder={`请输入${captchaInfo?.captchaLength}位验证码`}
                        rules={[
                          {
                            required: true,
                            message: '请输入验证码!',
                          },
                          {
                            len: captchaInfo?.captchaLength,
                            message: `请输入${captchaInfo?.captchaLength}位验证码`,
                          },
                        ]}
                      />
                    </div>
                    {captchaInfo?.picPath && (
                      <img
                        className={styles.captchaImage}
                        src={captchaInfo.picPath}
                        alt="验证码"
                        onClick={fetchCaptcha}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </LoginForm>

          <Button
            style={{
              width: '350px',
              minWidth: 280,
              height: '40px',
            }}
            type="primary"
            block
            size="large"
            className={styles.initButton}
            onClick={handleCheckInit}
            disabled={!initState.needInit}
            loading={initState.loading}
          >
            {initState.loading
              ? '检查初始化状态...'
              : initState.needInit
                ? '前往初始化'
                : '系统已初始化'}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
