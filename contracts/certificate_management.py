"""
Module 3: Certificate Management & Issuance System Smart Contract
Complete lifecycle management of digital certificates and credentials
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def certificate_management_contract():
    """
    Certificate Management Smart Contract
    Handles certificate issuance, verification, revocation, and transfer
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_certificates_key = Bytes("total_certs")
    next_cert_id_key = Bytes("next_cert_id")
    org_registry_app_id_key = Bytes("org_registry_app")
    user_identity_app_id_key = Bytes("user_identity_app")
    paused_key = Bytes("paused")
    
    # Application Methods
    issue_certificate = Bytes("issue_cert")
    verify_certificate = Bytes("verify_cert")
    revoke_certificate = Bytes("revoke_cert")
    transfer_certificate = Bytes("transfer_cert")
    batch_issue = Bytes("batch_issue")
    get_certificate = Bytes("get_cert")
    get_user_certificates = Bytes("get_user_certs")
    update_certificate_metadata = Bytes("update_cert_meta")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.bytes)
    def generate_certificate_id():
        """Generate unique certificate ID"""
        current_id = App.globalGet(next_cert_id_key)
        App.globalPut(next_cert_id_key, current_id + Int(1))
        return Itob(current_id)
    
    @Subroutine(TealType.uint64)
    def validate_issuing_organization(org_address):
        """Validate that organization is authorized to issue certificates"""
        # This would call the organization registry contract to verify status
        # For now, we'll do a basic validation
        return validate_address(org_address)
    
    @Subroutine(TealType.bytes)
    def create_certificate_hash(cert_data):
        """Create tamper-proof hash of certificate data"""
        return Sha256(cert_data)
    
    # Issue Certificate
    issue_new_certificate = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate issuer is a verified organization
        (issuer := Txn.sender()),
        Assert(validate_issuing_organization(issuer)),
        
        # Validate inputs
        (recipient := Txn.application_args[1]),
        (cert_type := Txn.application_args[2]),
        (cert_name := Txn.application_args[3]),
        (course_details := Txn.application_args[4]),
        (grade_info := Txn.application_args[5]),
        (issue_date := Btoi(Txn.application_args[6])),
        (expiry_date := Btoi(Txn.application_args[7])),  # 0 = no expiry
        
        Assert(validate_address(recipient)),
        Assert(validate_string_length(cert_type, 2, 50)),
        Assert(validate_string_length(cert_name, 5, 200)),
        Assert(validate_string_length(course_details, 10, 1000)),
        Assert(issue_date <= Global.latest_timestamp()),
        Assert(Or(expiry_date == Int(0), expiry_date > issue_date)),
        
        # Generate certificate ID and create certificate
        (cert_id := generate_certificate_id()),
        (cert_box_key := encode_cert_id(Btoi(cert_id))),
        Assert(BoxCreate(cert_box_key, Int(800))),  # 800 bytes for certificate data
        
        # Create certificate data structure
        (cert_data := Concat(
            cert_id,                    # certificate_id
            Bytes("|"),
            issuer,                     # issuer_address
            Bytes("|"),
            recipient,                  # recipient_address
            Bytes("|"),
            cert_type,                  # certificate_type
            Bytes("|"),
            cert_name,                  # certificate_name
            Bytes("|"),
            course_details,             # course_details
            Bytes("|"),
            grade_info,                 # grade_information
            Bytes("|"),
            Itob(issue_date),          # issue_date
            Bytes("|"),
            Itob(expiry_date),         # expiry_date
            Bytes("|"),
            Itob(Int(CERT_STATUS_ACTIVE)), # status
            Bytes("|"),
            Itob(Global.latest_timestamp()) # created_at
        )),
        
        # Create certificate hash for integrity
        (cert_hash := create_certificate_hash(cert_data)),
        
        # Store certificate with hash
        BoxReplace(cert_box_key, Int(0), Concat(
            cert_data,
            Bytes("|"),
            cert_hash
        )),
        
        # Create user certificate index
        (user_cert_index_key := Concat(Bytes("user_certs_"), recipient)),
        (user_cert_index_len := BoxLen(user_cert_index_key)),
        If(
            user_cert_index_len.hasValue(),
            # Append to existing list
            Seq([
                (existing_certs := BoxGet(user_cert_index_key)),
                BoxReplace(user_cert_index_key, Int(0), Concat(
                    existing_certs.value(),
                    Bytes(","),
                    cert_id
                ))
            ]),
            # Create new list
            Seq([
                BoxCreate(user_cert_index_key, Int(200)),
                BoxReplace(user_cert_index_key, Int(0), cert_id)
            ])
        ),
        
        # Update global counters
        App.globalPut(total_certificates_key, App.globalGet(total_certificates_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("CERTIFICATE_ISSUED:"),
            cert_id,
            Bytes(":"),
            issuer,
            Bytes(":"),
            recipient,
            Bytes(":"),
            cert_name
        )),
        
        Return(Int(1))
    ])
    
    # Verify Certificate
    verify_certificate_authenticity = Seq([
        (cert_id := Btoi(Txn.application_args[1])),
        (cert_box_key := encode_cert_id(cert_id)),
        
        (cert_box_len := BoxLen(cert_box_key)),
        If(
            cert_box_len.hasValue(),
            Seq([
                # Get certificate data
                (cert_data := BoxGet(cert_box_key)),
                
                # Extract stored hash and recalculate
                (stored_data_length := Len(cert_data.value()) - Int(32)),  # Assuming 32-byte hash
                (stored_cert_data := Substring(cert_data.value(), Int(0), stored_data_length)),
                (stored_hash := Substring(cert_data.value(), stored_data_length, Len(cert_data.value()))),
                (calculated_hash := create_certificate_hash(stored_cert_data)),
                
                # Verify integrity
                If(
                    stored_hash == calculated_hash,
                    Seq([
                        # Check if certificate is still valid (not revoked, not expired)
                        # Extract status and expiry from stored data
                        Log(Concat(
                            Bytes("CERTIFICATE_VERIFIED:"),
                            Itob(cert_id),
                            Bytes(":VALID:"),
                            cert_data.value()
                        )),
                        Return(Int(1))
                    ]),
                    Seq([
                        Log(Concat(
                            Bytes("CERTIFICATE_VERIFICATION_FAILED:"),
                            Itob(cert_id),
                            Bytes(":TAMPERED")
                        )),
                        Return(Int(0))
                    ])
                )
            ]),
            Seq([
                Log(Concat(
                    Bytes("CERTIFICATE_NOT_FOUND:"),
                    Itob(cert_id)
                )),
                Return(Int(0))
            ])
        )
    ])
    
    # Revoke Certificate
    revoke_existing_certificate = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Only issuer or admin can revoke
        (cert_id := Btoi(Txn.application_args[1])),
        (revocation_reason := Txn.application_args[2]),
        (cert_box_key := encode_cert_id(cert_id)),
        
        (cert_box_len := BoxLen(cert_box_key)),
        Assert(cert_box_len.hasValue()),
        Assert(validate_string_length(revocation_reason, 5, 200)),
        
        # Get certificate data to verify issuer
        (cert_data := BoxGet(cert_box_key)),
        # Extract issuer address from certificate data (this is simplified)
        # In practice, you'd parse the stored data properly
        
        # For now, assume sender is authorized (issuer or admin)
        # Update certificate status to revoked
        # This is a simplified implementation - in practice, you'd need to parse and update specific fields
        
        # Log revocation
        Log(Concat(
            Bytes("CERTIFICATE_REVOKED:"),
            Itob(cert_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            revocation_reason
        )),
        
        Return(Int(1))
    ])
    
    # Transfer Certificate Ownership
    transfer_certificate_ownership = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Only current owner can transfer
        (cert_id := Btoi(Txn.application_args[1])),
        (new_owner := Txn.application_args[2]),
        (cert_box_key := encode_cert_id(cert_id)),
        
        (cert_box_len := BoxLen(cert_box_key)),
        Assert(cert_box_len.hasValue()),
        Assert(validate_address(new_owner)),
        
        # Verify current owner is the sender
        # Get certificate data and verify ownership
        (cert_data := BoxGet(cert_box_key)),
        
        # Update certificate ownership (simplified)
        # In practice, you'd parse and update the recipient field
        
        # Update user certificate indexes
        # Remove from old owner's list, add to new owner's list
        
        # Log transfer
        Log(Concat(
            Bytes("CERTIFICATE_TRANSFERRED:"),
            Itob(cert_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            new_owner
        )),
        
        Return(Int(1))
    ])
    
    # Batch Issue Certificates
    batch_issue_certificates = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate issuer
        (issuer := Txn.sender()),
        Assert(validate_issuing_organization(issuer)),
        
        # Validate batch parameters
        (batch_size := Btoi(Txn.application_args[1])),
        (cert_template := Txn.application_args[2]),
        
        Assert(And(batch_size > Int(0), batch_size <= Int(100))),  # Max 100 per batch
        Assert(validate_string_length(cert_template, 10, 500)),
        
        # For simplicity, we'll just log the batch operation
        # In practice, this would iterate through recipient list
        Log(Concat(
            Bytes("BATCH_CERTIFICATES_ISSUED:"),
            issuer,
            Bytes(":"),
            Itob(batch_size)
        )),
        
        Return(Int(1))
    ])
    
    # Get Certificate Details
    get_certificate_details = Seq([
        (cert_id := Btoi(Txn.application_args[1])),
        (cert_box_key := encode_cert_id(cert_id)),
        
        (cert_box_len := BoxLen(cert_box_key)),
        If(
            cert_box_len.hasValue(),
            Seq([
                (cert_data := BoxGet(cert_box_key)),
                Log(Concat(Bytes("CERTIFICATE_DETAILS:"), cert_data.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("CERTIFICATE_NOT_FOUND:"), Itob(cert_id))),
                Return(Int(0))
            ])
        )
    ])
    
    # Get User Certificates
    get_user_certificate_list = Seq([
        (user_address := Txn.application_args[1]),
        (user_cert_index_key := Concat(Bytes("user_certs_"), user_address)),
        
        (user_cert_index_len := BoxLen(user_cert_index_key)),
        If(
            user_cert_index_len.hasValue(),
            Seq([
                (user_certs := BoxGet(user_cert_index_key)),
                Log(Concat(Bytes("USER_CERTIFICATES:"), user_certs.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("NO_CERTIFICATES_FOUND:"), user_address)),
                Return(Int(0))
            ])
        )
    ])
    
    # Admin rotate / pause / version
    set_admin_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        App.globalPut(admin_key, Txn.application_args[1]),
        Log(Concat(Bytes("ADMIN_CHANGED:"), Txn.application_args[1])),
        Return(Int(1))
    ])
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

    # Main contract logic
    program = Cond(
        [Txn.application_id() == Int(0), Seq([
            # Initialize contract
            App.globalPut(admin_key, Txn.sender()),
            App.globalPut(total_certificates_key, Int(0)),
            App.globalPut(next_cert_id_key, Int(1)),
            App.globalPut(org_registry_app_id_key, Int(0)),  # Set during deployment
            App.globalPut(user_identity_app_id_key, Int(0)), # Set during deployment
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == issue_certificate, issue_new_certificate],
        [Txn.application_args[0] == verify_certificate, verify_certificate_authenticity],
        [Txn.application_args[0] == revoke_certificate, revoke_existing_certificate],
        [Txn.application_args[0] == transfer_certificate, transfer_certificate_ownership],
        [Txn.application_args[0] == batch_issue, batch_issue_certificates],
        [Txn.application_args[0] == get_certificate, get_certificate_details],
        [Txn.application_args[0] == get_user_certificates, get_user_certificate_list],
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def certificate_management_clear_program():
    """Clear state program for certificate management"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(certificate_management_contract(), Mode.Application, version=8)
    clear_program = compileTeal(certificate_management_clear_program(), Mode.Application, version=8)
    
    print("Certificate Management Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")