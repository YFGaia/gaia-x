export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'body-max-line-length': [2, 'always', 100],
      'subject-case': [0],
      'type-enum': [
        2,
        'always',
        [
          'feat',     // 新功能
          'fix',      // 修复bug
          'docs',     // 文档变更
          'style',    // 代码格式调整
          'refactor', // 代码重构
          'perf',     // 性能优化
          'test',     // 测试相关
          'build',    // 构建系统或外部依赖变更
          'ci',       // CI配置变更
          'chore',    // 其他修改
          'revert'    // 回退提交
        ]
      ]
    }
  };