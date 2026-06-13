# Testbot Deployment Guide (AWS)

Because Playwright requires actual browser engines (Chromium, Firefox, WebKit) and specific Linux OS dependencies to run tests, we must use a provider that supports **Docker** deployments. 

Since the main Avua website is hosted on AWS, deploying the Testbot within the same AWS infrastructure is the **highly recommended approach**. 

### Why AWS?
1. **Bypass Security Blocks (WAF/Cloudflare):** By running the bot from the same VPC (Virtual Private Cloud) as the main site, or by allowing the AWS IP, you completely bypass CAPTCHAs and "Checking your browser" firewall challenges.
2. **Speed & Stability:** You get dedicated CPU/RAM, completely eliminating the "cold start" sleep delays and out-of-memory crashes experienced on free cloud tiers.

---

## Option 1: AWS App Runner (Easiest & Recommended)
AWS App Runner is a fully managed container service. It builds your Docker image from GitHub and auto-scales, completely abstracting away the server management.

### Step 1: Connect GitHub to App Runner
1. Log into the AWS Management Console and search for **App Runner**.
2. Click **Create an App Runner service**.
3. Under **Repository type**, select **Source code repository**.
4. Connect your GitHub account and select this repository (`playwright-avua`).
5. Choose the `main` or `chatBot` branch.
6. For **Deployment settings**, choose **Automatic** (so it deploys automatically when you push to GitHub).

### Step 2: Configure the Build
1. Under **Build settings**, choose **Configure all settings here**.
2. **Runtime:** Select `Docker`.
3. **Start command:** Leave blank (it will use the default `CMD` from our `Dockerfile`).
4. **Port:** Enter `3000`.

### Step 3: Configure the Service
1. **Service name:** `avua-testbot`
2. **Compute Configuration:** Choose **1 vCPU and 2 GB memory**. *(Note: Playwright is very memory intensive; 2GB is highly recommended to prevent crashes).*
3. **Environment variables:** Add the following plain text variables:
   - `GEMINI_API_KEY`: *(Your active Gemini API key)*
   - `BOT_PASSWORD`: *(A strong password for the UI)*
4. **Networking:** If your main site requires internal VPC access to bypass the WAF, select **Custom VPC** and select your existing VPC. Otherwise, leave as Public.

### Step 4: Deploy & Verify
1. Review the settings and click **Create & deploy**.
2. AWS will provision the environment, build the Docker image, and start the server. This initial process takes about 5-10 minutes.
3. Once the status turns to "Running", click the **Default domain** URL provided by App Runner.
4. Enter your `BOT_PASSWORD` and try running a test!

---

## Option 2: AWS EC2 (Most Control / Traditional)
If you prefer traditional servers, or want to run the Testbot directly alongside your existing backend instances to guarantee internal network access, use EC2.

### Step 1: Launch an EC2 Instance
1. In the AWS Console, go to **EC2** and click **Launch Instances**.
2. **Name:** `Avua-Testbot-Server`
3. **AMI (OS):** Choose **Ubuntu Server 22.04 LTS** (or 24.04 LTS).
4. **Instance Type:** Select **t3.small** (2 vCPUs, 2 GB RAM). *Do not use a t3.micro (1GB) as Playwright will likely crash from Out Of Memory (OOM) errors.*
5. **Key Pair:** Create or select an existing key pair so you can SSH into the server.
6. **Network Settings:** 
   - Ensure the instance is in the same VPC as your main site (if desired).
   - Check **Allow HTTP traffic from the internet** and **Allow SSH traffic**.
7. Click **Launch Instance**.

### Step 2: Configure Security Groups
1. Go to your EC2 Instances list, click your new instance, and open its **Security Group**.
2. Add an **Inbound Rule** to allow **Custom TCP** traffic on port `3000` from `0.0.0.0/0` (or restrict it to your office IP for extra security).

### Step 3: Install Docker & Deploy
1. SSH into your newly created EC2 instance using your terminal:
   ```bash
   ssh -i your-key.pem ubuntu@<your-ec2-ip>
   ```

2. Update the system and install Docker:
   ```bash
   sudo apt update -y
   sudo apt install docker.io -y
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ubuntu
   ```
   *(Note: You may need to log out of SSH and log back in for the user group change to take effect).*

3. Clone the repository:
   ```bash
   git clone https://github.com/aakarshitsharma06/playwright-avua.git
   cd playwright-avua
   ```

4. Create the Environment File:
   ```bash
   nano .env
   ```
   Paste your secrets into the file exactly like this:
   ```
   GEMINI_API_KEY=your_api_key_here
   BOT_PASSWORD=your_secure_password
   PORT=3000
   ```
   Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

5. Build and Run the Docker Container:
   ```bash
   docker build -t avua-testbot .
   docker run -d --name testbot -p 3000:3000 --restart unless-stopped avua-testbot
   ```

### Step 4: Verify
Open your browser and navigate to `http://<your-ec2-ip>:3000`. You should see the Testbot UI!

---

## Troubleshooting
- **Tests hanging or crashing on EC2:** Run `docker logs testbot`. If you see "Out of Memory" (OOM) errors, your server does not have enough RAM for the browsers. Consider upgrading the instance type to a `t3.medium`.
- **AI Summary Failing:** If you encounter a `429 Quota Exceeded` error in the logs, you have hit the Gemini API rate limit. Ensure your project is linked to an active billing account.
