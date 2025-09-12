"""
Module 1: Organization Registry & Management Smart Contract
Handles registration, verification, and management of educational and professional institutions
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def organization_registry_contract():
    """
    Organization Registry Smart Contract
    Manages organization registration, verification, accreditation, and trust scoring
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_orgs_key = Bytes("total_orgs")
    next_org_id_key = Bytes("next_org_id")
    paused_key = Bytes("paused")
    
    # Local State Keys (per organization)
    org_name_key = Bytes("org_name")
    org_type_key = Bytes("org_type")
    org_status_key = Bytes("org_status")
    org_country_key = Bytes("org_country")
    org_website_key = Bytes("org_website")
    org_trust_score_key = Bytes("org_trust_score")
    org_created_at_key = Bytes("org_created_at")
    org_verified_at_key = Bytes("org_verified_at")
    org_accreditations_key = Bytes("org_accreditations")
    org_certificates_issued_key = Bytes("org_certs_issued")
    org_certificates_revoked_key = Bytes("org_certs_revoked")
    
    # Application Methods
    register_org = Bytes("register_org")
    verify_org = Bytes("verify_org")
    update_org_status = Bytes("update_org_status")
    add_accreditation = Bytes("add_accreditation")
    update_trust_score = Bytes("update_trust_score")
    get_org_info = Bytes("get_org_info")
    search_orgs = Bytes("search_orgs")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.uint64)
    def calculate_initial_trust_score():
        """Calculate initial trust score for new organization"""
        return Int(INITIAL_TRUST_SCORE)
    
    @Subroutine(TealType.uint64)
    def update_org_trust_score_logic(org_address, certificates_issued, certificates_revoked, accreditation_count):
        """Calculate updated trust score based on organization activity"""
        base_score = Int(INITIAL_TRUST_SCORE)
        
        # Positive factors
        cert_bonus = certificates_issued * Int(2)  # 2 points per certificate
        accred_bonus = accreditation_count * Int(10)  # 10 points per accreditation
        
        # Negative factors
        revocation_penalty = certificates_revoked * Int(5)  # -5 points per revocation
        
        # Calculate final score
        final_score = base_score + cert_bonus + accred_bonus - revocation_penalty
        
        return If(
            final_score > Int(MAX_TRUST_SCORE),
            Int(MAX_TRUST_SCORE),
            If(
                final_score < Int(MIN_TRUST_SCORE),
                Int(MIN_TRUST_SCORE),
                final_score
            )
        )
    
    # Register Organization
    org_box_key = ScratchVar(TealType.bytes)
    tmp_key = ScratchVar(TealType.bytes)
    register_organization = Seq([
        # Require not paused
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        Assert(validate_string_length(Txn.application_args[1], 2, 100)),  # org_name
        Assert(validate_string_length(Txn.application_args[2], 2, 50)),   # org_type
        Assert(validate_string_length(Txn.application_args[3], 2, 50)),   # country
        Assert(validate_string_length(Txn.application_args[4], 5, 200)),  # website
        
        # Create organization box
        org_box_key.store(encode_org_id(Txn.sender())),
        Assert(BoxCreate(org_box_key.load(), Int(500))),  # 500 bytes for org data
        
        # Store organization data
        BoxReplace(org_box_key.load(), Int(0), Concat(
            Txn.application_args[1],  # org_name
            Bytes("|"),
            Txn.application_args[2],  # org_type
            Bytes("|"),
            Itob(Int(ORG_STATUS_PENDING)),  # status
            Bytes("|"),
            Txn.application_args[3],  # country
            Bytes("|"),
            Txn.application_args[4],  # website
            Bytes("|"),
            Itob(calculate_initial_trust_score()),  # trust_score
            Bytes("|"),
            Itob(Global.latest_timestamp()),  # created_at
            Bytes("|"),
            Itob(Int(0)),  # verified_at (0 = not verified)
            Bytes("|"),
            Itob(Int(0)),  # accreditations bitmask
            Bytes("|"),
            Itob(Int(0)),  # certificates_issued
            Bytes("|"),
            Itob(Int(0))   # certificates_revoked
        )),
        
        # Update global counters
        App.globalPut(total_orgs_key, App.globalGet(total_orgs_key) + Int(1)),
        App.globalPut(next_org_id_key, App.globalGet(next_org_id_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("ORG_REGISTERED:"),
            Txn.sender(),
            Bytes(":"),
            Txn.application_args[1]
        )),
        
        Return(Int(1))
    ])
    
    # Verify Organization (Admin only)
    # Predefine MaybeValues used in sequence
    # Pre-construct MaybeValue helpers
    verify_len = BoxLen(Bytes(""))  # placeholder; will be replaced per call
    verify_box = BoxGet(Bytes(""))  # placeholder; will be replaced per call
    verify_organization = Seq([
        # Check admin permission
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Validate target organization exists
        tmp_key.store(encode_org_id(Txn.application_args[1])),
        (verify_len := BoxLen(tmp_key.load())),
        verify_len,
        Assert(verify_len.hasValue()),
        
        # Update organization status to active and set verified timestamp
        (verify_box := BoxGet(tmp_key.load())),
        verify_box,
        Assert(verify_box.hasValue()),
        
        # Parse and update organization data
        BoxReplace(tmp_key.load(), Int(0), Concat(
            BoxExtract(tmp_key.load(), Int(0), Int(100)),  # Keep existing data
            Itob(Int(ORG_STATUS_ACTIVE)),  # Update status
            BoxExtract(tmp_key.load(), Int(104), Int(396))  # Keep remaining data
        )),
        
        # Set verified timestamp
        BoxReplace(tmp_key.load(), Int(150), Itob(Global.latest_timestamp())),
        
        # Log event
        Log(Concat(
            Bytes("ORG_VERIFIED:"),
            Txn.application_args[1]
        )),
        
        Return(Int(1))
    ])
    
    # Add Accreditation (Admin only)
    add_org_accreditation = Seq([
        # Check admin permission
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Validate inputs
        Assert(And(Btoi(Txn.application_args[2]) >= Int(1), Btoi(Txn.application_args[2]) <= Int(6))),
        
        # Get organization data
        tmp_key.store(encode_org_id(Txn.application_args[1])),
        (verify_len := BoxLen(tmp_key.load())),
        verify_len,
        Assert(verify_len.hasValue()),
        
        # Update accreditations bitmask
        (current_accreditations := Btoi(BoxExtract(tmp_key.load(), Int(200), Int(8)))),
        (new_accreditations := BitwiseOr(current_accreditations, Exp(Int(2), Btoi(Txn.application_args[2]) - Int(1)))),
        BoxReplace(tmp_key.load(), Int(200), Itob(new_accreditations)),
        
        # Recalculate trust score
        (cert_issued := Btoi(BoxExtract(tmp_key.load(), Int(216), Int(8)))),
        (cert_revoked := Btoi(BoxExtract(tmp_key.load(), Int(224), Int(8)))),
        (accred_count := count_set_bits_6(new_accreditations)),
        BoxReplace(
            tmp_key.load(),
            Int(120),
            Itob(update_org_trust_score_logic(Txn.application_args[1], cert_issued, cert_revoked, accred_count))
        ),
        
        # Log event
        Log(Concat(
            Bytes("ACCREDITATION_ADDED:"),
            Txn.application_args[1],
            Bytes(":"),
            Itob(Btoi(Txn.application_args[2]))
        )),
        
        Return(Int(1))
    ])
    
    # Update Organization Status (Admin only)
    update_organization_status = Seq([
        # Check admin permission
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Validate inputs
        Assert(And(Btoi(Txn.application_args[2]) >= Int(0), Btoi(Txn.application_args[2]) <= Int(3))),
        
        # Update organization status
        tmp_key.store(encode_org_id(Txn.application_args[1])),
        (verify_len := BoxLen(tmp_key.load())),
        verify_len,
        Assert(verify_len.hasValue()),
        BoxReplace(tmp_key.load(), Int(104), Itob(Btoi(Txn.application_args[2]))),
        
        # Log event
        Log(Concat(
            Bytes("ORG_STATUS_UPDATED:"),
            Txn.application_args[1],
            Bytes(":"),
            Itob(new_status)
        )),
        
        Return(Int(1))
    ])
    
    # Get Organization Information
    get_organization_info = Seq([
        tmp_key.store(encode_org_id(Txn.application_args[1])),
        (org_len := BoxLen(tmp_key.load())),
        org_len,
        Assert(org_len.hasValue()),
        
        # Return organization data
        (org_data := BoxGet(tmp_key.load())),
        org_data,
        Log(Concat(Bytes("ORG_INFO:"), org_data.value())),
        Return(Int(1))
    ])

    # Admin Rotation
    set_admin_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        # Txn.application_args[1] -> new admin address (bytes)
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

    # Version
    version_fn = Seq([
        Log(Concat(Bytes("VERSION:"), Bytes(PLATFORM_VERSION))),
        Return(Int(1))
    ])
    
    # Main contract logic
    program = Cond(
        [Txn.application_id() == Int(0), Seq([
            # Initialize contract
            App.globalPut(admin_key, Txn.sender()),
            App.globalPut(total_orgs_key, Int(0)),
            App.globalPut(next_org_id_key, Int(1)),
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == register_org, register_organization],
        [Txn.application_args[0] == verify_org, verify_organization],
        [Txn.application_args[0] == update_org_status, update_organization_status],
        [Txn.application_args[0] == add_accreditation, add_org_accreditation],
        [Txn.application_args[0] == get_org_info, get_organization_info],

        # Admin/utility
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def organization_registry_clear_program():
    """Clear state program for organization registry"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(organization_registry_contract(), Mode.Application, version=8)
    clear_program = compileTeal(organization_registry_clear_program(), Mode.Application, version=8)
    
    print("Organization Registry Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")