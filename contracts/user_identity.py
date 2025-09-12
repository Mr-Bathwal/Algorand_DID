"""
Module 2: Advanced User Identity & Verification Portal Smart Contract
Comprehensive identity verification system supporting multiple verification methods
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def user_identity_contract():
    """
    User Identity Smart Contract
    Manages user registration, multi-modal verification, and identity management
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_users_key = Bytes("total_users")
    verifier_registry_key = Bytes("verifier_registry")
    paused_key = Bytes("paused")
    
    # Verification Methods
    verify_email = Bytes("verify_email")
    verify_phone = Bytes("verify_phone")
    verify_government_id = Bytes("verify_gov_id")
    verify_biometric = Bytes("verify_biometric")
    verify_financial = Bytes("verify_financial")
    verify_address = Bytes("verify_address")
    
    # Application Methods
    register_user = Bytes("register_user")
    add_verification = Bytes("add_verification")
    get_user_profile = Bytes("get_user_profile")
    update_verification_level = Bytes("update_verification_level")
    add_verifier = Bytes("add_verifier")
    revoke_verification = Bytes("revoke_verification")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.uint64)
    def calculate_verification_level(verifications_bitmask):
        """Calculate user verification level based on completed verifications"""
        email_verified = BitwiseAnd(verifications_bitmask, Int(1))  # Bit 0
        phone_verified = BitwiseAnd(verifications_bitmask, Int(2))  # Bit 1
        gov_id_verified = BitwiseAnd(verifications_bitmask, Int(4)) # Bit 2
        biometric_verified = BitwiseAnd(verifications_bitmask, Int(8)) # Bit 3
        financial_verified = BitwiseAnd(verifications_bitmask, Int(16)) # Bit 4
        address_verified = BitwiseAnd(verifications_bitmask, Int(32)) # Bit 5
        
        return If(
            And(biometric_verified, financial_verified),
            Int(VERIFICATION_ADVANCED),
            If(
                gov_id_verified,
                Int(VERIFICATION_INTERMEDIATE),
                If(
                    And(email_verified, phone_verified),
                    Int(VERIFICATION_BASIC),
                    Int(0)  # No verification
                )
            )
        )
    
    @Subroutine(TealType.uint64)
    def calculate_identity_trust_score(verification_level, verifications_count, time_since_creation):
        """Calculate trust score based on verification completeness and account age"""
        base_score = Int(30)  # Base score for registered users
        
        # Verification level bonus
        level_bonus = verification_level * Int(15)  # 15 points per level
        
        # Individual verification bonus
        verification_bonus = verifications_count * Int(5)  # 5 points per verification
        
        # Account age bonus (1 point per day, max 20 points)
        age_bonus = If(
            time_since_creation / Int(86400) > Int(20),
            Int(20),
            time_since_creation / Int(86400)
        )
        
        total_score = base_score + level_bonus + verification_bonus + age_bonus
        
        return If(
            total_score > Int(MAX_TRUST_SCORE),
            Int(MAX_TRUST_SCORE),
            total_score
        )
    
    # Register User
    register_new_user = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        Assert(validate_string_length(Txn.application_args[1], 5, 100)),  # email
        Assert(validate_string_length(Txn.application_args[2], 10, 20)),  # phone
        
        # Create user identity box
        (user_box_key := encode_user_id(Txn.sender())),
        Assert(BoxCreate(user_box_key, Int(400))),  # 400 bytes for user data
        
        # Store user identity data
        BoxReplace(user_box_key, Int(0), Concat(
            Txn.application_args[1],  # email
            Bytes("|"),
            Txn.application_args[2],  # phone
            Bytes("|"),
            Itob(Int(0)),  # verifications_bitmask (none verified initially)
            Bytes("|"),
            Itob(Int(0)),  # verification_level
            Bytes("|"),
            Itob(Int(30)), # initial_trust_score
            Bytes("|"),
            Itob(Global.latest_timestamp()),  # created_at
            Bytes("|"),
            Itob(Int(0)),  # last_verification_update
            Bytes("|"),
            Bytes(""),     # government_id_hash (empty initially)
            Bytes("|"),
            Bytes(""),     # biometric_hash (empty initially)
            Bytes("|"),
            Bytes("")      # additional_data (empty initially)
        )),
        
        # Update global counter
        App.globalPut(total_users_key, App.globalGet(total_users_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("USER_REGISTERED:"),
            Txn.sender()
        )),
        
        Return(Int(1))
    ])
    
    # Add Verification (by authorized verifier)
    add_user_verification = Seq([
        # Check if sender is authorized verifier
        (verifier_registry := App.globalGet(verifier_registry_key)),
        Assert(BitwiseAnd(verifier_registry, Exp(Int(2), Btoi(Txn.application_args[3])))),
        
        # Validate inputs
        (target_user := Txn.application_args[1]),
        (verification_type := Btoi(Txn.application_args[2])),
        (verification_data := Txn.application_args[4]),
        
        Assert(And(verification_type >= Int(1), verification_type <= Int(6))),
        
        # Get user data
        (user_box_key := encode_user_id(target_user)),
        (user_box_len := BoxLen(user_box_key)),
        Assert(user_box_len.hasValue()),
        
        # Update verifications bitmask
        (current_verifications := Btoi(BoxExtract(user_box_key, Int(150), Int(8)))),
        (verification_bit := Exp(Int(2), verification_type - Int(1))),
        (new_verifications := BitwiseOr(current_verifications, verification_bit)),
        BoxReplace(user_box_key, Int(150), Itob(new_verifications)),
        
        # Calculate new verification level
        (new_level := calculate_verification_level(new_verifications)),
        BoxReplace(user_box_key, Int(158), Itob(new_level)),
        
        # Update trust score
        (created_at := Btoi(BoxExtract(user_box_key, Int(174), Int(8)))),
        (time_since_creation := Global.latest_timestamp() - created_at),
        (verification_count := count_set_bits_6(new_verifications)),
        (new_trust_score := calculate_identity_trust_score(new_level, verification_count, time_since_creation)),
        BoxReplace(user_box_key, Int(166), Itob(new_trust_score)),
        
        # Update last verification timestamp
        BoxReplace(user_box_key, Int(182), Itob(Global.latest_timestamp())),
        
        # Store verification-specific data
        If(
            verification_type == Int(3),  # Government ID
            BoxReplace(user_box_key, Int(190), create_hash(verification_data)),
            If(
                verification_type == Int(4),  # Biometric
                BoxReplace(user_box_key, Int(222), create_hash(verification_data)),
                Seq([])  # No additional data storage needed
            )
        ),
        
        # Log event
        Log(Concat(
            Bytes("VERIFICATION_ADDED:"),
            target_user,
            Bytes(":"),
            Itob(verification_type),
            Bytes(":"),
            Itob(new_level)
        )),
        
        Return(Int(1))
    ])
    
    # Get User Profile
    get_user_identity_profile = Seq([
        (target_user := Txn.application_args[1]),
        (user_box_key := encode_user_id(target_user)),
        (user_box_len := BoxLen(user_box_key)),
        Assert(user_box_len.hasValue()),
        
        # Return user identity data (excluding sensitive information)
        (user_data := BoxGet(user_box_key)),
        Log(Concat(Bytes("USER_PROFILE:"), user_data.value())),
        Return(Int(1))
    ])

    # Admin rotate
    set_admin_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        App.globalPut(admin_key, Txn.application_args[1]),
        Log(Concat(Bytes("ADMIN_CHANGED:"), Txn.application_args[1])),
        Return(Int(1))
    ])

    # Pause / Unpause
    pause_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        App.globalPut(paused_key, Int(1)),
        Log(Bytes("PAUSED:1")),
        Return(Int(1))
    ])
    unpause_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        App.globalPut(paused_key, Int(0)),
        Log(Bytes("PAUSED:0")),
        Return(Int(1))
    ])

    version_fn = Seq([
        Log(Concat(Bytes("VERSION:"), Bytes(PLATFORM_VERSION))),
        Return(Int(1))
    ])
    
    # Add Authorized Verifier (Admin only)
    add_authorized_verifier = Seq([
        # Check admin permission
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Validate inputs
        (verifier_id := Btoi(Txn.application_args[1])),
        Assert(And(verifier_id >= Int(0), verifier_id < Int(32))),  # Max 32 verifiers
        
        # Update verifier registry
        (current_registry := App.globalGet(verifier_registry_key)),
        (new_registry := BitwiseOr(current_registry, Exp(Int(2), verifier_id))),
        App.globalPut(verifier_registry_key, new_registry),
        
        # Log event
        Log(Concat(
            Bytes("VERIFIER_ADDED:"),
            Itob(verifier_id)
        )),
        
        Return(Int(1))
    ])
    
    # Revoke Verification (Admin only)
    revoke_user_verification = Seq([
        # Check admin permission
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Validate inputs
        (target_user := Txn.application_args[1]),
        (verification_type := Btoi(Txn.application_args[2])),
        Assert(And(verification_type >= Int(1), verification_type <= Int(6))),
        
        # Get user data
        (user_box_key := encode_user_id(target_user)),
        (user_box_len := BoxLen(user_box_key)),
        Assert(user_box_len.hasValue()),
        
        # Remove verification from bitmask
        (current_verifications := Btoi(BoxExtract(user_box_key, Int(150), Int(8)))),
        (verification_bit := Exp(Int(2), verification_type - Int(1))),
        (new_verifications := BitwiseAnd(current_verifications, BitwiseNot(verification_bit))),
        BoxReplace(user_box_key, Int(150), Itob(new_verifications)),
        
        # Recalculate verification level and trust score
        (new_level := calculate_verification_level(new_verifications)),
        BoxReplace(user_box_key, Int(158), Itob(new_level)),
        
        (created_at := Btoi(BoxExtract(user_box_key, Int(174), Int(8)))),
        (time_since_creation := Global.latest_timestamp() - created_at),
        (verification_count := count_set_bits_6(new_verifications)),
        (new_trust_score := calculate_identity_trust_score(new_level, verification_count, time_since_creation)),
        BoxReplace(user_box_key, Int(166), Itob(new_trust_score)),
        
        # Log event
        Log(Concat(
            Bytes("VERIFICATION_REVOKED:"),
            target_user,
            Bytes(":"),
            Itob(verification_type)
        )),
        
        Return(Int(1))
    ])
    
    # Main contract logic
    program = Cond(
        [Txn.application_id() == Int(0), Seq([
            # Initialize contract
            App.globalPut(admin_key, Txn.sender()),
            App.globalPut(total_users_key, Int(0)),
            App.globalPut(verifier_registry_key, Int(0)),
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == register_user, register_new_user],
        [Txn.application_args[0] == add_verification, add_user_verification],
        [Txn.application_args[0] == get_user_profile, get_user_identity_profile],
        [Txn.application_args[0] == add_verifier, add_authorized_verifier],
        [Txn.application_args[0] == revoke_verification, revoke_user_verification],

        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def user_identity_clear_program():
    """Clear state program for user identity"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(user_identity_contract(), Mode.Application, version=8)
    clear_program = compileTeal(user_identity_clear_program(), Mode.Application, version=8)
    
    print("User Identity Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")