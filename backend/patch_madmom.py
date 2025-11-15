"""
Patch madmom for Python 3.10+ and NumPy 1.20+ compatibility.
Run this once after installing madmom to fix all compatibility issues.
"""
import sys
import re
from pathlib import Path

def patch_madmom():
    # Find madmom installation in venv
    venv_base = Path(__file__).parent / ".venv" / "lib"
    madmom_dirs = list(venv_base.glob("**/site-packages/madmom"))
    
    if not madmom_dirs:
        print("❌ Could not find madmom in .venv")
        print("   Make sure madmom is installed: pip install --no-build-isolation madmom")
        sys.exit(1)
    
    madmom_dir = madmom_dirs[0]
    print(f"📦 Found madmom at: {madmom_dir}")
    
    patched_files = []
    
    # Find all Python files in madmom
    py_files = list(madmom_dir.rglob("*.py"))
    
    for py_file in py_files:
        original_content = py_file.read_text(encoding='utf-8')
        content = original_content
        file_patched = False
        
        # Patch 1: collections.MutableSequence
        if "from collections import MutableSequence" in content:
            content = content.replace(
                "from collections import MutableSequence",
                "from collections.abc import MutableSequence"
            )
            file_patched = True
        
        # Patch 2: np.float -> np.float64
        if re.search(r'\bnp\.float\b', content):
            content = re.sub(r'\bnp\.float\b', 'np.float64', content)
            file_patched = True
        
        # Patch 3: np.int -> np.int64
        if re.search(r'\bnp\.int\b', content):
            content = re.sub(r'\bnp\.int\b', 'np.int64', content)
            file_patched = True
        
        # Patch 4: np.bool -> np.bool_
        if re.search(r'\bnp\.bool\b', content):
            content = re.sub(r'\bnp\.bool\b', 'np.bool_', content)
            file_patched = True
        
        if file_patched:
            py_file.write_text(content, encoding='utf-8')
            patched_files.append(py_file.relative_to(madmom_dir))
    
    if patched_files:
        print(f"\n✅ Patched {len(patched_files)} file(s):")
        for f in patched_files[:10]:  # Show first 10
            print(f"   - {f}")
        if len(patched_files) > 10:
            print(f"   ... and {len(patched_files) - 10} more")
        print(f"\n✅ All compatibility issues fixed! Restart uvicorn now.")
    else:
        print("✅ madmom already fully patched!")

if __name__ == "__main__":
    patch_madmom()
