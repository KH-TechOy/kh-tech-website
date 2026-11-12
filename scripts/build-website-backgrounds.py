"""Legacy command alias. npm run build/dev now optimize supplied PNGs automatically.

No Pillow dependency or second public/website generation pipeline is needed.
Existing --subpages/--privacy invocations regenerate the single canonical set.
"""
from pathlib import Path
import argparse
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--subpages', action='store_true')
parser.add_argument('--privacy', action='store_true')
parser.parse_args()
subprocess.run(['node', str(Path(__file__).with_suffix('.mjs'))], check=True)
