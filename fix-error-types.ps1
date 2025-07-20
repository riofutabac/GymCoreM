#!/usr/bin/env pwsh

# Script to fix TypeScript 'unknown' error type issues in catch blocks

$files = @(
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\api-gateway\src\app.controller.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\gym-management-service\src\app.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\gym-management-service\src\membership.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\gym-management-service\src\app_service_clean.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\gym-management-service\src\main.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\gym-management-service\src\members\members.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\gym-management-service\src\gym-events.controller.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\auth-service\src\app.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\auth-service\src\resync-users.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\payment-service\src\app.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\payment-service\src\rabbit-bindings.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\payment-service\src\main.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\notification-service\src\app.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\notification-service\src\app.controller.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\inventory-service\src\products\products.controller.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\inventory-service\src\listeners\sale-completed.listener.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\inventory-service\src\app.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\biometric-service\src\serial\serial.service.ts",
    "c:\Users\bejar\Documents\GymCoreM\backend\apps\analytics-service\src\analytics.service.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing file: $file"
        $content = Get-Content $file -Raw
        $content = $content -replace '\} catch \(error\) \{', '} catch (error: any) {'
        $content = $content -replace '\} catch \(err\) \{', '} catch (err: any) {'
        $content = $content -replace '\} catch \(e\) \{', '} catch (e: any) {'
        $content = $content -replace 'catch \(error\) \{', 'catch (error: any) {'
        $content = $content -replace 'catch \(err\) \{', 'catch (err: any) {'
        $content = $content -replace 'catch \(e\) \{', 'catch (e: any) {'
        Set-Content $file $content -NoNewline
        Write-Host "Fixed: $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "All catch blocks have been updated to use 'any' type for error parameters"
