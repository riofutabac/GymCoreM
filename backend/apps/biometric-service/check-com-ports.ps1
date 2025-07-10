# Script para detectar puertos COM disponibles
Write-Host "=== Detectando puertos COM disponibles ===" -ForegroundColor Green

# Mostrar todos los puertos COM del sistema
$ports = Get-WmiObject -Class Win32_SerialPort | Select-Object DeviceID, Description, Status
if ($ports) {
    Write-Host "`nPuertos COM encontrados:" -ForegroundColor Yellow
    $ports | Format-Table -AutoSize
} else {
    Write-Host "No se encontraron puertos COM físicos" -ForegroundColor Red
}

# Detectar puertos COM en uso
Write-Host "`nDetectando puertos COM en uso..." -ForegroundColor Yellow
$comPorts = [System.IO.Ports.SerialPort]::getPortNames()
if ($comPorts.Length -gt 0) {
    Write-Host "Puertos COM detectados por .NET:" -ForegroundColor Green
    foreach ($port in $comPorts) {
        try {
            $serialPort = New-Object System.IO.Ports.SerialPort $port
            $serialPort.Open()
            $serialPort.Close()
            Write-Host "  $port - DISPONIBLE" -ForegroundColor Green
        } catch {
            Write-Host "  $port - EN USO O BLOQUEADO" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No se detectaron puertos COM" -ForegroundColor Red
}

Write-Host "`n=== Recomendaciones ===" -ForegroundColor Cyan
Write-Host "1. Cierra el Arduino IDE si está abierto"
Write-Host "2. Desconecta y vuelve a conectar el Arduino"
Write-Host "3. Verifica el puerto en el Administrador de dispositivos"
Write-Host "4. Usa el puerto que aparezca como 'DISPONIBLE' en el archivo .env"
