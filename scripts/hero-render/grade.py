import sys, numpy as np, cv2
src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src).astype(np.float32) / 255.0
im = cv2.resize(im, (2560, 1440), interpolation=cv2.INTER_AREA)  # supersampled anti-aliasing
h, w = im.shape[:2]
b, g, r = cv2.split(im)
# sky: a gentle soft-blue to warm-peach gradient over the upper band (multiply), stronger at the very top
yy = np.linspace(0, 1, h)[:, None]
sky = np.clip(1 - yy / 0.2, 0, 1) ** 1.5
tint = np.dstack([1 - 0.10 * sky * 0 + 0.06 * sky, 1 - 0.02 * sky, 1 - 0.14 * sky])  # BGR: bluer top
im = im * tint
# S-curve contrast
im = np.clip(im, 0, 1)
im = im + 0.16 * (im - 0.5) * (1 - np.abs(2 * im - 1))
# split toning: warm highlights, teal shadows
lum = 0.114 * im[..., 0] + 0.587 * im[..., 1] + 0.299 * im[..., 2]
hi = np.clip((lum - 0.55) / 0.45, 0, 1)[..., None]; lo = np.clip((0.45 - lum) / 0.45, 0, 1)[..., None]
im = im + hi * np.array([-0.02, 0.005, 0.03]) + lo * np.array([0.025, 0.012, -0.015])
# bloom on bright areas (sun, glints, white walls)
br = np.clip((im - 0.82) / 0.18, 0, 1)
bloom = cv2.GaussianBlur(br, (0, 0), 18) * 0.35 + cv2.GaussianBlur(br, (0, 0), 60) * 0.25
im = 1 - (1 - im) * (1 - bloom * np.array([0.85, 0.95, 1.0]))
# soften CG edges very slightly, then a light unsharp for crispness
soft = cv2.GaussianBlur(im, (0, 0), 0.7)
im = cv2.addWeighted(soft, 1.25, cv2.GaussianBlur(soft, (0, 0), 2.0), -0.25, 0)
# vignette
Y, X = np.ogrid[:h, :w]
d = np.sqrt(((X - w / 2) / (w / 2)) ** 2 + ((Y - h / 2) / (h / 2)) ** 2)
im = im * (1 - 0.22 * np.clip(d - 0.55, 0, 1) ** 1.6)[..., None]
# fine film grain
rng = np.random.default_rng(3)
im = im + rng.normal(0, 0.010, im.shape[:2])[..., None]
cv2.imwrite(out, np.clip(im * 255, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
