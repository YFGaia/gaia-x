import type { ChatCompletionTool } from "openai/resources/chat/completions";

// 定义工具类型
export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "获取指定城市的天气信息",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "城市名称，例如：北京、上海、广州"
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "温度单位，celsius(摄氏度)或fahrenheit(华氏度)"
          }
        },
        required: ["city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "docker-compose-create",
      description: "创建docker-Compose部署文件",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "docker-compose文件路径，以yml为扩展名"
          },
          "docker-compose": {
            type: "string",
            description: "docker-compose.yaml文件内容"
          }
        },
        required: ["path", "docker-compose"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "command-assistant",
      description: "执行shell命令，完成相关操作",
      parameters: {
        type: "object",
        properties: {
          shell: {
            type: "string",
            description: "shell 命令"
          },
          arg: {
            type: "string",
            description: "命令参数"
          }
        },
        required: ["shell"]
      }
    }
  }
]; 