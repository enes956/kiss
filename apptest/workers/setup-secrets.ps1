Write-Host "==== KissApp Secret Auto-Setup Basliyor ===="

$base = Split-Path $MyInvocation.MyCommand.Path

function Add-Secret($folder, $name) {
    Write-Host ""
    Write-Host "Worker: $folder | Secret: $name"
    $value = Read-Host "Secret degerini gir"

    Set-Location "$base\$folder"

    # PowerShell için doğru olan yöntem
    $value | wrangler secret put $name
}

# AUTH worker
Add-Secret "kissapp-auth" "AUTH_SECRET"

# KEY worker
Add-Secret "kissapp-key" "KEY_SECRET"

# TOKEN worker
Add-Secret "kissapp-token" "KEY_SECRET"

# PROXY worker
Add-Secret "kissapp-proxy" "KEY_SECRET"
Add-Secret "kissapp-proxy" "DEFAULT_FORWARD_URL"

Write-Host ""
Write-Host "=== Tum secret'lar basariyla eklendi ==="
