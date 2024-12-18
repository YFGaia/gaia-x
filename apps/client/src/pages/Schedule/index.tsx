import { useScheduleStore } from '@/stores/ScheduleStore';
import { Progress } from 'antd';

const Schedule: React.FC = () => {
  const { percent, schedules } = useScheduleStore();
  return (
    <div>
      {schedules.length > 0 && (
        <div
          className={`absolute bottom-0 right-0 bg-[#FAFAFA] overflow-hidden z-10 w-[300px] rounded-sm px-2`}
        >
          <Progress percent={percent} type="line" showInfo={false} size="small" />
          <div className="overflow-hidden whitespace-nowrap truncate">
            {schedules.map((schedule) => schedule.name).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
