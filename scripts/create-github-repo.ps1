$output = "protocol=https`nhost=github.com" | git credential fill
$token = ""
foreach ($line in $output) {
    if ($line -match "^password=(.*)") {
        $token = $matches[1]
    }
}

if (-not $token) {
    Write-Host "Failed to extract token from Git Credential Manager."
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github.v3+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$body = @{
    name = "crawlee-social-actor"
    private = $false
    description = "Playwright/Cheerio web scraper for Social Media extraction running on Apify."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    Write-Host "Repository created at: $($response.html_url)"
    
    # Configure local git
    git branch -M main
    git remote add origin $response.clone_url
    git push -u origin main
    
    Write-Host "Successfully pushed code to GitHub."
} catch {
    Write-Error $_
}
