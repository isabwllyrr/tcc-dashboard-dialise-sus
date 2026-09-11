import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PipelineDataQualityTest(unittest.TestCase):
    def test_outputs_are_consistent(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "validar_dados.py")],
            cwd=ROOT, capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
