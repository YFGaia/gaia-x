import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      background: token.colorBgLayout,
    },
    content: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 0',
    },
    card: {
      width: '100%',
      maxWidth: '480px',
      padding: '32px',
      borderRadius: '8px',
      border: `1px solid ${token.colorBorder}`,
      boxShadow: `0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08)`,
      backgroundColor: token.colorBgContainer,
    },
    titleContainer: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    userInfo: {
      textAlign: 'center',
      marginBottom: '32px',
      padding: '24px 20px',
      backgroundColor: 'rgba(24, 144, 255, 0.06)',
      borderRadius: '8px',
      borderLeft: `4px solid ${token.colorPrimary}`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
    subtitle: {
      color: token.colorTextSecondary,
      fontSize: '14px',
      marginBottom: '8px',
    },
    username: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: token.colorPrimary,
      margin: 0,
      padding: 0,
      display: 'inline-block',
      position: 'relative',
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: '-4px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '40px',
        height: '2px',
        backgroundColor: token.colorPrimary,
      },
    },
    note: {
      textAlign: 'center',
      marginBottom: '32px',
      color: token.colorTextSecondary,
      fontSize: '14px',
      padding: '12px',
      backgroundColor: token.colorInfoBg,
      borderRadius: '6px',
      border: `1px solid ${token.colorInfoBorder}`,
    },
    actions: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: '12px',
      gap: '16px',
    },
    '@media screen and (max-width: 576px)': {
      card: {
        padding: '24px',
        margin: '0 16px',
      },
    },
  };
});

export default useStyles; 