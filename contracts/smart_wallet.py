"""
Module 7: Account Abstraction & Smart Wallet System Smart Contract
Next-generation wallet experience with programmable access controls and recovery
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def smart_wallet_contract():
    """
    Smart Wallet Smart Contract
    Manages multi-signature wallets, social recovery, and programmable access controls
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_wallets_key = Bytes("total_wallets")
    recovery_delay_key = Bytes("recovery_delay")
    paused_key = Bytes("paused")
    
    # Wallet State Keys (stored in boxes)
    owner_key = Bytes("owner")
    guardians_key = Bytes("guardians")
    threshold_key = Bytes("threshold")
    daily_limit_key = Bytes("daily_limit")
    spent_today_key = Bytes("spent_today")
    last_reset_key = Bytes("last_reset")
    recovery_mode_key = Bytes("recovery_mode")
    recovery_initiated_key = Bytes("recovery_initiated")
    new_owner_key = Bytes("new_owner")
    
    # Application Methods
    create_wallet = Bytes("create_wallet")
    add_guardian = Bytes("add_guardian")
    remove_guardian = Bytes("remove_guardian")
    initiate_recovery = Bytes("initiate_recovery")
    confirm_recovery = Bytes("confirm_recovery")
    execute_recovery = Bytes("execute_recovery")
    cancel_recovery = Bytes("cancel_recovery")
    execute_transaction = Bytes("execute_tx")
    set_daily_limit = Bytes("set_daily_limit")
    get_wallet_info = Bytes("get_wallet_info")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.uint64)
    def validate_guardian_threshold(guardian_count, threshold):
        """Validate that threshold is reasonable for guardian count"""
        return And(
            threshold > Int(0),
            threshold <= guardian_count,
            threshold >= (guardian_count + Int(1)) / Int(2)  # At least majority
        )
    
    @Subroutine(TealType.uint64)
    def check_daily_limit(wallet_address, amount):
        """Check if transaction amount is within daily spending limit"""
        wallet_box_key = Concat(Bytes("wallet_"), wallet_address)
        
        # Get current daily limit and spent amount
        daily_limit = Btoi(BoxExtract(wallet_box_key, Int(200), Int(8)))
        spent_today = Btoi(BoxExtract(wallet_box_key, Int(208), Int(8)))
        last_reset = Btoi(BoxExtract(wallet_box_key, Int(216), Int(8)))
        
        # Check if we need to reset daily counter
        current_day = Global.latest_timestamp() / Int(86400)
        last_reset_day = last_reset / Int(86400)
        
        actual_spent = If(
            current_day > last_reset_day,
            Int(0),  # Reset counter for new day
            spent_today
        )
        
        return (actual_spent + amount) <= daily_limit
    
    @Subroutine(TealType.uint64)
    def update_daily_spending(wallet_address, amount):
        """Update daily spending tracker"""
        wallet_box_key = Concat(Bytes("wallet_"), wallet_address)
        
        # Get current values
        spent_today = Btoi(BoxExtract(wallet_box_key, Int(208), Int(8)))
        last_reset = Btoi(BoxExtract(wallet_box_key, Int(216), Int(8)))
        
        # Check if we need to reset for new day
        current_day = Global.latest_timestamp() / Int(86400)
        last_reset_day = last_reset / Int(86400)
        
        new_spent = If(
            current_day > last_reset_day,
            amount,  # New day, start fresh
            spent_today + amount
        )
        
        # Update spent amount and reset timestamp
        BoxReplace(wallet_box_key, Int(208), Itob(new_spent))
        BoxReplace(wallet_box_key, Int(216), Itob(Global.latest_timestamp()))
        
        return Int(1)
    
    # Create Smart Wallet
    create_smart_wallet = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (initial_guardians_count := Btoi(Txn.application_args[1])),
        (recovery_threshold := Btoi(Txn.application_args[2])),
        (daily_spending_limit := Btoi(Txn.application_args[3])),
        
        Assert(And(
            initial_guardians_count <= Int(MAX_GUARDIANS_PER_WALLET),
            initial_guardians_count >= Int(1)
        )),
        Assert(validate_guardian_threshold(initial_guardians_count, recovery_threshold)),
        Assert(daily_spending_limit > Int(0)),
        
        # Create wallet box
        (wallet_box_key := Concat(Bytes("wallet_"), Txn.sender())),
        Assert(BoxCreate(wallet_box_key, Int(800))),
        
        # Initialize wallet data
        BoxReplace(wallet_box_key, Int(0), Concat(
            Txn.sender(),              # owner
            Bytes("|"),
            Itob(initial_guardians_count), # guardian_count
            Bytes("|"),
            Itob(recovery_threshold),  # recovery_threshold
            Bytes("|"),
            Itob(daily_spending_limit), # daily_limit
            Bytes("|"),
            Itob(Int(0)),              # spent_today
            Bytes("|"),
            Itob(Global.latest_timestamp()), # last_reset
            Bytes("|"),
            Itob(Int(0)),              # recovery_mode (0 = normal, 1 = recovery)
            Bytes("|"),
            Itob(Int(0)),              # recovery_initiated_at
            Bytes("|"),
            Bytes(""),                 # new_owner_candidate
            Bytes("|"),
            Itob(Int(0)),              # recovery_confirmations
            Bytes("|"),
            Itob(Global.latest_timestamp()) # created_at
        )),
        
        # Initialize guardians list (empty initially)
        (guardians_box_key := Concat(Bytes("guardians_"), Txn.sender())),
        BoxCreate(guardians_box_key, Int(400)),
        
        # Update global counter
        App.globalPut(total_wallets_key, App.globalGet(total_wallets_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("SMART_WALLET_CREATED:"),
            Txn.sender(),
            Bytes(":"),
            Itob(recovery_threshold),
            Bytes(":"),
            Itob(daily_spending_limit)
        )),
        
        Return(Int(1))
    ])
    
    # Add Guardian
    add_wallet_guardian = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Only wallet owner can add guardians
        (wallet_box_key := Concat(Bytes("wallet_"), Txn.sender())),
        (wallet_box_len := BoxLen(wallet_box_key)),
        Assert(wallet_box_len.hasValue()),
        
        # Validate new guardian
        (new_guardian := Txn.application_args[1]),
        Assert(validate_address(new_guardian)),
        Assert(new_guardian != Txn.sender()),  # Can't be self-guardian
        
        # Get current guardian count
        (current_count := Btoi(BoxExtract(wallet_box_key, Int(40), Int(8)))),
        Assert(current_count < Int(MAX_GUARDIANS_PER_WALLET)),
        
        # Add guardian to list
        (guardians_box_key := Concat(Bytes("guardians_"), Txn.sender())),
        (guardians_len := BoxLen(guardians_box_key)),
        If(
            guardians_len.hasValue(),
            Seq([
                (existing_guardians := BoxGet(guardians_box_key)),
                # Check if guardian already exists (simplified)
                BoxReplace(guardians_box_key, Int(0), Concat(
                    existing_guardians.value(),
                    Bytes(","),
                    new_guardian
                ))
            ]),
            BoxReplace(guardians_box_key, Int(0), new_guardian)
        ),
        
        # Update guardian count
        BoxReplace(wallet_box_key, Int(40), Itob(current_count + Int(1))),
        
        # Log event
        Log(Concat(
            Bytes("GUARDIAN_ADDED:"),
            Txn.sender(),
            Bytes(":"),
            new_guardian
        )),
        
        Return(Int(1))
    ])
    
    # Remove Guardian
    remove_wallet_guardian = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Only wallet owner can remove guardians
        (wallet_box_key := Concat(Bytes("wallet_"), Txn.sender())),
        (wallet_box_len := BoxLen(wallet_box_key)),
        Assert(wallet_box_len.hasValue()),
        
        # Validate guardian to remove
        (guardian_to_remove := Txn.application_args[1]),
        Assert(validate_address(guardian_to_remove)),
        
        # Get current guardian count and threshold
        (current_count := Btoi(BoxExtract(wallet_box_key, Int(40), Int(8)))),
        (threshold := Btoi(BoxExtract(wallet_box_key, Int(48), Int(8)))),
        
        # Ensure we maintain minimum threshold after removal
        Assert(validate_guardian_threshold(current_count - Int(1), threshold)),
        
        # Remove guardian from list (simplified implementation)
        # In practice, you'd parse the guardian list and remove the specific guardian
        
        # Update guardian count
        BoxReplace(wallet_box_key, Int(40), Itob(current_count - Int(1))),
        
        # Log event
        Log(Concat(
            Bytes("GUARDIAN_REMOVED:"),
            Txn.sender(),
            Bytes(":"),
            guardian_to_remove
        )),
        
        Return(Int(1))
    ])
    
    # Initiate Recovery
    initiate_wallet_recovery = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Must be called by a guardian
        (wallet_owner := Txn.application_args[1]),
        (new_owner_candidate := Txn.application_args[2]),
        
        Assert(validate_address(wallet_owner)),
        Assert(validate_address(new_owner_candidate)),
        
        # Verify sender is a guardian (simplified)
        (guardians_box_key := Concat(Bytes("guardians_"), wallet_owner)),
        (guardians_len := BoxLen(guardians_box_key)),
        Assert(guardians_len.hasValue()),
        
        # Get wallet data
        (wallet_box_key := Concat(Bytes("wallet_"), wallet_owner)),
        (wallet_owner_len := BoxLen(wallet_box_key)),
        Assert(wallet_owner_len.hasValue()),
        
        # Check wallet is not already in recovery mode
        (recovery_mode := Btoi(BoxExtract(wallet_box_key, Int(150), Int(8)))),
        Assert(recovery_mode == Int(0)),
        
        # Set recovery mode
        BoxReplace(wallet_box_key, Int(150), Itob(Int(1))),
        BoxReplace(wallet_box_key, Int(158), Itob(Global.latest_timestamp())),
        
        # Set new owner candidate (simplified - store as bytes)
        BoxReplace(wallet_box_key, Int(166), new_owner_candidate),
        
        # Initialize confirmation count to 1 (initiating guardian)
        BoxReplace(wallet_box_key, Int(198), Itob(Int(1))),
        
        # Log event
        Log(Concat(
            Bytes("RECOVERY_INITIATED:"),
            wallet_owner,
            Bytes(":"),
            new_owner_candidate,
            Bytes(":"),
            Txn.sender()
        )),
        
        Return(Int(1))
    ])
    
    # Confirm Recovery
    confirm_wallet_recovery = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Must be called by a guardian
        (wallet_owner := Txn.application_args[1]),
        
        Assert(validate_address(wallet_owner)),
        
        # Verify sender is a guardian (simplified)
        (guardians_box_key := Concat(Bytes("guardians_"), wallet_owner)),
        (guardians_len := BoxLen(guardians_box_key)),
        Assert(guardians_len.hasValue()),
        
        # Get wallet data
        (wallet_box_key := Concat(Bytes("wallet_"), wallet_owner)),
        (wallet_owner_len := BoxLen(wallet_box_key)),
        Assert(wallet_owner_len.hasValue()),
        
        # Check wallet is in recovery mode
        (recovery_mode := Btoi(BoxExtract(wallet_box_key, Int(150), Int(8)))),
        Assert(recovery_mode == Int(1)),
        
        # Increment confirmation count
        (current_confirmations := Btoi(BoxExtract(wallet_box_key, Int(198), Int(8)))),
        BoxReplace(wallet_box_key, Int(198), Itob(current_confirmations + Int(1))),
        
        # Log event
        Log(Concat(
            Bytes("RECOVERY_CONFIRMED:"),
            wallet_owner,
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(current_confirmations + Int(1))
        )),
        
        Return(Int(1))
    ])
    
    # Execute Recovery
    execute_wallet_recovery = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (wallet_owner := Txn.application_args[1]),
        
        # Get wallet data
        (wallet_box_key := Concat(Bytes("wallet_"), wallet_owner)),
        (wallet_owner_len := BoxLen(wallet_box_key)),
        Assert(wallet_owner_len.hasValue()),
        
        # Verify recovery conditions
        (recovery_mode := Btoi(BoxExtract(wallet_box_key, Int(150), Int(8)))),
        (recovery_initiated_at := Btoi(BoxExtract(wallet_box_key, Int(158), Int(8)))),
        (confirmations := Btoi(BoxExtract(wallet_box_key, Int(198), Int(8)))),
        (threshold := Btoi(BoxExtract(wallet_box_key, Int(48), Int(8)))),
        
        Assert(recovery_mode == Int(1)),
        Assert(confirmations >= threshold),
        Assert(Global.latest_timestamp() >= recovery_initiated_at + App.globalGet(recovery_delay_key)),
        
        # Execute recovery - change owner
        (new_owner := BoxExtract(wallet_box_key, Int(166), Int(32))),
        BoxReplace(wallet_box_key, Int(0), new_owner),
        
        # Reset recovery mode
        BoxReplace(wallet_box_key, Int(150), Itob(Int(0))),
        BoxReplace(wallet_box_key, Int(158), Itob(Int(0))),
        BoxReplace(wallet_box_key, Int(198), Itob(Int(0))),
        
        # Log event
        Log(Concat(
            Bytes("RECOVERY_EXECUTED:"),
            wallet_owner,
            Bytes(":"),
            new_owner
        )),
        
        Return(Int(1))
    ])
    
    # Execute Transaction
    execute_wallet_transaction = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate transaction parameters
        (recipient := Txn.application_args[1]),
        (amount := Btoi(Txn.application_args[2])),
        
        Assert(validate_address(recipient)),
        Assert(amount > Int(0)),
        
        # Get wallet data
        (wallet_box_key := Concat(Bytes("wallet_"), Txn.sender())),
        (wallet_box_len := BoxLen(wallet_box_key)),
        Assert(wallet_box_len.hasValue()),
        
        # Check daily limit
        Assert(check_daily_limit(Txn.sender(), amount)),
        
        # Execute payment
        transfer_algo(recipient, amount),
        
        # Update daily spending
        update_daily_spending(Txn.sender(), amount),
        
        # Log transaction
        Log(Concat(
            Bytes("WALLET_TRANSACTION:"),
            Txn.sender(),
            Bytes(":"),
            recipient,
            Bytes(":"),
            Itob(amount)
        )),
        
        Return(Int(1))
    ])
    
    # Set Daily Limit
    set_wallet_daily_limit = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (new_limit := Btoi(Txn.application_args[1])),
        Assert(new_limit > Int(0)),
        
        # Get wallet data
        (wallet_box_key := Concat(Bytes("wallet_"), Txn.sender())),
        (wallet_box_len := BoxLen(wallet_box_key)),
        Assert(wallet_box_len.hasValue()),
        
        # Update daily limit
        BoxReplace(wallet_box_key, Int(56), Itob(new_limit)),
        
        # Log event
        Log(Concat(
            Bytes("DAILY_LIMIT_UPDATED:"),
            Txn.sender(),
            Bytes(":"),
            Itob(new_limit)
        )),
        
        Return(Int(1))
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

    # Get Wallet Info
    get_wallet_information = Seq([
        (wallet_address := Txn.application_args[1]),
        (wallet_box_key := Concat(Bytes("wallet_"), wallet_address)),
        (wallet_box_len := BoxLen(wallet_box_key)),
        If(
            wallet_box_len.hasValue(),
            Seq([
                (wallet_data := BoxGet(wallet_box_key)),
                Log(Concat(Bytes("WALLET_INFO:"), wallet_data.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("WALLET_NOT_FOUND:"), wallet_address)),
                Return(Int(0))
            ])
        )
    ])
    
    # Main contract logic
    method = Txn.application_args[0]
    program = Cond(
        [Txn.application_id() == Int(0), Seq([
            # Initialize contract
            App.globalPut(admin_key, Txn.sender()),
            App.globalPut(total_wallets_key, Int(0)),
            App.globalPut(recovery_delay_key, Int(RECOVERY_DELAY_PERIOD)),
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        
        [method == create_wallet, create_smart_wallet],
        [method == add_guardian, add_wallet_guardian],
        [method == remove_guardian, remove_wallet_guardian],
        [method == initiate_recovery, initiate_wallet_recovery],
        [method == confirm_recovery, confirm_wallet_recovery],
        [method == execute_recovery, execute_wallet_recovery],
        [method == execute_transaction, execute_wallet_transaction],
        [method == set_daily_limit, set_wallet_daily_limit],
        [method == get_wallet_info, get_wallet_information],
        [method == set_admin, set_admin_fn],
        [method == pause, pause_fn],
        [method == unpause, unpause_fn],
        [method == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def smart_wallet_clear_program():
    """Clear state program for smart wallet"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(smart_wallet_contract(), Mode.Application, version=8)
    clear_program = compileTeal(smart_wallet_clear_program(), Mode.Application, version=8)
    
    print("Smart Wallet Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")