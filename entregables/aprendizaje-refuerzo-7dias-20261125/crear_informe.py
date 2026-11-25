"""Genera el informe vigente V2."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parent/"informe_v2.py"),run_name="__main__")
