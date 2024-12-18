import { URL } from 'url';
export async function handleProtocol(urlString: string): Promise<void> {
  const url = new URL(urlString);

  const params = url.searchParams;
  const code = params.get('code');
  
  //TODO 处理其他逻辑比如打开页面，比如是否直接显示settings页面

  console.log(code);
}

export function getOauthString(urlString: string): string {
  const url = new URL(urlString);

  const params = url.searchParams;
  return params.get('code') || '';
}
