#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

gnome-terminal --title="Kontrol — Backend" -- bash -c "cd '$ROOT/backend' && npm run dev; exec bash"
gnome-terminal --title="Kontrol — Frontend" -- bash -c "cd '$ROOT/frontend' && npm run dev; exec bash"
