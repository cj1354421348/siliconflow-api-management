# 数据库路径变更问题说明

## 问题描述

在项目重构过程中，数据库文件的路径发生了变更，导致应用无法访问原有的密钥数据。

## 问题分析

### 原始版本
在原始版本中，数据库文件位于项目根目录：
```javascript
const dbPath = path.join(appRootDir, 'database.sqlite');
```

### 重构版本
在重构版本中，数据库文件路径被更改为：
```javascript
const dbPath = path.join(appRootDir, 'src', 'config', 'database.sqlite');
```

这个变更导致应用开始使用一个新的、空的数据库文件，而不是原有的包含密钥数据的数据库文件。

## 解决方案

我们将数据库路径改回原始位置，以确保应用能够访问原有的数据：
```javascript
const dbPath = path.join(appRootDir, 'database.sqlite');
```

## 验证结果

通过检查，我们确认原有的数据库文件 `database.sqlite` 包含了 5 个密钥数据，而新的数据库文件 `src/config/database.sqlite` 只包含一个测试密钥。

修改数据库路径后，应用现在能够正确访问原有的密钥数据。

## 后续建议

1. 在进行重大重构时，应特别注意文件路径的变更可能带来的数据访问问题
2. 建议在重构前后进行数据一致性检查
3. 如果确实需要变更数据库文件位置，应提供数据迁移脚本