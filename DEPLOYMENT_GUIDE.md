# 🚀 Complete Cloud Deployment Guide (100% Free Tier)

This guide shows you step-by-step how to deploy your Library Book Management System to the public internet using **Render.com** (Hosting) and **MongoDB Atlas** (Cloud Database).

---

## Step 1: Create a Free MongoDB Database (Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Select **M0 (Free Tier)** as your cluster type.
3. Choose a provider and region (e.g. AWS / us-east-1).
4. Under **Security Quickstart**:
   - Create a database user (e.g. `library_admin`) and generate a secure password. *(Save this password!)*
   - Under **IP Access List**, click **Add My Current IP Address**, and also add `0.0.0.0/0` (Allow Access from Anywhere) so your cloud hosting service can connect.
5. Go to your cluster overview and click **Connect** -> **Drivers** (Node.js).
6. Copy the connection string. It will look like:
   ```text
   mongodb+srv://library_admin:<password>@cluster0.abcde.mongodb.net/library_management?retryWrites=true&w=majority
   ```
   *(Replace `<password>` with your actual password and ensure `/library_management` is the database name).*

---

## Step 2: Deploy to Render.com (1-Click Deployment)

1. Sign up or log into [Render.com](https://render.com) using your GitHub account.
2. In the Render Dashboard, click **New +** and select **Web Service**.
3. Select your repository: **`Rajeshkovvuri07/FSD-project`**.
4. Configure the service settings:
   - **Name:** `athena-library` (or any custom name)
   - **Region:** Any (e.g., Oregon or Frankfurt)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Instance Type:** `Free`
5. Click **Advanced** -> **Add Environment Variable**:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = *(Paste your MongoDB Atlas connection string from Step 1)*
   - `JWT_SECRET` = *(Enter any random 32-character string)*
6. Click **Create Web Service**.

Render will automatically:
- Clone your repository.
- Install backend and frontend dependencies.
- Compile the React frontend into `frontend/dist`.
- Start the Express server on a live public URL (e.g., `https://athena-library.onrender.com`).

---

## Step 3: Seed Initial Demo Data in Production (Optional)

Once your service is live on Render:
1. In the Render dashboard, open your service and click **Shell** on the left menu.
2. Run:
   ```bash
   npm run seed
   ```
3. Your database will be populated with demo books and accounts:
   - **Admin:** `admin@library.com` | `AdminPassword@123`
   - **Librarian:** `librarian@library.com` | `LibrarianPassword@123`
   - **Student:** `alice@example.com` | `MemberPassword@123`

---

## Step 4: Running Locally Anytime

If you want to run the project on your local computer:
- **Windows (Double-Click):** Simply double-click [`run.bat`](file:///c:/Users/somaraju/OneDrive/Desktop/FSD/run.bat) in the project folder!
- **Terminal:**
  ```powershell
  npm run dev:memory
  ```
  Visit **http://localhost:5000** or **http://localhost:5173**.
