import { Cookie, session, Session } from "electron";

export interface CookieConfig {
  url: string;
  name: string;
  value: string;
  domain: string;
  [key: string]: string;
}

export interface SessionConfig {
  cookies: CookieConfig[];
  partition: string;
}

export class SessionManager {
  static async setSession(request: SessionConfig): Promise<void> {
    try {
      console.log("Setting up session:", request.partition);

      let currentSession: Session;
      if (request.partition == "") {
        currentSession = session.defaultSession;
      } else {
        currentSession = session.fromPartition(request.partition, {
          cache: true,
        });
      }

      currentSession = session.defaultSession;
      await currentSession.clearStorageData({
        storages: ["cookies"],
      });

      // 拦截请求，添加 cookie
    currentSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const { requestHeaders } = details
      console.log('Original request headers:', requestHeaders)
      
      // 添加 cookie
      const storedCookies = request.cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ')
      
      requestHeaders['Cookie'] = storedCookies
      
      console.log('Modified request headers:', requestHeaders)
      callback({ requestHeaders })
    })

    // 处理响应头
    currentSession.webRequest.onHeadersReceived((details, callback) => {
      const { responseHeaders } = details

      if (responseHeaders) {
        delete responseHeaders['x-frame-options']
        delete responseHeaders['X-Frame-Options']

        if (responseHeaders['content-security-policy']) {
          let csp = responseHeaders['content-security-policy'][0]
          csp = csp.replace(/frame-ancestors[^;]*;/g, '')
          responseHeaders['content-security-policy'] = [csp]
        }
      }

      callback({ responseHeaders })
    })

      for (const cookie of request.cookies) {
        await currentSession.cookies.set({ ...cookie });
      }
      console.log("Session setup completed");
    } catch (error) {
      console.error(`Error setup session: ${request.partition}`, error);
      throw error;
    }
  }

  static async getCookies(partition: string): Promise<Cookie[]> {
    try {
      if (partition == "") {
        const currentSession = session.defaultSession;
        return await currentSession.cookies.get({});
      } else {
        const currentSession = session.fromPartition(partition);
        return await currentSession.cookies.get({});
      }
    } catch (error) {
      console.error(`Error get cookies: ${partition}`, error);
      throw error;
    }
  }

  static async removeCookie(
    partition: string,
    url: string,
    name?: string
  ): Promise<void> {
    try {
      const currentSession = session.fromPartition(partition);
      await currentSession.cookies.remove(url, name || "");
    } catch (error) {
      console.error(`Error remove cookie: ${partition}`, error);
      throw error;
    }
  }
}
