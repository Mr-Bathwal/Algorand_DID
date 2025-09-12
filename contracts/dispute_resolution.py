"""
Module 8: Dispute Resolution & Arbitration System Smart Contract
Decentralized court system for resolving conflicts within the ecosystem
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def dispute_resolution_contract():
    """
    Dispute Resolution Smart Contract
    Manages dispute filing, jury selection, evidence submission, and verdict execution
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_disputes_key = Bytes("total_disputes")
    next_dispute_id_key = Bytes("next_dispute_id")
    jury_pool_key = Bytes("jury_pool")
    min_juror_trust_key = Bytes("min_juror_trust")
    dispute_bond_key = Bytes("dispute_bond")
    jury_reward_key = Bytes("jury_reward")
    paused_key = Bytes("paused")
    
    # Application Methods
    file_dispute = Bytes("file_dispute")
    select_jury = Bytes("select_jury")
    submit_evidence = Bytes("submit_evidence")
    cast_jury_vote = Bytes("cast_vote")
    execute_verdict = Bytes("execute_verdict")
    appeal_verdict = Bytes("appeal_verdict")
    get_dispute = Bytes("get_dispute")
    join_jury_pool = Bytes("join_jury_pool")
    leave_jury_pool = Bytes("leave_jury_pool")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.uint64)
    def validate_dispute_type(dispute_type):
        """Validate dispute type is within allowed range"""
        return And(
            dispute_type >= Int(DISPUTE_TYPE_CERTIFICATE),
            dispute_type <= Int(DISPUTE_TYPE_GOVERNANCE)
        )
    
    @Subroutine(TealType.uint64)
    def calculate_jury_size(dispute_type, stake_amount):
        """Calculate appropriate jury size based on dispute complexity and stakes"""
        base_size = Int(3)  # Minimum 3 jurors
        
        # Increase jury size for higher stakes
        stake_bonus = If(
            stake_amount > Int(10000000),  # > 10 ALGO
            Int(4),  # 7 jurors for high stakes
            If(
                stake_amount > Int(5000000),  # > 5 ALGO
                Int(2),  # 5 jurors for medium stakes
                Int(0)   # 3 jurors for low stakes
            )
        )
        
        # Increase jury size for complex dispute types
        complexity_bonus = If(
            dispute_type == Int(DISPUTE_TYPE_GOVERNANCE),
            Int(2),  # Governance disputes need more jurors
            If(
                dispute_type == Int(DISPUTE_TYPE_ORGANIZATION),
                Int(1),  # Organization disputes need extra juror
                Int(0)   # Other disputes use base size
            )
        )
        
        total_size = base_size + stake_bonus + complexity_bonus
        return If(total_size > Int(MAX_JURY_SIZE), Int(MAX_JURY_SIZE), total_size)
    
    @Subroutine(TealType.uint64)
    def select_random_jurors(jury_pool_size, needed_jurors, random_seed):
        """Select random jurors from the qualified pool (simplified implementation)"""
        # This is a simplified version - in practice, you'd implement proper randomness
        # and ensure no conflicts of interest
        return Int(1)  # Success
    
    @Subroutine(TealType.uint64)
    def calculate_verdict(votes_for_plaintiff, votes_for_defendant, total_votes):
        """Calculate verdict based on jury votes"""
        majority_threshold = total_votes / Int(2) + Int(1)
        
        return If(
            votes_for_plaintiff >= majority_threshold,
            Int(1),  # Plaintiff wins
            If(
                votes_for_defendant >= majority_threshold,
                Int(2),  # Defendant wins
                Int(0)   # No majority (mistrial)
            )
        )
    
    # File Dispute
    file_new_dispute = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (dispute_type := Btoi(Txn.application_args[1])),
        (defendant := Txn.application_args[2]),
        (subject_id := Btoi(Txn.application_args[3])),  # Certificate ID, User ID, etc.
        (description := Txn.application_args[4]),
        (evidence := Txn.application_args[5]),
        (requested_remedy := Txn.application_args[6]),
        
        Assert(validate_dispute_type(dispute_type)),
        Assert(validate_address(defendant)),
        Assert(validate_string_length(description, 20, 1000)),
        Assert(validate_string_length(evidence, 10, 2000)),
        Assert(validate_string_length(requested_remedy, 5, 500)),
        
        # Prevent self-disputes
        Assert(Txn.sender() != defendant),
        
        # Check dispute bond payment
        Assert(Txn.amount() >= App.globalGet(dispute_bond_key)),
        
        # Generate dispute ID
        (dispute_id := App.globalGet(next_dispute_id_key)),
        (dispute_box_key := encode_dispute_id(dispute_id)),
        
        # Create dispute box
        Assert(BoxCreate(dispute_box_key, Int(1200))),
        
        # Calculate jury size
        (jury_size := calculate_jury_size(dispute_type, Txn.amount())),
        
        # Store dispute data
        BoxReplace(dispute_box_key, Int(0), Concat(
            Itob(dispute_id),          # dispute_id
            Bytes("|"),
            Txn.sender(),              # plaintiff
            Bytes("|"),
            defendant,                 # defendant
            Bytes("|"),
            Itob(dispute_type),        # type
            Bytes("|"),
            Itob(subject_id),          # subject_id
            Bytes("|"),
            description,               # description
            Bytes("|"),
            evidence,                  # plaintiff_evidence
            Bytes("|"),
            requested_remedy,          # requested_remedy
            Bytes("|"),
            Itob(Global.latest_timestamp()), # filed_at
            Bytes("|"),
            Itob(Int(DISPUTE_STATUS_FILED)), # status
            Bytes("|"),
            Itob(jury_size),           # jury_size
            Bytes("|"),
            Itob(Int(0)),              # jury_selected_at (0 = not selected)
            Bytes("|"),
            Itob(Global.latest_timestamp() + Int(DISPUTE_EVIDENCE_PERIOD)), # evidence_deadline
            Bytes("|"),
            Itob(Int(0)),              # deliberation_started_at
            Bytes("|"),
            Itob(Int(0)),              # verdict (0 = pending)
            Bytes("|"),
            Itob(Txn.amount())         # stake_amount
        )),
        
        # Create jury selection box
        (jury_box_key := Concat(Bytes("jury_"), Itob(dispute_id))),
        BoxCreate(jury_box_key, Int(400)),
        
        # Create evidence box for defendant responses
        (evidence_box_key := Concat(Bytes("evidence_"), Itob(dispute_id))),
        BoxCreate(evidence_box_key, Int(800)),
        
        # Update global counters
        App.globalPut(next_dispute_id_key, dispute_id + Int(1)),
        App.globalPut(total_disputes_key, App.globalGet(total_disputes_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("DISPUTE_FILED:"),
            Itob(dispute_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            defendant,
            Bytes(":"),
            Itob(dispute_type)
        )),
        
        Return(Int(1))
    ])
    
    # Select Jury
    select_dispute_jury = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (dispute_id := Btoi(Txn.application_args[1])),
        
        # Get dispute data
        (dispute_box_key := encode_dispute_id(dispute_id)),
        (dispute_box_len := BoxLen(dispute_box_key)),
        Assert(dispute_box_len.hasValue()),
        
        # Check dispute is in filed status
        (dispute_status := Btoi(BoxExtract(dispute_box_key, Int(400), Int(8)))),
        Assert(dispute_status == Int(DISPUTE_STATUS_FILED)),
        
        # Get jury size needed
        (jury_size := Btoi(BoxExtract(dispute_box_key, Int(408), Int(8)))),
        
        # Select jurors (simplified - in practice would be more complex)
        (jury_box_key := Concat(Bytes("jury_"), Itob(dispute_id))),
        
        # For now, just mark jury as selected
        # In practice, this would involve random selection from qualified pool
        BoxReplace(jury_box_key, Int(0), Concat(
            Itob(jury_size),           # selected_jury_size
            Bytes("|"),
            Itob(Global.latest_timestamp()), # selected_at
            Bytes("|"),
            Bytes("JURY_ADDRESSES")    # Placeholder for actual jury addresses
        )),
        
        # Update dispute status
        BoxReplace(dispute_box_key, Int(400), Itob(Int(DISPUTE_STATUS_JURY_SELECTION))),
        BoxReplace(dispute_box_key, Int(416), Itob(Global.latest_timestamp())),
        
        # Log event
        Log(Concat(
            Bytes("JURY_SELECTED:"),
            Itob(dispute_id),
            Bytes(":"),
            Itob(jury_size)
        )),
        
        Return(Int(1))
    ])
    
    # Submit Evidence
    submit_dispute_evidence = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (dispute_id := Btoi(Txn.application_args[1])),
        (evidence_type := Txn.application_args[2]),  # "defendant_response", "additional", etc.
        (evidence_data := Txn.application_args[3]),
        
        Assert(validate_string_length(evidence_data, 10, 2000)),
        
        # Get dispute data
        (dispute_box_key := encode_dispute_id(dispute_id)),
        (dispute_box_len := BoxLen(dispute_box_key)),
        Assert(dispute_box_len.hasValue()),
        
        # Check evidence period is still active
        (evidence_deadline := Btoi(BoxExtract(dispute_box_key, Int(424), Int(8)))),
        Assert(Global.latest_timestamp() <= evidence_deadline),
        
        # Verify sender is plaintiff or defendant
        (plaintiff := BoxExtract(dispute_box_key, Int(40), Int(32))),
        (defendant := BoxExtract(dispute_box_key, Int(72), Int(32))),
        Assert(Or(Txn.sender() == plaintiff, Txn.sender() == defendant)),
        
        # Add evidence to evidence box
        (evidence_box_key := Concat(Bytes("evidence_"), Itob(dispute_id))),
        (evidence_len := BoxLen(evidence_box_key)),
        If(
            evidence_len.hasValue(),
            Seq([
                (existing_evidence := BoxGet(evidence_box_key)),
                BoxReplace(evidence_box_key, Int(0), Concat(
                    existing_evidence.value(),
                    Bytes("|"),
                    Txn.sender(),
                    Bytes(":"),
                    evidence_type,
                    Bytes(":"),
                    evidence_data,
                    Bytes(":"),
                    Itob(Global.latest_timestamp())
                ))
            ]),
            BoxReplace(evidence_box_key, Int(0), Concat(
                Txn.sender(),
                Bytes(":"),
                evidence_type,
                Bytes(":"),
                evidence_data,
                Bytes(":"),
                Itob(Global.latest_timestamp())
            ))
        ),
        
        # Log evidence submission
        Log(Concat(
            Bytes("EVIDENCE_SUBMITTED:"),
            Itob(dispute_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            evidence_type
        )),
        
        Return(Int(1))
    ])
    
    # Cast Jury Vote
    cast_jury_verdict_vote = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (dispute_id := Btoi(Txn.application_args[1])),
        (vote := Btoi(Txn.application_args[2])),  # 1 = plaintiff, 2 = defendant
        (reasoning := Txn.application_args[3]),
        
        Assert(Or(vote == Int(1), vote == Int(2))),
        Assert(validate_string_length(reasoning, 10, 500)),
        
        # Get dispute data
        (dispute_box_key := encode_dispute_id(dispute_id)),
        (dispute_box_len := BoxLen(dispute_box_key)),
        Assert(dispute_box_len.hasValue()),
        
        # Verify sender is a selected juror (simplified)
        # In practice, would check jury selection records
        
        # Check dispute is in deliberation phase
        (dispute_status := Btoi(BoxExtract(dispute_box_key, Int(400), Int(8)))),
        Assert(dispute_status == Int(DISPUTE_STATUS_DELIBERATION)),
        
        # Record vote
        (vote_box_key := Concat(Bytes("vote_"), Itob(dispute_id), Bytes("_"), Txn.sender())),
        Assert(BoxCreate(vote_box_key, Int(200))),
        
        BoxReplace(vote_box_key, Int(0), Concat(
            Txn.sender(),              # juror
            Bytes("|"),
            Itob(vote),                # vote
            Bytes("|"),
            reasoning,                 # reasoning
            Bytes("|"),
            Itob(Global.latest_timestamp()) # voted_at
        )),
        
        # Log vote (without revealing the actual vote for privacy)
        Log(Concat(
            Bytes("JURY_VOTE_CAST:"),
            Itob(dispute_id),
            Bytes(":"),
            Txn.sender()
        )),
        
        Return(Int(1))
    ])
    
    # Execute Verdict
    execute_dispute_verdict = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (dispute_id := Btoi(Txn.application_args[1])),
        
        # Get dispute data
        (dispute_box_key := encode_dispute_id(dispute_id)),
        (dispute_box_len := BoxLen(dispute_box_key)),
        Assert(dispute_box_len.hasValue()),
        
        # Check deliberation period has ended
        (deliberation_started := Btoi(BoxExtract(dispute_box_key, Int(432), Int(8)))),
        Assert(deliberation_started > Int(0)),
        Assert(Global.latest_timestamp() >= deliberation_started + Int(DISPUTE_DELIBERATION_PERIOD)),
        
        # Count votes (simplified - in practice would iterate through all jury votes)
        # For now, we'll simulate vote counting
        (votes_for_plaintiff := Int(2)),  # Simulated
        (votes_for_defendant := Int(1)),  # Simulated
        (total_votes := Int(3)),          # Simulated
        
        # Calculate verdict
        (verdict := calculate_verdict(votes_for_plaintiff, votes_for_defendant, total_votes)),
        
        # Update dispute with verdict
        BoxReplace(dispute_box_key, Int(440), Itob(verdict)),
        BoxReplace(dispute_box_key, Int(400), Itob(Int(DISPUTE_STATUS_RESOLVED))),
        
        # Execute economic consequences
        (stake_amount := Btoi(BoxExtract(dispute_box_key, Int(448), Int(8)))),
        (plaintiff := BoxExtract(dispute_box_key, Int(40), Int(32))),
        (defendant := BoxExtract(dispute_box_key, Int(72), Int(32))),
        
        If(
            verdict == Int(1),  # Plaintiff wins
            Seq([
                # Return stake to plaintiff and penalize defendant
                transfer_algo(plaintiff, stake_amount),
                # Additional penalties could be implemented here
                Log(Concat(Bytes("VERDICT_EXECUTED:"), Itob(dispute_id), Bytes(":PLAINTIFF_WINS")))
            ]),
            If(
                verdict == Int(2),  # Defendant wins
                Seq([
                    # Forfeit plaintiff's stake, reward defendant
                    transfer_algo(defendant, stake_amount / Int(2)),
                    # Return remaining stake to platform treasury
                    Log(Concat(Bytes("VERDICT_EXECUTED:"), Itob(dispute_id), Bytes(":DEFENDANT_WINS")))
                ]),
                Seq([
                    # Mistrial - return stakes to both parties
                    transfer_algo(plaintiff, stake_amount / Int(2)),
                    transfer_algo(defendant, stake_amount / Int(2)),
                    Log(Concat(Bytes("VERDICT_EXECUTED:"), Itob(dispute_id), Bytes(":MISTRIAL")))
                ])
            )
        ),
        
        # Reward jurors
        # This would distribute jury rewards to participating jurors
        
        Return(Int(1))
    ])
    
    # Join Jury Pool
    join_jury_qualification_pool = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate juror qualifications
        (trust_score := Btoi(Txn.application_args[1])),
        (stake_amount := Btoi(Txn.application_args[2])),
        
        Assert(trust_score >= App.globalGet(min_juror_trust_key)),
        Assert(stake_amount >= Int(MIN_STAKE_AMOUNT)),
        
        # Add to jury pool (simplified)
        # In practice, would maintain a proper jury pool registry
        
        # Log jury pool join
        Log(Concat(
            Bytes("JUROR_JOINED_POOL:"),
            Txn.sender(),
            Bytes(":"),
            Itob(trust_score)
        )),
        
        Return(Int(1))
    ])
    
    # Get Dispute Details
    get_dispute_details = Seq([
        (dispute_id := Btoi(Txn.application_args[1])),
        (dispute_box_key := encode_dispute_id(dispute_id)),
        
        (dispute_box_len := BoxLen(dispute_box_key)),
        If(
            dispute_box_len.hasValue(),
            Seq([
                (dispute_data := BoxGet(dispute_box_key)),
                Log(Concat(Bytes("DISPUTE_DETAILS:"), dispute_data.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("DISPUTE_NOT_FOUND:"), Itob(dispute_id))),
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
            App.globalPut(total_disputes_key, Int(0)),
            App.globalPut(next_dispute_id_key, Int(1)),
            App.globalPut(jury_pool_key, Int(0)),
            App.globalPut(min_juror_trust_key, Int(70)),  # Minimum 70 trust score for jurors
            App.globalPut(dispute_bond_key, Int(DISPUTE_BOND_AMOUNT)),
            App.globalPut(jury_reward_key, Int(JURY_REWARD_AMOUNT)),
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == file_dispute, file_new_dispute],
        [Txn.application_args[0] == select_jury, select_dispute_jury],
        [Txn.application_args[0] == submit_evidence, submit_dispute_evidence],
        [Txn.application_args[0] == cast_jury_vote, cast_jury_verdict_vote],
        [Txn.application_args[0] == execute_verdict, execute_dispute_verdict],
        [Txn.application_args[0] == get_dispute, get_dispute_details],
        [Txn.application_args[0] == join_jury_pool, join_jury_qualification_pool],
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def dispute_resolution_clear_program():
    """Clear state program for dispute resolution"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(dispute_resolution_contract(), Mode.Application, version=8)
    clear_program = compileTeal(dispute_resolution_clear_program(), Mode.Application, version=8)
    
    print("Dispute Resolution Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")