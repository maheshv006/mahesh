# Crop RS- price strip from second batch of Sangam product screenshots
Add-Type -AssemblyName System.Drawing

$base = "C:\Users\Admin\.cursor\projects\c-Users-maheshproject\assets"
$dest = "c:\Users\maheshproject\images"

# L,T,R,B = fraction trimmed from left, top, right, bottom edges
$jobs = @(
  @{ Contains = "Screenshot_2026-03-28_141826"; L = 0.05; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-01.png" }
  @{ Contains = "Screenshot_2026-03-28_141840"; L = 0.05; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-02.png" }
  @{ Contains = "Screenshot_2026-03-28_141856"; L = 0.05; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-03.png" }
  @{ Contains = "Screenshot_2026-03-28_141912"; L = 0.05; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-04.png" }
  @{ Contains = "Screenshot_2026-03-28_141925"; L = 0.14; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-05.png" }
  @{ Contains = "Screenshot_2026-03-28_141940"; L = 0.05; T = 0.0; R = 0.05; B = 0.11; Out = "catalog-add-06.png" }
  @{ Contains = "Screenshot_2026-03-28_142001"; L = 0.05; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-07.png" }
  @{ Contains = "Screenshot_2026-03-28_142013"; L = 0.05; T = 0.0; R = 0.05; B = 0.13; Out = "catalog-add-08.png" }
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
