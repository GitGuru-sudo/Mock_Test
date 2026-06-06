# Deployment Guide

This guide covers every step from a fresh Windows machine to a fully deployed production app:
- Backend on **AWS EC2 (Ubuntu 22.04)**
- Frontend on **Vercel**
- CI/CD via **GitHub Actions**

---

## Step 1 — Push Code to GitHub

### 1.1 Create a GitHub repository

Go to https://github.com → New repository → Name it `campus-interview-tracker` → Create (do NOT initialize with README).

### 1.2 Initialize git and push

Open a terminal in `c:\Users\saksh\Downloads\host` and run:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/campus-interview-tracker.git
git push -u origin main
```

> The `.gitignore` already excludes `.env`, `node_modules`, `dist`, and `.kiro/` — nothing sensitive will be committed.

Verify on GitHub that your repo has: `client/`, `server/`, `.github/workflows/deploy.yml`, `README.md`, `docker-compose.yml`.

---

## Step 2 — Provision AWS EC2

### 2.1 Launch an EC2 instance

1. Sign in to https://console.aws.amazon.com
2. Go to **EC2** → **Launch Instance**
3. Settings:
   - **Name:** `campus-tracker-backend`
   - **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance type:** `t2.micro` (free tier) or `t3.small` for better performance
   - **Key pair:** Create new → name it `campus-tracker-key` → Download `.pem` file → **keep it safe**
   - **Network settings:** Allow SSH (port 22) and Custom TCP (port 5000) from `0.0.0.0/0`
4. Click **Launch Instance**

### 2.2 Open port 5000 in Security Group

1. EC2 Console → Your instance → **Security** tab → click the Security Group link
2. **Inbound rules** → **Edit inbound rules**
3. Add rule: Type = Custom TCP, Port = 5000, Source = 0.0.0.0/0
4. Save rules

### 2.3 Connect to EC2

On Windows, use PowerShell or Windows Terminal:

```powershell
# Move to the folder where you saved campus-tracker-key.pem
cd C:\Users\saksh\Downloads

# Fix permissions (Windows equivalent)
icacls "campus-tracker-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# SSH into the instance (replace <EC2_PUBLIC_IP> with your instance's Public IPv4)
ssh -i "campus-tracker-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

You should now see the Ubuntu shell.

---

## Step 3 — Setup EC2 Server

Run all these commands **inside the EC2 SSH session**:

### 3.1 Update system and install Node.js 20

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version   # should show v20.x.x
npm --version
```

### 3.2 Install PM2 (process manager)

```bash
sudo npm install -g pm2
pm2 --version
```

### 3.3 Install Git

```bash
sudo apt install -y git
git --version
```

### 3.4 Clone the repository

```bash
cd ~
git clone https://github.com/<your-username>/campus-interview-tracker.git
cd campus-interview-tracker
```

### 3.5 Install backend dependencies

```bash
cd server
npm install --omit=dev
```

### 3.6 Create the production .env file

```bash
nano .env
```

Paste and fill in your real values:

```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/campus-tracker?retryWrites=true&w=majority
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
JWT_ACCESS_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<generate again with same command>
CLIENT_URL=https://your-app.vercel.app
NODE_ENV=production
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

> Do NOT put quotes around values in .env files.

### 3.7 Seed the database

```bash
# Still in ~/campus-interview-tracker/server
node seed.js
```

Expected output:
```
Connected to MongoDB.
Cleared all collections.
Created 2 users.
Created 6 companies.
Created 60 students.
Created 23 sessions.
Seed complete!
Users: 2 | Companies: 6 | Students: 60 | Sessions: 23 | ...
```

### 3.8 Start the backend with PM2

```bash
# From ~/campus-interview-tracker/server
pm2 start src/index.js --name campus-tracker
```

Verify it's running:
```bash
pm2 status
pm2 logs campus-tracker --lines 20
```

You should see:
```
MongoDB connected: <host>
Server running in production mode on port 5000
```

### 3.9 Enable PM2 auto-start on reboot

```bash
pm2 save
pm2 startup
# Copy and run the command it outputs (starts with sudo env PATH=...)
```

### 3.10 Test the backend

From your local machine (or any browser), hit:

```
http://<EC2_PUBLIC_IP>:5000/api/dashboard/stats
```

You should get a 401 Unauthorized response (correct — the route requires auth). If you get a connection refused, check that port 5000 is open in the security group.

---

## Step 4 — Deploy Frontend to Vercel

### 4.1 Create a Vercel account

Go to https://vercel.com and sign up with your GitHub account.

### 4.2 Import your GitHub repo

1. Vercel Dashboard → **Add New** → **Project**
2. Click **Import** next to `campus-interview-tracker`
3. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `http://<EC2_PUBLIC_IP>:5000/api`
5. Click **Deploy**

Wait ~1 minute. Vercel gives you a URL like `https://campus-interview-tracker-abc123.vercel.app`.

### 4.3 Update CORS on the backend

SSH back into EC2 and update `CLIENT_URL`:

```bash
cd ~/campus-interview-tracker/server
nano .env
# Change CLIENT_URL= to your Vercel URL
# e.g. CLIENT_URL=https://campus-interview-tracker-abc123.vercel.app
```

Reload the backend:
```bash
pm2 reload campus-tracker
```

### 4.4 Test the full app

Open your Vercel URL in a browser. Login with:
- Admin: `admin@placement.com` / `Admin@123`
- Officer: `officer@placement.com` / `Officer@123`

---

## Step 5 — Setup CI/CD with GitHub Actions

The CI/CD runs automatically on every push to `main`. You need to add secrets to GitHub.

### 5.1 Get the Vercel tokens

On your **local machine**:

```bash
cd client
npx vercel login
npx vercel link
# Follow prompts — links to your Vercel project
cat .vercel/project.json
# Shows: { "orgId": "team_xxx", "projectId": "prj_xxx" }
```

Go to https://vercel.com/account/tokens → **Create Token** → name it `github-actions` → Copy the token.

### 5.2 Get the EC2 SSH private key content

On Windows PowerShell:
```powershell
Get-Content "C:\Users\saksh\Downloads\campus-tracker-key.pem"
```
Copy the entire output including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`.

### 5.3 Add secrets to GitHub

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add all 7 secrets:

| Secret Name | Value |
|---|---|
| `EC2_HOST` | Your EC2 Public IPv4 address (e.g. `54.210.x.x`) |
| `EC2_USERNAME` | `ubuntu` |
| `EC2_SSH_KEY` | Full content of your `.pem` file |
| `EC2_PORT` | `22` |
| `VERCEL_TOKEN` | Token from Vercel account settings |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

### 5.4 Test the pipeline

Make any small change (e.g., edit a comment in any file) and push:

```bash
git add .
git commit -m "test ci/cd pipeline"
git push origin main
```

Go to your GitHub repo → **Actions** tab → watch the workflow run. Both backend and frontend jobs should complete with green checkmarks.

---

## Step 6 — (Optional) Add HTTPS with Nginx + Certbot

For production-grade HTTPS on the backend:

### 6.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 6.2 Create Nginx config

```bash
sudo nano /etc/nginx/sites-available/campus-tracker
```

Paste:
```nginx
server {
    listen 80;
    server_name <EC2_PUBLIC_IP>;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/campus-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now the backend is accessible on port 80 (no `:5000` needed). Update `VITE_API_URL` on Vercel to `http://<EC2_PUBLIC_IP>/api`.

### 6.3 Add a domain (optional)

Point a domain at your EC2 IP in your DNS provider, then install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Your backend will have HTTPS. Update `VITE_API_URL` to `https://yourdomain.com/api`.

---

## Useful Commands (EC2 Reference)

```bash
# View PM2 process status
pm2 status

# View live logs
pm2 logs campus-tracker

# Restart after manual .env change
pm2 reload campus-tracker --update-env

# Pull latest code and restart (manual deploy)
cd ~/campus-interview-tracker && git pull origin main && cd server && npm install --omit=dev && pm2 reload campus-tracker

# Re-run seed (clears DB first — careful in production!)
cd ~/campus-interview-tracker/server && node seed.js

# Check if port 5000 is listening
sudo lsof -i :5000

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Deployment Checklist

```
GitHub
  [ ] Repository created and code pushed
  [ ] .env files NOT committed (check .gitignore)
  [ ] .github/workflows/deploy.yml present

EC2
  [ ] Instance running (Ubuntu 22.04)
  [ ] Port 5000 open in Security Group
  [ ] Node.js 20 installed
  [ ] PM2 installed
  [ ] Repo cloned to ~/campus-interview-tracker
  [ ] server/.env created with all production values
  [ ] npm install --omit=dev completed
  [ ] node seed.js run successfully
  [ ] pm2 start src/index.js --name campus-tracker
  [ ] pm2 save && pm2 startup executed
  [ ] Backend responds at http://<IP>:5000/api/dashboard/stats

Vercel
  [ ] Project imported from GitHub with Root Directory: client
  [ ] VITE_API_URL set to http://<EC2_IP>:5000/api
  [ ] Build successful
  [ ] App accessible at Vercel URL

CORS
  [ ] CLIENT_URL in server/.env set to Vercel URL
  [ ] pm2 reload campus-tracker run after updating CLIENT_URL

CI/CD Secrets (GitHub)
  [ ] EC2_HOST set
  [ ] EC2_USERNAME set (ubuntu)
  [ ] EC2_SSH_KEY set (full .pem content)
  [ ] EC2_PORT set (22)
  [ ] VERCEL_TOKEN set
  [ ] VERCEL_ORG_ID set
  [ ] VERCEL_PROJECT_ID set

Verification
  [ ] Login works at Vercel URL
  [ ] Dashboard shows student counts
  [ ] Students page loads 60 students
  [ ] Companies page shows 6 companies
  [ ] Push to main triggers GitHub Actions green build
```
