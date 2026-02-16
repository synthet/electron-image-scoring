
param(
    [string]$InputPng,
    [string]$OutputIco
)

Add-Type -AssemblyName System.Drawing

$bitmap = [System.Drawing.Bitmap]::FromFile($InputPng)
# Create a new icon from the handle of the bitmap
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())

$fileStream = New-Object System.IO.FileStream($OutputIco, [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()

$icon.Dispose()
$bitmap.Dispose()

Write-Host "Converted $InputPng to $OutputIco"
