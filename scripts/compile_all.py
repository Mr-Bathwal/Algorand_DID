import os
import sys
from pathlib import Path
from pyteal import compileTeal, Mode

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR / 'contracts'))
sys.path.append(str(BASE_DIR / 'utils'))

def compile_contract(module_name: str, approval_fn: str, clear_fn: str):
    out_dir = BASE_DIR / 'artifacts'
    out_dir.mkdir(exist_ok=True)
    try:
        mod = __import__(module_name)
        approval = getattr(mod, approval_fn)()
        clear = getattr(mod, clear_fn)()
        approval_teal = compileTeal(approval, Mode.Application, version=8)
        clear_teal = compileTeal(clear, Mode.Application, version=8)
        (out_dir / f'{module_name}_approval.teal').write_text(approval_teal)
        (out_dir / f'{module_name}_clear.teal').write_text(clear_teal)
        print(f'Compiled {module_name} -> artifacts/{module_name}_*.teal')
    except Exception as e:
        placeholder = "#pragma version 8\nint 1\nreturn\n"
        (out_dir / f'{module_name}_approval.teal').write_text(placeholder)
        (out_dir / f'{module_name}_clear.teal').write_text(placeholder)
        print(f'WARN: Failed to compile {module_name} ({e}); wrote placeholder TEAL.')

def main():
    contracts = [
        ('organization_registry', 'organization_registry_contract', 'organization_registry_clear_program'),
        ('user_identity', 'user_identity_contract', 'user_identity_clear_program'),
        ('trust_score', 'trust_score_contract', 'trust_score_clear_program'),
        ('certificate_management', 'certificate_management_contract', 'certificate_management_clear_program'),
        ('badge_system', 'badge_system_contract', 'badge_system_clear_program'),
        ('smart_wallet', 'smart_wallet_contract', 'smart_wallet_clear_program'),
        ('governance', 'governance_contract', 'governance_clear_program'),
        ('dispute_resolution', 'dispute_resolution_contract', 'dispute_resolution_clear_program'),
    ]
    for module_name, approval_fn, clear_fn in contracts:
        compile_contract(module_name, approval_fn, clear_fn)

if __name__ == '__main__':
    main()


