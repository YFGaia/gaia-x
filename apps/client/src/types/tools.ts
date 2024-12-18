export interface WeatherTool {
  name: 'get_weather';
  description: '获取指定城市的天气信息';
  parameters: {
    city: string;
    unit?: 'celsius' | 'fahrenheit';
  };
}

export interface WeatherResponse {
  temperature: number;
  humidity: number;
  condition: string;
  wind: string;
  unit: string;
}

export type Tool = WeatherTool; 