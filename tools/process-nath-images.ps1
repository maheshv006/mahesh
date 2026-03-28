# Crop price text corners from Nath product photos (.NET, no Python)
Add-Type -AssemblyName System.Drawing

$base = "C:\Users\Admin\.cursor\projects\c-Users-maheshproject\assets"
$dest = "c:\Users\maheshproject\images"

# Crop mode: keep this rectangle as fraction of W,H (left, top, right, bottom as 0-1 from edges)
# br = trim bottom-right corner, bl = trim bottom-left, tl = trim top-left, bc = trim bottom strip center
$jobs = @(
  @{ Contains = "1.46.02_PM-9bf26769"; L = 0.0; T = 0.0; R = 0.18; B = 0.12; Out = "catalog-nath-01.png" }
  @{ Contains = "1.46.01_PM__1_-ef5a4104"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-02.png" }
  @{ Contains = "1.46.01_PM-e8a9fbc3"; L = 0.14; T = 0.14; R = 0.0; B = 0.0; Out = "catalog-nath-03.png" }
  @{ Contains = "1.46.00_PM__2_-d6201ca0"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-04.png" }
  @{ Contains = "1.46.00_PM__1_-b94be1a2"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-05.png" }
  @{ Contains = "1.46.00_PM-b7167f9d"; L = 0.05; T = 0.0; R = 0.05; B = 0.14; Out = "catalog-nath-06.png" }
  @{ Contains = "1.45.59_PM__2_-5d2acd3f"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-07.png" }
  @{ Contains = "1.45.59_PM__1_-80beb05a"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-08.png" }
  @{ Contains = "1.45.59_PM-8cf735d6"; L = 0.14; T = 0.14; R = 0.0; B = 0.0; Out = "catalog-nath-09.png" }
  @{ Contains = "1.45.58_PM__1_-bdbc9f31"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-10.png" }
  @{ Contains = "1.45.58_PM-33439c28"; L = 0.14; T = 0.0; R = 0.0; B = 0.12; Out = "catalog-nath-11.png" }
)

function Crop-Image {
  param($SrcPath, $OutPath, $L, $T, $R, $B)
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $SrcPath))
  $W = $img.Width
  $H = $img.Height
  $x = [int]($L * $W)
  $y = [int]($T * $H)
  $w = [int]($W - ($L + $R) * $W)
  $h = [int]($H - ($T + $B) * $H)
  if ($w -lt 1) { $w = 1 }
  if ($h -lt 1) { $h = 1 }
  $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $bmp = $img.Clone($rect, $img.PixelFormat)
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $img.Dispose()
}

foreach ($j in $jobs) {
  $found = Get-ChildItem -Path $base -File -Filter "*.png" | Where-Object { $_.Name -like "*$($j.Contains)*" } | Select-Object -First 1
  if (-not $found) {
    Write-Warning "Missing: $($j.Contains)"
    continue
  }
  $outPath = Join-Path $dest $j.Out
  Crop-Image -SrcPath $found.FullName -OutPath $outPath -L $j.L -T $j.T -R $j.R -B $j.B
  Write-Host "OK $($j.Out)"
}
