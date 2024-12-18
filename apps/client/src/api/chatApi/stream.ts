import { EventStreamContentType, fetchEventSource } from "@fortaine/fetch-event-source";
import { StreamDelta } from "@/types/xKey/types";
import { useUserStore } from "@/stores/UserStore";
import { WindowService } from "@/services/WindowService";

/**
 * Default request timeout in milliseconds
 * After this duration, the request will be automatically aborted
 */
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds timeout

// 无 API 请求，测试流式响应
const testStream = async (
  content: string, 
  controller: AbortController, 
  options: {
    onUpdate?: (index: number, text: string, delta: StreamDelta) => void;
    onFinish?: (index: number, text: string, response?: Response) => void;
    onError?: (index: number, error: Error) => void;
  }
) => {
  for(let i=0; i<content.length; i+=2) {
    options.onUpdate?.(i, "Hello, world!", {
      content: content.slice(i, i+2),
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    if(controller.signal.aborted) return;
  }
  controller.abort();
  options.onFinish?.(content.length, "Hello, world!");
}

/**
 * 流式请求
 * @param chatPath - 聊天 API 路径
 * @param requestPayload - 请求体
 * @param headers - 请求头
 * @param controller - AbortController, 用来终止流式请求
 * @param parseMsg - 回调函数，解析流式响应的每一段消息，每个模型供应商API需要在回调函数内处理返回统一格式
 * @param options - 流式请求的生命周期回调，包含三个回调函数：
 * - onUpdate: 更新流式响应
 * - onFinish: 流式响应结束
 * - onError: 流式请求错误
 */
export function stream(
  chatPath: string,
  requestPayload: any,
  headers: any,
  controller: AbortController,
  parseMsg: (msg: any) => StreamDelta,
  options: {
    onUpdate?: (index: number, text: string, delta: StreamDelta) => void;
    onFinish?: (index: number, text: string, response?: Response) => void;
    onError?: (index: number, error: Error) => void;
  }
) {
  let responseText = "";
  let remainText = "";
  let finished = false;
  let respCache: Response;
  let counter = 0;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  /**
   * Handles stream completion
   * Called when stream ends or is aborted
   */
  const finish = () => {
    if (!finished) {
      finished = true;
      console.info('Stream completed');
      options.onFinish?.(counter++, responseText + remainText, respCache);
    } else {
      console.info('Stream already finished');
      controller.abort();
    }
  };

  controller.signal.onabort = finish;

  /**
   * Initiates the streaming request to the chat API
   * Handles response parsing and error handling
   */
  const startChat = async () => {
    console.info('Starting chat stream request', chatPath);
    const requestTimeoutId = setTimeout(() => {
      console.warn(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    
    if(chatPath.startsWith("http://example.com")) {
      testStream(requestPayload.messages[requestPayload.messages.length - 1].content, controller, options);
      return;
    }

    try {
      await fetchEventSource(chatPath, {
        openWhenHidden: true,
        method: "POST",
        headers,
        body: JSON.stringify({
          ...requestPayload,
        }),
        signal: controller.signal,
        async onopen(res) {
          console.info('Stream connection established', res);
          clearTimeout(requestTimeoutId);
          respCache = res;

          if (!res.ok || res.status !== 200) {
            const errorText = await res.text();
            console.error(`Stream request failed: ${res.status} ${errorText}`);
            
            // Handle specific error cases
            if (res.status === 401) {
              window.ipcRenderer.send('global-notification', 'Gaia-X 登录已过期', "请在 设置 - 个人信息 退出重新登录", false);
              const error = new Error("Unauthorized - Please check your API credentials");
              error.message = errorText;
              options.onError?.(counter++, error);
              controller.abort();
              const id = useUserStore.getState().userInfo.id;
              WindowService.logout(id);
              return;
            }

            if (res.status === 404) {
              window.ipcRenderer.send('global-notification', '未发现应用', "请在 Gaia 平台切换到正确的工作区", false);
              const error = new Error("Not Found - Please check your API credentials");
              error.message = errorText;
              options.onError?.(counter++, error);
              controller.abort();
              return;
            }
            
            // Retry on 5xx server errors
            if (res.status >= 500 && retryCount < MAX_RETRIES) {
              retryCount++;
              console.info(`Retrying request (${retryCount}/${MAX_RETRIES})`);
              setTimeout(startChat, RETRY_DELAY * retryCount);
              return;
            }

            const error = new Error(`HTTP error! status: ${res.status}\n${errorText}`);
            error.message = errorText;
            options.onError?.(counter++, error);
            controller.abort();
            return;
          }

          const contentType = res.headers.get("content-type");
          if (contentType?.startsWith("text/plain")) {
            console.info('Received plain text response');
            responseText = await res.text();
            finish();
            return;
          }

          if (!contentType?.startsWith(EventStreamContentType)) {
            console.error(`Invalid content type: ${contentType}`);
            options.onError?.(counter++, new Error(`Unexpected content type: ${contentType}`));
            controller.abort();
          }
          
          console.info('Stream connection established', respCache);
        },
        onmessage(msg) {
          try {
            // Handle empty or invalid messages gracefully
            if (!msg?.data) {
              console.warn('Received empty message data');
              return;
            }

            // Special handling for completion signal
            if (msg.data === "[DONE]") {
              return finish();
            }

            const deltaChunk = parseMsg(msg);
            // console.log('deltaChunk', deltaChunk);
            if (deltaChunk) {
              if (deltaChunk.isFinish) {
                return finish();
              }
              remainText += deltaChunk.content || '';
              options.onUpdate?.(counter++, responseText + remainText, deltaChunk);
            }
          } catch (error) {
            console.error('Error processing message:', error);
            // Don't fail the entire stream on single message error
            options.onError?.(counter++, error as Error);
          }
        },
        onclose() {
          console.info('Stream connection closed');
          finish();
        },
        onerror(error) {
          console.error(`Stream error: ${error}`);
          
          // Retry on network errors
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.info(`Retrying request (${retryCount}/${MAX_RETRIES})`);
            setTimeout(startChat, RETRY_DELAY * retryCount);
            return;
          }
          
          options.onError?.(counter++, error as Error);
          controller.abort();
          throw error;
        },
      });
    } catch (error) {
      console.error('Fatal stream error:', error);
      options.onError?.(counter++, error as Error);
      controller.abort();
    }
  };

  startChat();
}