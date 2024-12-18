import type { WeatherTool, WeatherResponse } from '../types/tools';

const mockWeatherData: Record<string, WeatherResponse> = {
  '北京': {
    temperature: 20,
    humidity: 45,
    condition: '晴',
    wind: '东北风 100级',
    unit: 'celsius'
  },
  '上海': {
    temperature: 25,
    humidity: 60,
    condition: '多云',
    wind: '东风 2级',
    unit: 'celsius'
  },
  '广州': {
    temperature: 28,
    humidity: 70,
    condition: '阵雨',
    wind: '南风 4级',
    unit: 'celsius'
  }
};

export const getWeather = async (params: WeatherTool['parameters']): Promise<string> => {
  const { city, unit = 'celsius' } = params;
  
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const weather = mockWeatherData[city];
  if (!weather) {
    throw new Error(`未找到城市 ${city} 的天气信息`);
  }
  
  if (unit === 'fahrenheit') {

    const formattedWeather = {
        ...weather,
        temperature: Math.round(weather.temperature * 9/5 + 32),
        unit: 'fahrenheit'
      };
      
   // 格式化为json
    return JSON.stringify(formattedWeather, null, 2);
  }
  
  return JSON.stringify(weather, null, 2);;
}; 