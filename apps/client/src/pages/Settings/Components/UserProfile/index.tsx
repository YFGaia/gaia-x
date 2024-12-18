import { Button, Card, Descriptions } from 'antd';
import { useUserStore } from '@/stores/UserStore';
import './index.css';
import { WindowService } from '@/services/WindowService';

export default function UserProfile() {
  const { userInfo } = useUserStore();

  return (
    <div className="user-profile">
      <h3>个人信息</h3>

      <Card className="user-profile-card">
        <Descriptions column={1}>
          <Descriptions.Item label="用户ID">{userInfo.id || '未登录'}</Descriptions.Item>
          <Descriptions.Item label="用户名">{userInfo.username || '未登录'}</Descriptions.Item>
        </Descriptions>

        <div className="user-profile-actions">
          <Button
            danger
            type="primary"
            onClick={() => {
              WindowService.logout(userInfo.id);
            }}
          >
            退出登录
          </Button>
        </div>
      </Card>
    </div>
  );
}
