-- Migration: 002 - alter_conversion_table
-- Created at: 2025-03-05T09:09:15.386Z
-- Description: [在这里写迁移说明]

-- 开始事务
BEGIN TRANSACTION;

-- 在这里写入您的SQL语句
-- 例如:
-- CREATE TABLE example (
--   id INT PRIMARY KEY
-- );

ALTER TABLE conversations ADD COLUMN created_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP;

-- 提交事务
COMMIT;
