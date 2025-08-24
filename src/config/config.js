require('dotenv').config();

// 配置对象
const CONFIG = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "default-admin-username",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "default-admin-password",
  AUTH_API_KEY: process.env.AUTH_API_KEY || "your-api-key",
  PAGE_SIZE: parseInt(process.env.PAGE_SIZE || "12"),
  ACCESS_CONTROL: process.env.ACCESS_CONTROL || "open",
  GUEST_PASSWORD: process.env.GUEST_PASSWORD || "guest_password"
};

module.exports = CONFIG;