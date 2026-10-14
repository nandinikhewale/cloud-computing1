# Student Information Management System

A three-tier college administration app: vanilla JavaScript frontend, Express/Mongoose REST API, and MongoDB Atlas. The frontend never accesses MongoDB directly.

## Included
Dashboard statistics from database records; student list with backend search, department/semester filters, sorting and pagination; add/view/edit/confirmed-delete flows; input validation; REST health and stats endpoints; CORS and environment-based secrets.

## Run locally
1. Install Node.js 18+ and create a MongoDB Atlas cluster.
2. In backend/, run npm install.
3. Copy backend/.env.example to backend/.env. Replace the sample `MONGODB_URI` with the connection string from Atlas (`Database` → `Connect` → `Drivers`), using your database user's credentials and the exact cluster host. URL-encode any special characters in the password. Keep `.env` private.
4. Run the API with npm run dev from backend/.
5. Serve frontend/ on localhost:8000, for example npx serve frontend -l 8000 from the repository root. Match FRONTEND_URL in backend/.env to that origin.
6. Check http://localhost:5000/api/health, then open the local frontend.

MONGODB_DB defaults to studentDB; Mongoose uses the students collection. Student fields: studentId (unique), name, email, department, semester (1–8), contact (10-digit Indian mobile).

## API
GET /api/health; GET /api/stats; GET /api/students?search=&department=&semester=&sort=&page=&limit=; GET /api/students/:id; POST /api/students; PUT /api/students/:id; DELETE /api/students/:id.

## Deploy
### MongoDB Atlas
Create a cluster and least-privilege database user. Configure Atlas Network Access to allow the machine running the API, and confirm the database user/password in the URI. The connection URI must start with `mongodb+srv://` or `mongodb://`; URL-encode special characters in the username or password. Keep the connection URI secret. Database name is studentDB; collection students is created on first insert.

If Node reports `querySrv ECONNREFUSED` while resolving the Atlas hostname, check the machine's DNS resolver. You can optionally set `MONGODB_DNS_SERVERS=8.8.8.8,8.8.4.4` in `backend/.env` (or configure working DNS servers for the machine); the API uses this override only when the variable is set.
### Render API
Create a Node web service rooted at backend/. Build: npm install. Start: npm start. Configure MONGODB_URI (secret), MONGODB_DB=studentDB, FRONTEND_URL=<exact Netlify origin>, NODE_ENV=production. Render supplies PORT. Verify /api/health reports database connected. No live service URL is included in this source bundle.
### Netlify frontend
Publish the frontend/ directory. Change STUDENT_API_BASE_URL in frontend/config.js to the real Render origin. Add the exact Netlify site origin to Render's FRONTEND_URL. Test create, search, edit, delete, and dashboard refresh on the deployed site.

## Security
Never put MONGODB_URI in frontend files. Do not commit .env. Use HTTPS, restricted Atlas access, and a least-privilege DB user. This assignment does not implement authentication; do not expose real student data publicly until access control and privacy requirements are addressed.

## Verification checklist
[ ] Health shows MongoDB connected. [ ] Create and verify a record in Atlas. [ ] Duplicate Student IDs return 409. [ ] Invalid email/semester/contact are rejected. [ ] Search, filter, details, edit, and confirmed delete work. [ ] Dashboard metrics update after CRUD. [ ] Test mobile and deployed CORS. [ ] Check that frontend source and git history contain no secrets.