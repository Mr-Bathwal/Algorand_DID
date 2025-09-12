import os
import json
import base64
import algosdk
from algosdk import transaction
from algosdk.v2client import algod
from dotenv import load_dotenv
from algosdk.encoding import decode_address


def load_addresses():
    with open(os.path.join(os.path.dirname(__file__), '..', 'deployment', 'contract_addresses.json'), 'r') as f:
        return json.load(f)["contracts"]


def get_client():
    return algod.AlgodClient(os.getenv('ALGOD_TOKEN', ''), os.getenv('ALGOD_ADDRESS', 'https://testnet-api.algonode.cloud'))


def get_account():
    # Load .env if present
    load_dotenv()
    m = os.getenv('DEPLOYER_MNEMONIC', '').strip()
    assert m and len(m.split()) == 25, 'Set DEPLOYER_MNEMONIC (25 words) to run tests'
    sk = algosdk.mnemonic.to_private_key(m)
    addr = algosdk.account.address_from_private_key(sk)
    return addr, sk


def build_noop(algod_client, sender, app_id, app_args):
    sp = algod_client.suggested_params()
    txn = transaction.ApplicationNoOpTxn(sender=sender, sp=sp, index=app_id, app_args=app_args)
    return txn


def to_bytes(s):
    return s.encode()


def box_exists(client, app_id, name_bytes: bytes) -> bool:
    try:
        client.application_box_by_name(app_id, name_bytes)
        return True
    except Exception:
        return False


def send_and_wait(client, sk, txn, rounds=2):
    stx = txn.sign(sk)
    txid = client.send_transaction(stx)
    return transaction.wait_for_confirmation(client, txid, rounds)


def test_all_version_endpoints_fast():
    """Fast test: Check version endpoint on all contracts"""
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    contract_names = [
        'organization_registry', 'user_identity', 'certificate_management',
        'badge_system', 'governance', 'trust_score', 'smart_wallet', 'dispute_resolution'
    ]

    for name in contract_names:
        if name in contracts:
            txn = build_noop(algod_client, sender, contracts[name]['app_id'], [to_bytes('version')])
            res = send_and_wait(algod_client, sk, txn, 2)  # Faster timeout
            assert 'confirmed-round' in res
            print(f"✓ {name} version check passed")


def test_core_functionality_fast():
    """Fast test: Core user registration and organization creation"""
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    # Register user (fast check)
    txn = build_noop(
        algod_client,
        sender,
        contracts['user_identity']['app_id'],
        [to_bytes('register_user'), to_bytes('test@example.com'), to_bytes('+15555550123')]
    )
    res = send_and_wait(algod_client, sk, txn, 2)
    assert 'confirmed-round' in res
    print("✓ User registration passed")

    # Create organization (fast check)
    txn2 = build_noop(
        algod_client,
        sender,
        contracts['organization_registry']['app_id'],
        [to_bytes('register_org'), to_bytes('TestOrg'), to_bytes('Test Description'), to_bytes('test@org.com')]
    )
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2
    print("✓ Organization registration passed")


def test_admin_pause_functionality():
    """Test admin and pause functionality on one contract"""
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    # Test pause on organization registry
    txn = build_noop(
        algod_client,
        sender,
        contracts['organization_registry']['app_id'],
        [to_bytes('pause')]
    )
    res = send_and_wait(algod_client, sk, txn, 2)
    assert 'confirmed-round' in res
    print("✓ Contract pause passed")

    # Test unpause
    txn2 = build_noop(
        algod_client,
        sender,
        contracts['organization_registry']['app_id'],
        [to_bytes('unpause')]
    )
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2
    print("✓ Contract unpause passed")


def test_user_identity_aadhaar_and_profile():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    uid = contracts['user_identity']['app_id']
    sender_bytes = decode_address(sender)

    # Ensure authorized verifier id 0 exists (admin-only, idempotent)
    txn = build_noop(algod_client, sender, uid, [to_bytes('add_verifier'), (0).to_bytes(8, 'big')])
    send_and_wait(algod_client, sk, txn, 2)

    # Add government ID verification (type=3), verifier_id=0, with sample Aadhaar hash
    aadhaar_hash = to_bytes('aadhaar:1234-5678-9012')
    args = [
        to_bytes('add_verification'),
        sender_bytes,
        (3).to_bytes(8, 'big'),        # verification_type: government id
        (0).to_bytes(8, 'big'),        # verifier_id
        aadhaar_hash
    ]
    txn2 = build_noop(algod_client, sender, uid, args)
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2

    # Read profile
    txn3 = build_noop(algod_client, sender, uid, [to_bytes('get_user_profile'), sender_bytes])
    res3 = send_and_wait(algod_client, sk, txn3, 2)
    assert 'confirmed-round' in res3
    print('✓ Aadhaar verification and profile retrieval passed')


def test_certificate_issue_and_fetch():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    cid = contracts['certificate_management']['app_id']
    recipient = decode_address(sender)
    args = [
        to_bytes('issue_cert'),
        recipient,
        to_bytes('Course'),
        to_bytes('Intro to Blockchain'),
        to_bytes('Syllabus...'),
        to_bytes('A+'),
        (0).to_bytes(8, 'big'),  # issue_date <= now
        (0).to_bytes(8, 'big'),  # no expiry
    ]
    txn = build_noop(algod_client, sender, cid, args)
    res = send_and_wait(algod_client, sk, txn, 2)
    assert 'confirmed-round' in res

    # Fetch certificate id 1 quickly (first issuance) – safe even if later ids exist
    txn2 = build_noop(algod_client, sender, cid, [to_bytes('get_cert'), (1).to_bytes(8, 'big')])
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2
    print('✓ Certificate issue and fetch passed')


def test_badge_template_and_issue():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    bid = contracts['badge_system']['app_id']

    # Create template id 0 if not exists
    template_box_name = b'template_' + (0).to_bytes(8, 'big')
    if not box_exists(algod_client, bid, template_box_name):
        args = [
            to_bytes('create_template'),
            to_bytes('Starter Badge'),
            (1).to_bytes(8, 'big'),  # badge_type
            to_bytes('Awarded for joining'),
            to_bytes('Sign up and verify email'),
            to_bytes('https://img/icon.png'),
        ]
        txn = build_noop(algod_client, sender, bid, args)
        send_and_wait(algod_client, sk, txn, 2)

    # Issue a badge from template 0
    recipient = decode_address(sender)
    args2 = [
        to_bytes('issue_badge'),
        recipient,
        (0).to_bytes(8, 'big'),
        to_bytes('evidence link'),
        to_bytes('{"lvl":1}')
    ]
    txn2 = build_noop(algod_client, sender, bid, args2)
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2
    print('✓ Badge template and issuance passed')


def test_trust_score_initialize_and_update():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    tid = contracts['trust_score']['app_id']
    sender_bytes = decode_address(sender)

    # Initialize trust score if missing
    score_box_name = b'score_' + sender_bytes
    if not box_exists(algod_client, tid, score_box_name):
        txn = build_noop(algod_client, sender, tid, [to_bytes('init_score'), sender_bytes])
        send_and_wait(algod_client, sk, txn, 2)

    # Update trust score with small values
    args = [
        to_bytes('update_score'),
        sender_bytes,
        (1).to_bytes(8, 'big'),   # verification_level
        (2).to_bytes(8, 'big'),   # verifications_count
        (1).to_bytes(8, 'big'),   # total_certs
        (1).to_bytes(8, 'big'),   # high_trust_certs
        (50).to_bytes(8, 'big'),  # avg_org_trust
        (1).to_bytes(8, 'big'),   # badges
        (0).to_bytes(8, 'big'),   # endorsements
    ]
    txn2 = build_noop(algod_client, sender, tid, args)
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2
    print('✓ Trust score init/update passed')


def test_governance_create_and_vote():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    gid = contracts['governance']['app_id']
    # Create proposal
    args = [
        to_bytes('create_proposal'),
        (1).to_bytes(8, 'big'),
        to_bytes('Upgrade Params'),
        to_bytes('Adjust quorum and voting period to optimize throughput.'),
        to_bytes('noop'),
        (0).to_bytes(8, 'big'),
    ]
    txn = build_noop(algod_client, sender, gid, args)
    send_and_wait(algod_client, sk, txn, 2)

    # Vote on proposal 1 (first proposal)
    args2 = [
        to_bytes('vote_proposal'),
        (1).to_bytes(8, 'big'),
        (1).to_bytes(8, 'big'),  # vote FOR
        (80).to_bytes(8, 'big'), # trust score
        (0).to_bytes(8, 'big'),  # stake
    ]
    txn2 = build_noop(algod_client, sender, gid, args2)
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2
    print('✓ Governance create/vote passed')


def test_smart_wallet_create_and_update_limit():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    wid = contracts['smart_wallet']['app_id']
    sender_bytes = decode_address(sender)

    # Create wallet if missing
    wallet_box_name = b'wallet_' + sender_bytes
    if not box_exists(algod_client, wid, wallet_box_name):
        args = [
            to_bytes('create_wallet'),
            (1).to_bytes(8, 'big'),   # guardians
            (1).to_bytes(8, 'big'),   # threshold
            (200000).to_bytes(8, 'big'),  # daily limit (microAlgos)
        ]
        txn = build_noop(algod_client, sender, wid, args)
        send_and_wait(algod_client, sk, txn, 2)

    # Update daily limit
    args2 = [
        to_bytes('set_daily_limit'),
        (300000).to_bytes(8, 'big'),
    ]
    txn2 = build_noop(algod_client, sender, wid, args2)
    res2 = send_and_wait(algod_client, sk, txn2, 2)
    assert 'confirmed-round' in res2

    # Fetch wallet info
    txn3 = build_noop(algod_client, sender, wid, [to_bytes('get_wallet_info'), sender_bytes])
    res3 = send_and_wait(algod_client, sk, txn3, 2)
    assert 'confirmed-round' in res3
    print('✓ Smart wallet create/update/get passed')


def test_dispute_version_only_fast():
    contracts = load_addresses()
    algod_client = get_client()
    sender, sk = get_account()

    did = contracts['dispute_resolution']['app_id']
    txn = build_noop(algod_client, sender, did, [to_bytes('version')])
    res = send_and_wait(algod_client, sk, txn, 2)
    assert 'confirmed-round' in res
    print('✓ Dispute module version endpoint passed')

