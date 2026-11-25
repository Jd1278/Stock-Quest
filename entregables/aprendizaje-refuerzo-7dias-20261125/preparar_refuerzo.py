"""Entrada V2: conservar el contrato 100000 x 15 con 10% atipicos y 10% suciedad."""
from pathlib import Path
import runpy, os
target=Path(__file__).resolve().parent/'ajustar_calidad.py'
if os.name=='nt' and not str(target).startswith('\\\\?\\'):target=Path('\\\\?\\'+str(target))
runpy.run_path(str(target),run_name='__main__')
