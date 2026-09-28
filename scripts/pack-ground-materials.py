#!/usr/bin/env python3
"""Deterministically pack the pinned Poly Haven ground sets for Atlas runtime."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import PIL
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets" / "ground-materials-v1"
SOURCE = ASSET / "source"
RUNTIME = ASSET / "runtime"
SIZE = 512
GENERATOR = "atlas-ground-pbr-pack-1"
PROVIDER = "Poly Haven"
LICENSE = "CC0-1.0"
MATERIALS = {
    "soil": {
        "assetId": "dirt",
        "author": "Charlotte Baglioni",
        "page": "https://polyhaven.com/a/dirt",
        "dimensionsM": [2.0, 2.0],
        "files": {
            "albedo": ("soil-albedo.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dirt/dirt_diff_1k.jpg", "cb37e24797597b1dd1ae3819fa80f076"),
            "normalGL": ("soil-normal-gl.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dirt/dirt_nor_gl_1k.jpg", "362610edf09fd31735958eecec823a84"),
            "roughness": ("soil-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dirt/dirt_rough_1k.jpg", "d936d6760ce0f899b131d30626d52ce9"),
        },
        "outputs": ("soil-albedo-roughness-512.png", "soil-normal-512.png"),
    },
    "rock": {
        "assetId": "rock_ground",
        "author": "Rob Tuytel",
        "page": "https://polyhaven.com/a/rock_ground",
        # Atlas's common anchor period is a multiple of two metres. The source
        # tile is 1.5 m, rescaled by 4/3 to a two-metre world repeat so rebase
        # points and every 4096 m frame wrap retain exactly the same phase.
        "sourceDimensionsM": [1.5, 1.5],
        "runtimeRepeatM": 2.0,
        "files": {
            "albedo": ("rock-albedo.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_ground/rock_ground_diff_1k.jpg", "5e897f7e2bcf857250bf74be878584b2"),
            "normalGL": ("rock-normal-gl.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_ground/rock_ground_nor_gl_1k.jpg", "f0831bc095636c0019e44adbacdc09e7"),
            "roughness": ("rock-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_ground/rock_ground_rough_1k.jpg", "67be099b9edb59d2fcb3377c5fccbf88"),
        },
        "outputs": ("rock-albedo-roughness-512.png", "rock-normal-512.png"),
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sRGB_to_linear(v: np.ndarray) -> np.ndarray:
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)


def linear_to_sRGB(v: np.ndarray) -> np.ndarray:
    v = np.clip(v, 0.0, 1.0)
    return np.where(v <= 0.0031308, v * 12.92, 1.055 * (v ** (1.0 / 2.4)) - 0.055)


def resize_channel(channel: np.ndarray) -> np.ndarray:
    source = Image.fromarray(channel.astype(np.float32))
    return np.asarray(source.resize((SIZE, SIZE), Image.Resampling.LANCZOS), dtype=np.float32)


def read_gray(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        return np.asarray(image.convert("L"), dtype=np.float32) / 255.0


def pack_material(name: str, config: dict) -> dict:
    paths = {role: SOURCE / spec[0] for role, spec in config["files"].items()}
    for role, path in paths.items():
        expected = config["files"][role][2]
        actual = hashlib.md5(path.read_bytes()).hexdigest()
        if actual != expected:
            raise ValueError(f"{path.name}: expected official MD5 {expected}, got {actual}")
        with Image.open(path) as image:
            if image.size != (1024, 1024):
                raise ValueError(f"{path.name}: expected pinned 1024 x 1024 source map, got {image.size}")

    with Image.open(paths["albedo"]) as image:
        albedo = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    albedo_linear = sRGB_to_linear(albedo)
    albedo_small = np.stack([resize_channel(albedo_linear[:, :, c]) for c in range(3)], axis=2)
    albedo_small = np.rint(linear_to_sRGB(albedo_small) * 255.0).astype(np.uint8)
    rough = np.rint(np.clip(resize_channel(read_gray(paths["roughness"])), 0, 1) * 255.0).astype(np.uint8)
    color_rough = np.dstack((albedo_small, rough))
    color_path = RUNTIME / config["outputs"][0]
    Image.fromarray(color_rough).save(color_path, format="PNG", optimize=False, compress_level=9)

    with Image.open(paths["normalGL"]) as image:
        normal = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0 * 2.0 - 1.0
    components = [resize_channel(normal[:, :, c]) for c in range(3)]
    normal_small = np.stack(components, axis=2)
    length = np.linalg.norm(normal_small, axis=2, keepdims=True)
    normal_small = np.divide(normal_small, np.maximum(length, 1e-8), out=np.zeros_like(normal_small), where=length > 1e-8)
    normal_small[:, :, 2] = np.where(length[:, :, 0] > 1e-8, normal_small[:, :, 2], 1.0)
    normal_rgb = np.rint(np.clip(normal_small * 0.5 + 0.5, 0, 1) * 255.0).astype(np.uint8)
    normal_rgba = np.dstack((normal_rgb, np.full((SIZE, SIZE), 255, dtype=np.uint8)))
    normal_path = RUNTIME / config["outputs"][1]
    Image.fromarray(normal_rgba).save(normal_path, format="PNG", optimize=False, compress_level=9)

    inputs = []
    for role, path in paths.items():
        filename, url, md5 = config["files"][role]
        inputs.append({"role": role, "path": f"source/{filename}", "url": url, "md5FromOfficialFilesApi": md5, "sha256": sha256(path), "bytes": path.stat().st_size, "dimensionsPx": [1024, 1024]})
    return {
        "name": name,
        "sourceAsset": config["assetId"],
        "author": config["author"],
        "sourcePage": config["page"],
        "license": LICENSE,
        "physicalSizeM": config.get("dimensionsM", config.get("sourceDimensionsM")),
        "sourceDimensionsM": config.get("sourceDimensionsM"),
        "runtimeRepeatM": config.get("runtimeRepeatM", config.get("dimensionsM", [SIZE, SIZE])[0]),
        "inputs": inputs,
        "outputs": [
            {"role": "sRGB albedo RGB + linear roughness A", "path": f"runtime/{color_path.name}", "sha256": sha256(color_path), "bytes": color_path.stat().st_size, "dimensions": [SIZE, SIZE]},
            {"role": "OpenGL tangent normal RGB", "path": f"runtime/{normal_path.name}", "sha256": sha256(normal_path), "bytes": normal_path.stat().st_size, "dimensions": [SIZE, SIZE]},
        ],
    }


def main() -> None:
    if len(sys.argv) > 2:
        raise SystemExit("usage: python scripts/pack-ground-materials.py [output-directory]")
    out = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else RUNTIME
    out.mkdir(parents=True, exist_ok=True)
    original_runtime = RUNTIME
    globals()["RUNTIME"] = out
    materials = [pack_material(name, config) for name, config in MATERIALS.items()]
    input_files = [file for material in materials for file in material["inputs"]]
    output_files = [file for material in materials for file in material["outputs"]]
    bundle = {
        "schema": "https://iwsdk.local/assetctl/texture-set-bundle/v1",
        "asset": {
            "id": "atlas-ground-pbr-v1",
            "version": "1.0.0",
            "target": "IWSDK universe-atlas desktop-web renderer",
            "sourceUrl": "https://polyhaven.com/",
            "license": {"expression": LICENSE, "attribution": "Poly Haven; source asset authors are recorded in manifest.json", "restrictions": []},
            "parentAssets": ["Dirt (Poly Haven)", "Rock Ground (Poly Haven)"],
        },
        "primaryFile": "runtime/soil-albedo-roughness-512.png",
        "files": [
            {"path": file["path"], "sha256": file["sha256"], "bytes": file["bytes"], "role": file["role"]}
            for file in input_files + output_files
        ],
        "transformations": [
            {"operation": "verify-source", "method": "MD5 check against the official Poly Haven files API and SHA-256 inventory"},
            {"operation": "resample", "method": "downsample 1K maps to 512px using Lanczos; diffuse is filtered in linear sRGB, normal vectors are decoded, filtered and renormalized"},
            {"operation": "pack", "method": "sRGB diffuse RGB plus linear roughness A; OpenGL tangent-space normal RGB"},
            {"operation": "scale", "method": "set both runtime texture periods to 2m so the existing 4096m local-frame period joins without seams; rock source 1.5m tile is uniformly rescaled by 4/3"},
        ],
        "technical": {
            "schemaVersion": 1,
            "generator": GENERATOR,
            "generatorVersions": {"python": sys.version.split()[0], "pillow": PIL.__version__, "numpy": np.__version__},
            "textureSize": [SIZE, SIZE],
            "sets": len(materials),
            "runtimeTextureCount": 4,
            "estimatedGpuBytesWithFullMipChains": (4 * SIZE * SIZE * 4 * 4 + 2) // 3,
            "materials": materials,
        },
        "qa": {
            "briefValidated": True,
            "sourceHashesValidated": True,
            "technical": ["512 x 512", "RGBA8 albedo-roughness and OpenGL normal maps", "deterministic pack script"],
            "visual": ["PENDING browser comparison on grounded wet/dry terrain"],
            "runtime": ["PENDING tile seam and local-frame rebase acceptance"],
        },
    }
    bundle_path = ASSET / "bundle.json"
    bundle_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
    globals()["RUNTIME"] = original_runtime
    print(json.dumps({"bundle": str(bundle_path), "materials": materials}, indent=2))


if __name__ == "__main__":
    main()
