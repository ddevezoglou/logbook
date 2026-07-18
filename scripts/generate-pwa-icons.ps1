param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\icons')
)

Add-Type -AssemblyName System.Drawing

$ink = [System.Drawing.Color]::FromArgb(255, 21, 19, 13)
$paper = [System.Drawing.Color]::FromArgb(255, 239, 232, 216)
$gold = [System.Drawing.Color]::FromArgb(255, 201, 162, 39)

function New-RoundedRectanglePath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-LogbookIcon([int]$Size, [string]$Path, [bool]$Maskable) {
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $backgroundBrush = [System.Drawing.SolidBrush]::new($ink)
  if ($Maskable) {
    $graphics.FillRectangle($backgroundBrush, 0, 0, $Size, $Size)
    $scale = $Size / 80
    $offset = 8 * $scale
  } else {
    $radius = $Size * 0.1875
    $background = New-RoundedRectanglePath 0 0 $Size $Size $radius
    $graphics.FillPath($backgroundBrush, $background)
    $background.Dispose()
    $scale = $Size / 64
    $offset = 0
  }

  $paperBrush = [System.Drawing.SolidBrush]::new($paper)
  $goldBrush = [System.Drawing.SolidBrush]::new($gold)
  $rectangles = @(
    @{ X=14; Y=20; W=5; H=24; Brush=$paperBrush },
    @{ X=21; Y=24; W=4; H=16; Brush=$paperBrush },
    @{ X=25; Y=30; W=14; H=4; Brush=$goldBrush },
    @{ X=39; Y=24; W=4; H=16; Brush=$paperBrush },
    @{ X=45; Y=20; W=5; H=24; Brush=$paperBrush }
  )
  foreach ($rectangle in $rectangles) {
    $graphics.FillRectangle(
      $rectangle.Brush,
      $offset + $rectangle.X * $scale,
      $offset + $rectangle.Y * $scale,
      $rectangle.W * $scale,
      $rectangle.H * $scale
    )
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $goldBrush.Dispose()
  $paperBrush.Dispose()
  $backgroundBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
New-LogbookIcon 192 (Join-Path $resolvedOutput 'icon-192.png') $false
New-LogbookIcon 512 (Join-Path $resolvedOutput 'icon-512.png') $false
New-LogbookIcon 512 (Join-Path $resolvedOutput 'icon-maskable-512.png') $true
New-LogbookIcon 180 (Join-Path $resolvedOutput 'apple-touch-icon.png') $true
