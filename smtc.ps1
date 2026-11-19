# Lit le lecteur multimedia Windows (SMTC) : YouTube Music, Deezer, Spotify... (navigateur ou app)
# Emet des lignes JSON sur stdout, recoit des commandes sur stdin.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  [void]$t.Wait(5000)
  $t.Result
}
function Emit($o) { [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress -Depth 3)); [Console]::Out.Flush() }

[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$mgrT  = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$propT = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$strT  = [Windows.Storage.Streams.IRandomAccessStreamWithContentType]
$mgr = Await ($mgrT::RequestAsync()) $mgrT

$readTask = [Console]::In.ReadLineAsync()
$lastKey = ''; $coverSent = $false; $coverTries = 0; $wasActive = $null

while ($true) {
  $s = $mgr.GetCurrentSession()

  # ---- commandes
  if ($readTask.IsCompleted) {
    $cmd = $readTask.Result
    $readTask = [Console]::In.ReadLineAsync()
    if ($s -and $cmd) {
      switch -regex ($cmd) {
        '^toggle$' { [void]$s.TryTogglePlayPauseAsync() }
        '^play$'   { [void]$s.TryPlayAsync() }
        '^pause$'  { [void]$s.TryPauseAsync() }
        '^next$'   { [void]$s.TrySkipNextAsync() }
        '^prev$'   { [void]$s.TrySkipPreviousAsync() }
        '^seek:(\d+)$' { [void]$s.TryChangePlaybackPositionAsync([long]$matches[1] * 10000) }
      }
    }
  }

  if (-not $s) {
    if ($wasActive -ne $false) { Emit @{ type = 'state'; active = $false }; $wasActive = $false }
  } else {
    $wasActive = $true
    $props = Await ($s.TryGetMediaPropertiesAsync()) $propT
    $tl = $s.GetTimelineProperties()
    $playing = ($s.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing')
    $dur = ($tl.EndTime - $tl.StartTime).TotalMilliseconds
    $pos = ($tl.Position - $tl.StartTime).TotalMilliseconds
    if ($playing) {
      $pos += ([DateTimeOffset]::UtcNow - $tl.LastUpdatedTime).TotalMilliseconds
      if ($dur -gt 0 -and $pos -gt $dur) { $pos = $dur }
      if ($pos -lt 0) { $pos = 0 }
    }
    $key = "$($props.Title)|$($props.Artist)"
    if ($key -ne $lastKey) { $lastKey = $key; $coverSent = $false; $coverTries = 0 }
    Emit @{ type = 'state'; active = $true; title = $props.Title; artist = $props.Artist; album = $props.AlbumTitle
            playing = $playing; pos = [math]::Round($pos); dur = [math]::Round($dur); app = $s.SourceAppUserModelId; key = $key }

    if (-not $coverSent -and $coverTries -lt 12 -and $props.Thumbnail) {
      $coverTries++
      $st = Await ($props.Thumbnail.OpenReadAsync()) $strT
      if ($st -and $st.Size -gt 0) {
        $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($st)
        $ms = New-Object System.IO.MemoryStream
        $net.CopyTo($ms)
        Emit @{ type = 'cover'; key = $key; data = [Convert]::ToBase64String($ms.ToArray()) }
        $coverSent = $true
      }
    }
  }
  Start-Sleep -Milliseconds 400
}
