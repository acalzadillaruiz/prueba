# Portada · render 3D propio (030 · estilo AMALI)

`apps/web/public/brand/hero-costa.jpg` es un render propio (no una foto ni una imagen de referencia): costa caribeña al
atardecer, villa moderna blanca con piscina, muelle y yate, hecho con three.js en Chromium y retocado con OpenCV.

1. `ln -s ../../node_modules/three three` (en esta carpeta)
2. `node shot.mjs huge.png 5120 2880 "cx=0&cy=78&cz=160&tx=-75&tz=-60&sx=-0.5&sy=0.035&sz=-0.86&fov=42"`
   (Chromium con SwiftShader; usa `PLAYWRIGHT_BROWSERS_PATH` o ajusta `executablePath`)
3. `python3 grade.py huge.png ../../apps/web/public/brand/hero-costa.jpg` (supermuestreo a 2560×1440, contraste,
   tono cálido, bloom, viñeta y grano; requiere `opencv-python-headless` y `numpy`)

Parámetros de la URL: cámara `cx/cy/cz` (desde la villa), objetivo `tx/ty/tz`, `fov`, sol en el cielo `sx/sy/sz`,
escala de la villa `vs`, niebla `fog`.
