#!/usr/bin/env python3
import os
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

# — Configuración —
ROOT = Path(__file__).parent.resolve()
ZIP_NAME = ROOT / "env_only_bundle.zip"

def gather_env_files():
    """
    Recorre todo el repositorio buscando archivos exactamente llamados '.env'.
    Devuelve tupla (ruta absoluta, ruta relativa al ROOT).
    """
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # excluir node_modules, dist, .git, etc. opcionalmente
        if any(ex in dirpath for ex in ("node_modules", ".git", "dist", "build")):
            continue
        for fname in filenames:
            if fname == ".env":
                abs_path = Path(dirpath) / fname
                rel_path = abs_path.relative_to(ROOT)
                yield abs_path, rel_path

def make_zip():
    # Eliminar ZIP viejo si existe
    if ZIP_NAME.exists():
        ZIP_NAME.unlink()
    # Crear nuevo ZIP
    with ZipFile(ZIP_NAME, mode="w", compression=ZIP_DEFLATED) as zf:
        for src, rel in gather_env_files():
            print(f"Añadiendo {rel}")
            zf.write(src, rel)
    print(f"\n✅ Bundle creado en: {ZIP_NAME}")

if __name__ == "__main__":
    make_zip()
