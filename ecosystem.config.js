module.exports = {
  apps: [
    {
      name: "daycarealert-api-primary",
      script: "./backend/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 8081
      }
    },
    {
      name: "daycarealert-api-secondary",
      script: "./backend/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 8082
      }
    }
  ]
};
