{
  "name": "zcode-studio-server",
  "script": "node_modules/next/dist/bin/next",
  "args": "start -p 3000",
  "cwd": "/www/wwwroot/zcode-studio",
  "env": {
    "NODE_ENV": "production",
    "DATABASE_URL": "file:/www/wwwroot/zcode-studio/db/custom.db",
    "PORT": "3000"
  },
  "instances": 1,
  "autorestart": true,
  "max_memory_restart": "512M",
  "error_file": "/www/wwwroot/zcode-studio/logs/error.log",
  "out_file": "/www/wwwroot/zcode-studio/logs/out.log",
  "log_date_format": "YYYY-MM-DD HH:mm:ss"
}
