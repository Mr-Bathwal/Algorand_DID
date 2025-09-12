"""
Common utilities and helper functions for the Decentralized Credential Platform
"""

from pyteal import *

def validate_address(address):
    """Validate if an address is a valid Algorand address"""
    return Len(address) == Int(32)

def validate_string_length(string_value, min_length, max_length):
    """Validate string length within bounds"""
    return And(
        Len(string_value) >= Int(min_length),
        Len(string_value) <= Int(max_length)
    )

def validate_positive_int(value):
    """Validate that a value is a positive integer"""
    return value > Int(0)

def validate_timestamp(timestamp):
    """Validate that timestamp is not in the past"""
    return timestamp >= Global.latest_timestamp()

def calculate_weighted_score(base_score, multiplier, max_score):
    """Calculate weighted score with bounds checking"""
    weighted = base_score * multiplier / Int(100)
    return If(
        weighted > max_score,
        max_score,
        weighted
    )

def get_current_timestamp():
    """Get current blockchain timestamp"""
    return Global.latest_timestamp()

def create_hash(data):
    """Create SHA256 hash of data"""
    return Sha256(data)

def verify_signature(public_key, signature, message):
    """Verify Ed25519 signature"""
    return Ed25519Verify(message, signature, public_key)

def transfer_algo(receiver, amount):
    """Transfer ALGO to receiver"""
    return InnerTxnBuilder.Begin() + \
           InnerTxnBuilder.SetFields({
               TxnField.type_enum: TxnType.Payment,
               TxnField.receiver: receiver,
               TxnField.amount: amount,
           }) + \
           InnerTxnBuilder.Submit()

def create_asset_transfer(asset_id, receiver, amount):
    """Transfer asset to receiver"""
    return InnerTxnBuilder.Begin() + \
           InnerTxnBuilder.SetFields({
               TxnField.type_enum: TxnType.AssetTransfer,
               TxnField.xfer_asset: asset_id,
               TxnField.asset_receiver: receiver,
               TxnField.asset_amount: amount,
           }) + \
           InnerTxnBuilder.Submit()

def validate_box_key(key):
    """Validate box key format"""
    return And(
        Len(key) > Int(0),
        Len(key) <= Int(64)
    )

def encode_user_id(address):
    """Encode user address as box key"""
    return Concat(Bytes("user_"), address)

def encode_org_id(org_address):
    """Encode organization address as box key"""
    return Concat(Bytes("org_"), org_address)

def encode_cert_id(cert_id):
    """Encode certificate ID as box key"""
    return Concat(Bytes("cert_"), Itob(cert_id))

def encode_badge_id(badge_id):
    """Encode badge ID as box key"""
    return Concat(Bytes("badge_"), Itob(badge_id))

def encode_proposal_id(proposal_id):
    """Encode proposal ID as box key"""
    return Concat(Bytes("prop_"), Itob(proposal_id))

def encode_dispute_id(dispute_id):
    """Encode dispute ID as box key"""
    return Concat(Bytes("dispute_"), Itob(dispute_id))

def validate_trust_score(score):
    """Validate trust score is within valid range"""
    return And(
        score >= Int(0),
        score <= Int(100)
    )

def calculate_trust_decay(original_score, time_elapsed, decay_rate):
    """Calculate trust score decay over time"""
    decay_factor = time_elapsed * decay_rate / Int(86400)  # Daily decay
    decayed_score = original_score - decay_factor
    return If(
        decayed_score < Int(0),
        Int(0),
        decayed_score
    )

def validate_verification_level(level):
    """Validate verification level"""
    return And(
        level >= Int(1),
        level <= Int(3)
    )

def check_minimum_stake(amount, minimum):
    """Check if staked amount meets minimum requirement"""
    return amount >= minimum

def calculate_voting_power(trust_score, stake_amount, base_power):
    """Calculate voting power based on trust score and stake"""
    trust_multiplier = trust_score / Int(10)  # 10% per trust score point
    stake_multiplier = stake_amount / Int(1000000)  # 1 per ALGO
    return base_power + trust_multiplier + stake_multiplier

def validate_timelock(unlock_time):
    """Validate that timelock has expired"""
    return Global.latest_timestamp() >= unlock_time

def create_merkle_proof_verification(leaf, proof, root):
    """Verify merkle proof (simplified version)"""
    # This is a simplified version - in production, implement full merkle tree verification
    return Sha256(Concat(leaf, proof)) == root

# ----------------------
# Box helpers and bit utils
# ----------------------

def box_exists(key):
    """Return 1 if box with key exists, else 0."""
    length_maybe = BoxLen(key)
    return length_maybe.hasValue()

@Subroutine(TealType.uint64)
def count_set_bits_6(value):
    """Count set bits for the lowest 6 bits of an integer value."""
    b0 = If(BitwiseAnd(value, Int(1)) > Int(0), Int(1), Int(0))
    b1 = If(BitwiseAnd(value, Int(2)) > Int(0), Int(1), Int(0))
    b2 = If(BitwiseAnd(value, Int(4)) > Int(0), Int(1), Int(0))
    b3 = If(BitwiseAnd(value, Int(8)) > Int(0), Int(1), Int(0))
    b4 = If(BitwiseAnd(value, Int(16)) > Int(0), Int(1), Int(0))
    b5 = If(BitwiseAnd(value, Int(32)) > Int(0), Int(1), Int(0))
    return b0 + b1 + b2 + b3 + b4 + b5