@echo off
setlocal
cd /d "%~dp0"
echo [1/3] Ensuring the Sukoon Docker database is running on its dedicated host port 5433...
docker compose up -d --force-recreate postgres
if errorlevel 1 (
  echo ERROR: Docker could not recreate the Sukoon database container.
  exit /b 1
)
echo [2/3] Writing the API connection settings...
node -e "const fs=require('fs');const p='apps/api/.env';let s=fs.existsSync(p)?fs.readFileSync(p,'utf8'):fs.readFileSync('apps/api/.env.example','utf8');const line='DATABASE_URL=postgresql://sukoon:88588@127.0.0.1:5433/sukoon_cafe';if(/^DATABASE_URL=.*$/m.test(s))s=s.replace(/^DATABASE_URL=.*$/m,line);else s=s.replace(/\\s*$/,'\\n')+line+'\\n';fs.writeFileSync(p,s);"
if errorlevel 1 (
  echo ERROR: Could not write apps\api\.env.
  exit /b 1
)
echo [3/3] Testing the Windows Node.js connection...
pushd apps\api
node -e "require('dotenv').config({override:true});const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT current_database() AS db,current_user AS usr').then(r=>console.log('CONNECTED:',r.rows[0])).catch(e=>{console.error('CONNECTION FAILED:',e.message);process.exitCode=1}).finally(()=>p.end())"
set RESULT=%ERRORLEVEL%
popd
if not "%RESULT%"=="0" (
  echo ERROR: Connection test failed. No database volume was deleted.
  exit /b %RESULT%
)
echo SUCCESS: Sukoon is connected on port 5433. Your Windows PostgreSQL on 5432 was not changed.
