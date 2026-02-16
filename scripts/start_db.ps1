$processName = "firebird"
$firebirdPath = "d:\Projects\image-scoring\run_firebird.bat"

$running = Get-Process -Name $processName -ErrorAction SilentlyContinue

if ($running) {
    Write-Host "Firebird server is already running. Waiting for process..."
    $running | Wait-Process
} else {
    Write-Host "Starting Firebird server..."
    # Start the batch file. We use Start-Process to ensure it runs correctly.
    # We want it to stay running, but not block this script if it's meant to be a background task.
    # However, for 'concurrently' in npm scripts, we often want a long-running process.
    # If we just start it and exit, 'concurrently' might think the task is done.
    # But run_firebird.bat runs firebird.exe -a which is an application mode (blocking).
    
    # If we run it directly here, this script will block until Firebird exits.
    # This is what we want for 'concurrently' usage in 'npm run dev'.
    # cmd /c $firebirdPath
    
    # Using Start-Process to spawn it in a new window might be better for visibility,
    # OR running it inline so it shares the console lifetime.
    
    # Let's try running it inline first as that's usually better for dev setups.
    & $firebirdPath
}
