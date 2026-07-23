@echo off
cd /d C:\Users\thanw\Desktop\TKTW
echo Running soak: 1000 games, 10 players, random seats + generals...
pnpm --filter @tktw/engine sim -- --games 1000 --players 10 --quiet > soak_output.txt 2>&1
echo Exit code: %ERRORLEVEL% >> soak_output.txt
echo Done! Output saved to soak_output.txt
pause
