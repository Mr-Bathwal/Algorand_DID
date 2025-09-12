"""
Module 5: Decentralized Governance System Smart Contract
Community-driven decision making for platform policies, disputes, and evolution
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def governance_contract():
    """
    Governance Smart Contract
    Manages proposals, voting, and democratic decision-making for the platform
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_proposals_key = Bytes("total_proposals")
    next_proposal_id_key = Bytes("next_proposal_id")
    min_trust_score_key = Bytes("min_trust_score")
    min_stake_key = Bytes("min_stake")
    voting_period_key = Bytes("voting_period")
    quorum_threshold_key = Bytes("quorum_threshold")
    paused_key = Bytes("paused")
    
    # Application Methods
    create_proposal = Bytes("create_proposal")
    vote_on_proposal = Bytes("vote_proposal")
    execute_proposal = Bytes("execute_proposal")
    get_proposal = Bytes("get_proposal")
    get_voting_results = Bytes("get_results")
    delegate_vote = Bytes("delegate_vote")
    revoke_delegation = Bytes("revoke_delegation")
    update_governance_params = Bytes("update_params")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.uint64)
    def calculate_voting_power(trust_score, stake_amount, delegation_count):
        """Calculate voting power based on trust score, stake, and delegations"""
        base_power = Int(1)  # Everyone gets 1 base vote
        
        # Trust score bonus (0-10 additional votes based on trust score)
        trust_bonus = trust_score / Int(10)
        
        # Stake bonus (1 vote per ALGO staked, max 50)
        stake_bonus = If(
            stake_amount / Int(1000000) > Int(50),
            Int(50),
            stake_amount / Int(1000000)
        )
        
        # Delegation bonus (1 vote per 10 delegations, max 20)
        delegation_bonus = If(
            delegation_count / Int(10) > Int(20),
            Int(20),
            delegation_count / Int(10)
        )
        
        total_power = base_power + trust_bonus + stake_bonus + delegation_bonus
        
        return If(total_power > Int(100), Int(100), total_power)  # Cap at 100 votes
    
    @Subroutine(TealType.uint64)
    def validate_proposal_type(proposal_type):
        """Validate proposal type is within allowed range"""
        return And(
            proposal_type >= Int(PROPOSAL_TYPE_TECHNICAL),
            proposal_type <= Int(PROPOSAL_TYPE_INTEGRATION)
        )
    
    @Subroutine(TealType.uint64)
    def check_voting_eligibility(voter_address, proposal_type, min_trust_required):
        """Check if voter is eligible for this type of proposal"""
        # This would integrate with trust score contract to get voter's trust score
        # For now, we'll assume basic eligibility check
        return Int(1)  # Simplified - always eligible
    
    @Subroutine(TealType.uint64)
    def calculate_quorum_met(total_votes, total_eligible_voters, quorum_percentage):
        """Check if quorum is met for the proposal"""
        required_votes = total_eligible_voters * quorum_percentage / Int(100)
        return total_votes >= required_votes
    
    # Create Proposal
    create_new_proposal = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (proposal_type := Btoi(Txn.application_args[1])),
        (title := Txn.application_args[2]),
        (description := Txn.application_args[3]),
        (execution_data := Txn.application_args[4]),  # Contract calls or parameters
        (voting_duration := Btoi(Txn.application_args[5])),  # Custom duration or 0 for default
        
        Assert(validate_proposal_type(proposal_type)),
        Assert(validate_string_length(title, 5, 200)),
        Assert(validate_string_length(description, 20, MAX_PROPOSAL_DESCRIPTION_LENGTH)),
        
        # Check proposer eligibility
        # Must have minimum trust score or stake
        # This would integrate with trust score and staking contracts
        
        # Generate proposal ID
        (proposal_id := App.globalGet(next_proposal_id_key)),
        (proposal_box_key := encode_proposal_id(proposal_id)),
        
        # Create proposal box
        Assert(BoxCreate(proposal_box_key, Int(1000))),
        
        # Set voting period
        (actual_voting_duration := If(
            voting_duration > Int(0),
            voting_duration,
            App.globalGet(voting_period_key)
        )),
        
        # Store proposal data
        BoxReplace(proposal_box_key, Int(0), Concat(
            Itob(proposal_id),         # proposal_id
            Bytes("|"),
            Txn.sender(),              # proposer
            Bytes("|"),
            Itob(proposal_type),       # type
            Bytes("|"),
            title,                     # title
            Bytes("|"),
            description,               # description
            Bytes("|"),
            execution_data,            # execution_data
            Bytes("|"),
            Itob(Global.latest_timestamp()), # created_at
            Bytes("|"),
            Itob(Global.latest_timestamp() + actual_voting_duration), # voting_ends_at
            Bytes("|"),
            Itob(Int(PROPOSAL_STATUS_ACTIVE)), # status
            Bytes("|"),
            Itob(Int(0)),              # votes_for
            Bytes("|"),
            Itob(Int(0)),              # votes_against
            Bytes("|"),
            Itob(Int(0)),              # total_voting_power
            Bytes("|"),
            Itob(Int(0))               # execution_timestamp (0 = not executed)
        )),
        
        # Create voting record box for this proposal
        (voting_record_key := Concat(Bytes("votes_"), Itob(proposal_id))),
        BoxCreate(voting_record_key, Int(500)),
        
        # Update global counters
        App.globalPut(next_proposal_id_key, proposal_id + Int(1)),
        App.globalPut(total_proposals_key, App.globalGet(total_proposals_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("PROPOSAL_CREATED:"),
            Itob(proposal_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(proposal_type),
            Bytes(":"),
            title
        )),
        
        Return(Int(1))
    ])
    
    # Vote on Proposal
    vote_on_existing_proposal = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (proposal_id := Btoi(Txn.application_args[1])),
        (vote := Btoi(Txn.application_args[2])),  # 1 = for, 0 = against
        (voter_trust_score := Btoi(Txn.application_args[3])),
        (voter_stake := Btoi(Txn.application_args[4])),
        
        Assert(Or(vote == Int(0), vote == Int(1))),
        
        # Get proposal data
        (proposal_box_key := encode_proposal_id(proposal_id)),
        (proposal_len := BoxLen(proposal_box_key)),
        Assert(proposal_len.hasValue()),
        
        # Check voting period is active
        (voting_ends_at := Btoi(BoxExtract(proposal_box_key, Int(300), Int(8)))),
        Assert(Global.latest_timestamp() <= voting_ends_at),
        
        # Check proposal status is active
        (proposal_status := Btoi(BoxExtract(proposal_box_key, Int(308), Int(8)))),
        Assert(proposal_status == Int(PROPOSAL_STATUS_ACTIVE)),
        
        # Check voter eligibility
        (proposal_type := Btoi(BoxExtract(proposal_box_key, Int(100), Int(8)))),
        Assert(check_voting_eligibility(Txn.sender(), proposal_type, Int(30))),
        
        # Prevent double voting
        (voting_record_key := Concat(Bytes("votes_"), Itob(proposal_id))),
        (voter_record_key := Concat(voting_record_key, Bytes("_"), Txn.sender())),
        (voter_len := BoxLen(voter_record_key)),
        Assert(Not(voter_len.hasValue())),  # Voter hasn't voted yet
        
        # Calculate voting power
        (voting_power := calculate_voting_power(voter_trust_score, voter_stake, Int(0))),
        
        # Record vote
        BoxCreate(voter_record_key, Int(100)),
        BoxReplace(voter_record_key, Int(0), Concat(
            Txn.sender(),              # voter
            Bytes("|"),
            Itob(vote),                # vote (0 or 1)
            Bytes("|"),
            Itob(voting_power),        # voting_power
            Bytes("|"),
            Itob(Global.latest_timestamp()) # voted_at
        )),
        
        # Update proposal vote counts
        (current_votes_for := Btoi(BoxExtract(proposal_box_key, Int(316), Int(8)))),
        (current_votes_against := Btoi(BoxExtract(proposal_box_key, Int(324), Int(8)))),
        (current_total_power := Btoi(BoxExtract(proposal_box_key, Int(332), Int(8)))),
        
        If(
            vote == Int(1),
            # Vote FOR
            Seq([
                BoxReplace(proposal_box_key, Int(316), Itob(current_votes_for + voting_power)),
                BoxReplace(proposal_box_key, Int(332), Itob(current_total_power + voting_power))
            ]),
            # Vote AGAINST
            Seq([
                BoxReplace(proposal_box_key, Int(324), Itob(current_votes_against + voting_power)),
                BoxReplace(proposal_box_key, Int(332), Itob(current_total_power + voting_power))
            ])
        ),
        
        # Log vote
        Log(Concat(
            Bytes("VOTE_CAST:"),
            Itob(proposal_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(vote),
            Bytes(":"),
            Itob(voting_power)
        )),
        
        Return(Int(1))
    ])
    
    # Execute Proposal
    execute_approved_proposal = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (proposal_id := Btoi(Txn.application_args[1])),
        
        # Get proposal data
        (proposal_box_key := encode_proposal_id(proposal_id)),
        (proposal_len := BoxLen(proposal_box_key)),
        Assert(proposal_len.hasValue()),
        
        # Check voting period has ended
        (voting_ends_at := Btoi(BoxExtract(proposal_box_key, Int(300), Int(8)))),
        Assert(Global.latest_timestamp() > voting_ends_at),
        
        # Check proposal hasn't been executed yet
        (execution_timestamp := Btoi(BoxExtract(proposal_box_key, Int(340), Int(8)))),
        Assert(execution_timestamp == Int(0)),
        
        # Get vote results
        (votes_for := Btoi(BoxExtract(proposal_box_key, Int(316), Int(8)))),
        (votes_against := Btoi(BoxExtract(proposal_box_key, Int(324), Int(8)))),
        (total_voting_power := Btoi(BoxExtract(proposal_box_key, Int(332), Int(8)))),
        
        # Check if proposal passed
        (proposal_passed := And(
            votes_for > votes_against,
            calculate_quorum_met(total_voting_power, Int(1000), App.globalGet(quorum_threshold_key))
        )),
        
        If(
            proposal_passed,
            Seq([
                # Update proposal status to passed and executed
                BoxReplace(proposal_box_key, Int(308), Itob(Int(PROPOSAL_STATUS_EXECUTED))),
                BoxReplace(proposal_box_key, Int(340), Itob(Global.latest_timestamp())),
                
                # Execute proposal (simplified - in practice would call other contracts)
                # The execution_data would contain contract calls or parameter updates
                
                # Log execution
                Log(Concat(
                    Bytes("PROPOSAL_EXECUTED:"),
                    Itob(proposal_id),
                    Bytes(":PASSED")
                ))
            ]),
            Seq([
                # Update proposal status to rejected
                BoxReplace(proposal_box_key, Int(308), Itob(Int(PROPOSAL_STATUS_REJECTED))),
                
                # Log rejection
                Log(Concat(
                    Bytes("PROPOSAL_REJECTED:"),
                    Itob(proposal_id),
                    Bytes(":FAILED")
                ))
            ])
        ),
        
        Return(Int(1))
    ])
    
    # Delegate Vote
    delegate_voting_power = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (delegate_to := Txn.application_args[1]),
        (proposal_id := Btoi(Txn.application_args[2])),
        
        Assert(validate_address(delegate_to)),
        Assert(delegate_to != Txn.sender()),  # Can't delegate to self
        
        # Create delegation record
        (delegation_key := Concat(Bytes("delegation_"), Txn.sender(), Bytes("_"), Itob(proposal_id))),
        Assert(BoxCreate(delegation_key, Int(100))),
        
        BoxReplace(delegation_key, Int(0), Concat(
            Txn.sender(),              # delegator
            Bytes("|"),
            delegate_to,               # delegate
            Bytes("|"),
            Itob(proposal_id),         # proposal_id
            Bytes("|"),
            Itob(Global.latest_timestamp()) # delegated_at
        )),
        
        # Log delegation
        Log(Concat(
            Bytes("VOTE_DELEGATED:"),
            Txn.sender(),
            Bytes(":"),
            delegate_to,
            Bytes(":"),
            Itob(proposal_id)
        )),
        
        Return(Int(1))
    ])
    
    # Get Proposal Details
    get_proposal_details = Seq([
        (proposal_id := Btoi(Txn.application_args[1])),
        (proposal_box_key := encode_proposal_id(proposal_id)),
        
        (proposal_len := BoxLen(proposal_box_key)),
        If(
            proposal_len.hasValue(),
            Seq([
                (proposal_data := BoxGet(proposal_box_key)),
                Log(Concat(Bytes("PROPOSAL_DETAILS:"), proposal_data.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("PROPOSAL_NOT_FOUND:"), Itob(proposal_id))),
                Return(Int(0))
            ])
        )
    ])
    
    # Get Voting Results
    get_proposal_voting_results = Seq([
        (proposal_id := Btoi(Txn.application_args[1])),
        (proposal_box_key := encode_proposal_id(proposal_id)),
        
        (proposal_len := BoxLen(proposal_box_key)),
        If(
            proposal_len.hasValue(),
            Seq([
                # Extract vote counts
                (votes_for := Btoi(BoxExtract(proposal_box_key, Int(316), Int(8)))),
                (votes_against := Btoi(BoxExtract(proposal_box_key, Int(324), Int(8)))),
                (total_power := Btoi(BoxExtract(proposal_box_key, Int(332), Int(8)))),
                (status := Btoi(BoxExtract(proposal_box_key, Int(308), Int(8)))),
                
                Log(Concat(
                    Bytes("VOTING_RESULTS:"),
                    Itob(proposal_id),
                    Bytes(":"),
                    Itob(votes_for),
                    Bytes(":"),
                    Itob(votes_against),
                    Bytes(":"),
                    Itob(total_power),
                    Bytes(":"),
                    Itob(status)
                )),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("PROPOSAL_NOT_FOUND:"), Itob(proposal_id))),
                Return(Int(0))
            ])
        )
    ])
    
    # Update Governance Parameters (Admin only)
    update_governance_parameters = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Check admin permission
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        (param_name := Txn.application_args[1]),
        (param_value := Btoi(Txn.application_args[2])),
        
        # Update specific parameter
        If(
            param_name == Bytes("min_trust_score"),
            App.globalPut(min_trust_score_key, param_value),
            If(
                param_name == Bytes("min_stake"),
                App.globalPut(min_stake_key, param_value),
                If(
                    param_name == Bytes("voting_period"),
                    App.globalPut(voting_period_key, param_value),
                    If(
                        param_name == Bytes("quorum_threshold"),
                        App.globalPut(quorum_threshold_key, param_value),
                        Return(Int(0))  # Unknown parameter
                    )
                )
            )
        ),
        
        # Log parameter update
        Log(Concat(
            Bytes("GOVERNANCE_PARAM_UPDATED:"),
            param_name,
            Bytes(":"),
            Itob(param_value)
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

    # Main contract logic
    program = Cond(
        [Txn.application_id() == Int(0), Seq([
            # Initialize contract
            App.globalPut(admin_key, Txn.sender()),
            App.globalPut(total_proposals_key, Int(0)),
            App.globalPut(next_proposal_id_key, Int(1)),
            App.globalPut(min_trust_score_key, Int(30)),  # Minimum 30 trust score to propose
            App.globalPut(min_stake_key, Int(MIN_STAKE_AMOUNT)),
            App.globalPut(voting_period_key, Int(PROPOSAL_VOTING_PERIOD)),
            App.globalPut(quorum_threshold_key, Int(20)),  # 20% quorum required
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == create_proposal, create_new_proposal],
        [Txn.application_args[0] == vote_on_proposal, vote_on_existing_proposal],
        [Txn.application_args[0] == execute_proposal, execute_approved_proposal],
        [Txn.application_args[0] == get_proposal, get_proposal_details],
        [Txn.application_args[0] == get_voting_results, get_proposal_voting_results],
        [Txn.application_args[0] == delegate_vote, delegate_voting_power],
        [Txn.application_args[0] == update_governance_params, update_governance_parameters],
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def governance_clear_program():
    """Clear state program for governance"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(governance_contract(), Mode.Application, version=8)
    clear_program = compileTeal(governance_clear_program(), Mode.Application, version=8)
    
    print("Governance Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")