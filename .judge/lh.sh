cd /home/user/prueba
for i in 1 2; do
for p in "home|/es" "search|/es/search?type=SALE" "listing|/es/listing/los-palos-grandes-3h-118m-l5u136" "luxury|/es/luxury"; do
 n=${p%%|*}; u=${p#*|}
 CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx lighthouse "http://localhost:3001$u" --quiet --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=/tmp/claude-0/judge-$n-$i.json
done; done
echo DONE
