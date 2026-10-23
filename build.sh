#!/bin/sh
# Baut die einzelne HTML-Datei (für claude.ai) und die installierbare Web-App in docs/.
cd "$(dirname "$0")"
python3 -c "
t=open('src/index.template.html').read(); c=open('src/steuer2025.js').read()
open('rentensteuer-2025.html','w').write(t.replace('/*CORE*/', c))
"
python3 build_pwa.py
