# Baut die installierbare Web-App (PWA) in den Ordner docs/.
import hashlib, json, os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
t = open('src/index.template.html').read()
core = open('src/steuer2025.js').read()
t = t.replace('/*CORE*/', core)
style_end = t.index('</style>') + len('</style>')
kopf, rumpf = t[:style_end], t[style_end:]
# Artifact-spezifische Kopfzeilen entfernen; title und theme-color kommen unten neu.
kopf = re.sub(r'<title>.*?</title>\n?|<meta name="(claude:viewport-fit-sides|theme-color)"[^>]*>\n?', '', kopf)
# Schrift liegt in der App selbst (offline nutzbar, keine Verbindung zu Google).
kopf = re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts\.[^"]*"[^>]*>\n?', '', kopf)
kopf = kopf.replace('<style>', '<style>\n' + open('src/fonts.css').read(), 1)
seite = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Rentensteuer 2025</title>
<meta name="description" content="Einkommensteuer für Rentnerinnen und Rentner 2025 Schritt für Schritt berechnen. Alle Eingaben bleiben auf diesem Gerät.">
<meta name="theme-color" content="#2a2f33">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Rentensteuer">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{kopf.strip()}
</head>
<body>
{rumpf.strip()}
<script>
if ('serviceWorker' in navigator) {{
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {{}}));
}}
</script>
</body>
</html>
'''
open('docs/index.html', 'w').write(seite)

manifest = {
  "name": "Rentensteuer 2025",
  "short_name": "Rentensteuer",
  "description": "Einkommensteuer für Rentnerinnen und Rentner 2025 Schritt für Schritt berechnen.",
  "lang": "de",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f3f4f1",
  "theme_color": "#2a2f33",
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
open('docs/manifest.webmanifest', 'w').write(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

# Versionsnummer aus dem Inhalt: jede Änderung lädt beim nächsten Start neu.
dateien = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
           'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
           'fonts/manrope-latin.woff2', 'fonts/manrope-latin-ext.woff2']
h = hashlib.sha256()
for d in dateien[1:]:
    h.update(open('docs/' + d, 'rb').read())
version = h.hexdigest()[:10]
sw = open('src/sw.template.js').read().replace('__VERSION__', version).replace('__DATEIEN__', json.dumps(dateien))
open('docs/sw.js', 'w').write(sw)
print('PWA gebaut, Version', version)
