const express = require('express');
const router = express.Router();

// 导入各个路由模块
const configRoutes = require('./configRoutes');
const keyRoutes = require('./keyRoutes');
const balanceRoutes = require('./balanceRoutes');
const authRoutes = require('./authRoutes');
const accessControlRoutes = require('./accessControlRoutes');

// 挂载路由
router.use('/api', configRoutes);
router.use('/api', keyRoutes);
router.use('/api', balanceRoutes);
router.use('/api', authRoutes);
router.use('/api', accessControlRoutes);

module.exports = router;