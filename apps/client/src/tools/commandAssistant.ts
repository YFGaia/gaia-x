interface CommandParams {
  shell: string;
  arg?: string;
}

export const executeCommand = async (params: CommandParams): Promise<string> => {
  const command = params.arg ? `${params.shell} ${params.arg}` : params.shell;
  
  // 模拟命令执行结果
  const mockResults: Record<string, string> = {
    'ls': '模拟文件列表:\nfile1.txt\nfile2.txt\ndirectory1/\ndirectory2/',
    'pwd': '/mock/current/directory',
    'ps': '模拟进程列表:\nPID  TTY  TIME     CMD\n1    ?    00:00:00 systemd\n2    ?    00:00:00 kthreadd',
    'docker': '模拟 Docker 命令执行成功',
    'git': '模拟 Git 命令执行成功'
  };

  // 获取命令的第一个词作为key
  const commandKey = command.split(' ')[0];
  
  // 返回模拟结果，如果没有预设结果则返回通用消息
  return mockResults[commandKey] || `模拟执行命令: ${command}\n命令执行成功！`;
}; 