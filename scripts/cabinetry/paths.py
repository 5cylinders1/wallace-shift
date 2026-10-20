"""Shared locations for the Tambour (cabinetry demo) image pipeline.

Sources and working files live in the ignored output/cabinetry folder;
finished web assets are written to public/demos/cabinetry. Set
CABINETRY_PUBLIC to write somewhere else (for example to compare a rebuild).
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
WORK = os.path.join(ROOT, 'output', 'cabinetry')
PUBLIC = os.environ.get('CABINETRY_PUBLIC', os.path.join(ROOT, 'public', 'demos', 'cabinetry'))

os.makedirs(os.path.join(WORK, 'studio'), exist_ok=True)
os.chdir(WORK)
