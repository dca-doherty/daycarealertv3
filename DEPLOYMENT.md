DaycareAlert Deployment Guide
Server Info

Server: root@srv787676 (82.25.86.132)
Domain: daycarealert.com
Path: /var/www/daycarealert/daycarealert.com

Architecture

Frontend: React (built to /build)
Backend: Node.js on ports 8081 & 8082
Web Server: Nginx
Process Manager: PM2
Database: MySQL

Deploy Commands
Backend Update
bashcd /var/www/daycarealert/daycarealert.com
git pull
npm install
pm2 restart all
Frontend Update
bashcd /var/www/daycarealert/daycarealert.com
git pull
npm install
npm run build
sudo systemctl reload nginx
Environment Variables
Create .env file:
NODE_ENV=production
DB_PASSWORD=your_password
PORT=8081
PM2 Commands

pm2 list - Show running processes
pm2 logs - View logs
pm2 restart all - Restart services
