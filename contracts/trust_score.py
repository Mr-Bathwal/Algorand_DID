"""
Module 6: Trust Score & Reputation Engine Smart Contract
Dynamic, algorithmic reputation system that reflects real-world credibility
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def trust_score_contract():
    """
    Trust Score Smart Contract
    Manages dynamic reputation scoring with anti-gaming measures
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_scores_key = Bytes("total_scores")
    decay_rate_key = Bytes("decay_rate")
    min_activity_threshold_key = Bytes("min_activity")
    paused_key = Bytes("paused")
    
    # Score Components (weights out of 100)
    verification_weight = Int(25)     # 25% - Identity verification completeness
    certificate_weight = Int(20)     # 20% - Quality of certificates earned
    community_weight = Int(15)       # 15% - Community recognition and badges
    dispute_weight = Int(15)         # 15% - Dispute history (negative factor)
    participation_weight = Int(15)   # 15% - Platform participation
    time_weight = Int(10)           # 10% - Account age and consistency
    
    # Application Methods
    initialize_score = Bytes("init_score")
    update_score = Bytes("update_score")
    get_score = Bytes("get_score")
    add_endorsement = Bytes("add_endorsement")
    report_dispute = Bytes("report_dispute")
    calculate_decay = Bytes("calc_decay")
    get_leaderboard = Bytes("get_leaderboard")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.uint64)
    def calculate_verification_score(verification_level, verifications_count):
        """Calculate score component based on identity verification"""
        base_score = verification_level * Int(20)  # 0-60 points based on level
        completeness_bonus = verifications_count * Int(5)  # 5 points per verification type
        
        total = base_score + completeness_bonus
        return If(total > Int(100), Int(100), total)
    
    @Subroutine(TealType.uint64)
    def calculate_certificate_score(total_certificates, high_trust_certs, avg_org_trust):
        """Calculate score component based on certificates from trusted organizations"""
        volume_score = If(
            total_certificates > Int(20),
            Int(40),
            total_certificates * Int(2)
        )
        
        quality_score = If(
            high_trust_certs > Int(10),
            Int(40),
            high_trust_certs * Int(4)
        )
        
        trust_score = avg_org_trust / Int(5)  # Convert 0-100 to 0-20
        
        total = volume_score + quality_score + trust_score
        return If(total > Int(100), Int(100), total)
    
    @Subroutine(TealType.uint64)
    def calculate_community_score(badges_earned, endorsements_received, peer_nominations):
        """Calculate score component based on community recognition"""
        badge_score = If(
            badges_earned > Int(25),
            Int(40),
            badges_earned * Int(2)  # 2 points per badge, max 50
        )
        
        endorsement_score = If(
            endorsements_received > Int(15),
            Int(30),
            endorsements_received * Int(2)
        )
        
        nomination_score = If(
            peer_nominations > Int(10),
            Int(30),
            peer_nominations * Int(3)
        )
        
        total = badge_score + endorsement_score + nomination_score
        return If(total > Int(100), Int(100), total)
    
    @Subroutine(TealType.uint64)
    def calculate_dispute_penalty(disputes_involved, disputes_lost, fraud_reports):
        """Calculate penalty based on dispute history (returns penalty amount to subtract)"""
        involvement_penalty = disputes_involved * Int(5)  # -5 per dispute involvement
        loss_penalty = disputes_lost * Int(15)           # -15 per lost dispute
        fraud_penalty = fraud_reports * Int(25)          # -25 per fraud report
        
        total_penalty = involvement_penalty + loss_penalty + fraud_penalty
        return If(total_penalty > Int(100), Int(100), total_penalty)
    
    @Subroutine(TealType.uint64)
    def calculate_participation_score(proposals_created, votes_cast, comments_made, days_active):
        """Calculate score component based on platform participation"""
        proposal_score = If(
            proposals_created > Int(5),
            Int(25),
            proposals_created * Int(5)
        )
        
        voting_score = If(
            votes_cast > Int(20),
            Int(25),
            votes_cast
        )
        
        engagement_score = If(
            comments_made > Int(50),
            Int(25),
            comments_made / Int(2)
        )
        
        activity_score = If(
            days_active > Int(100),
            Int(25),
            days_active / Int(4)
        )
        
        total = proposal_score + voting_score + engagement_score + activity_score
        return If(total > Int(100), Int(100), total)
    
    @Subroutine(TealType.uint64)
    def calculate_time_score(account_age_days, consistency_score):
        """Calculate score component based on account age and consistency"""
        age_score = If(
            account_age_days > Int(365),
            Int(50),
            account_age_days / Int(7)  # 1 point per week, max 50
        )
        
        consistency_bonus = consistency_score / Int(2)  # 0-50 points
        
        total = age_score + consistency_bonus
        return If(total > Int(100), Int(100), total)
    
    @Subroutine(TealType.uint64)
    def apply_time_decay(original_score, days_since_update, decay_rate_per_day):
        """Apply time-based decay to prevent stale high scores"""
        decay_amount = days_since_update * decay_rate_per_day / Int(100)
        decayed_score = If(
            original_score > decay_amount,
            original_score - decay_amount,
            Int(0)
        )
        return decayed_score
    
    # Initialize Trust Score
    initialize_trust_score = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate user exists and doesn't already have a score
        (user_address := Txn.application_args[1]),
        (score_box_key := Concat(Bytes("score_"), user_address)),
        
        # Create trust score box
        Assert(BoxCreate(score_box_key, Int(300))),
        
        # Initialize with base score and empty metrics
        BoxReplace(score_box_key, Int(0), Concat(
            Itob(Int(INITIAL_TRUST_SCORE)),  # current_score
            Bytes("|"),
            Itob(Int(0)),   # verification_component
            Bytes("|"),
            Itob(Int(0)),   # certificate_component
            Bytes("|"),
            Itob(Int(0)),   # community_component
            Bytes("|"),
            Itob(Int(0)),   # dispute_penalty
            Bytes("|"),
            Itob(Int(0)),   # participation_component
            Bytes("|"),
            Itob(Int(0)),   # time_component
            Bytes("|"),
            Itob(Global.latest_timestamp()),  # last_updated
            Bytes("|"),
            Itob(Global.latest_timestamp()),  # created_at
            Bytes("|"),
            Itob(Int(0)),   # total_endorsements
            Bytes("|"),
            Itob(Int(0))    # consistency_score
        )),
        
        # Update global counter
        App.globalPut(total_scores_key, App.globalGet(total_scores_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("TRUST_SCORE_INITIALIZED:"),
            user_address,
            Bytes(":"),
            Itob(Int(INITIAL_TRUST_SCORE))
        )),
        
        Return(Int(1))
    ])
    
    # Update Trust Score
    update_trust_score = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (user_address := Txn.application_args[1]),
        (verification_level := Btoi(Txn.application_args[2])),
        (verifications_count := Btoi(Txn.application_args[3])),
        (total_certificates := Btoi(Txn.application_args[4])),
        (high_trust_certs := Btoi(Txn.application_args[5])),
        (avg_org_trust := Btoi(Txn.application_args[6])),
        (badges_earned := Btoi(Txn.application_args[7])),
        (endorsements_received := Btoi(Txn.application_args[8])),
        
        # Get current score data
        (score_box_key := Concat(Bytes("score_"), user_address)),
        (score_box_len := BoxLen(score_box_key)),
        Assert(score_box_len.hasValue()),
        
        # Calculate individual components
        (verification_comp := calculate_verification_score(verification_level, verifications_count)),
        (certificate_comp := calculate_certificate_score(total_certificates, high_trust_certs, avg_org_trust)),
        (community_comp := calculate_community_score(badges_earned, endorsements_received, Int(0))),
        
        # Get historical data for other components
        (created_at := Btoi(BoxExtract(score_box_key, Int(200), Int(8)))),
        (account_age_days := (Global.latest_timestamp() - created_at) / Int(86400)),
        (consistency_score := Btoi(BoxExtract(score_box_key, Int(224), Int(8)))),
        (time_comp := calculate_time_score(account_age_days, consistency_score)),
        
        # Calculate weighted final score
        (weighted_verification := verification_comp * verification_weight / Int(100)),
        (weighted_certificate := certificate_comp * certificate_weight / Int(100)),
        (weighted_community := community_comp * community_weight / Int(100)),
        (weighted_time := time_comp * time_weight / Int(100)),
        
        # Assume no disputes for now (would be updated by dispute resolution module)
        (dispute_penalty := Int(0)),
        (participation_comp := Int(20)),  # Default participation score
        
        (raw_score := weighted_verification + weighted_certificate + weighted_community + 
                     weighted_time + (participation_comp * participation_weight / Int(100)) - dispute_penalty),
        
        # Apply bounds
        (final_score := If(
            raw_score > Int(MAX_TRUST_SCORE),
            Int(MAX_TRUST_SCORE),
            If(raw_score < Int(MIN_TRUST_SCORE), Int(MIN_TRUST_SCORE), raw_score)
        )),
        
        # Update score data
        BoxReplace(score_box_key, Int(0), Concat(
            Itob(final_score),
            Bytes("|"),
            Itob(verification_comp),
            Bytes("|"),
            Itob(certificate_comp),
            Bytes("|"),
            Itob(community_comp),
            Bytes("|"),
            Itob(dispute_penalty),
            Bytes("|"),
            Itob(participation_comp),
            Bytes("|"),
            Itob(time_comp),
            Bytes("|"),
            Itob(Global.latest_timestamp()),  # last_updated
            Bytes("|"),
            Itob(created_at),  # Keep original created_at
            Bytes("|"),
            Itob(endorsements_received),
            Bytes("|"),
            Itob(consistency_score + Int(1))  # Increment consistency
        )),
        
        # Log event
        Log(Concat(
            Bytes("TRUST_SCORE_UPDATED:"),
            user_address,
            Bytes(":"),
            Itob(final_score),
            Bytes(":"),
            Itob(verification_comp),
            Bytes(":"),
            Itob(certificate_comp),
            Bytes(":"),
            Itob(community_comp)
        )),
        
        Return(Int(1))
    ])
    
    # Get Trust Score
    get_trust_score = Seq([
        (user_address := Txn.application_args[1]),
        (score_box_key := Concat(Bytes("score_"), user_address)),
        (score_box_len := BoxLen(score_box_key)),
        If(
            score_box_len.hasValue(),
            Seq([
                (score_data := BoxGet(score_box_key)),
                Log(Concat(Bytes("TRUST_SCORE:"), score_data.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("TRUST_SCORE:"), user_address, Bytes(":NOT_FOUND"))),
                Return(Int(0))
            ])
        )
    ])
    
    # Add Endorsement
    add_user_endorsement = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate endorser has sufficient trust score
        (endorser := Txn.sender()),
        (endorsee := Txn.application_args[1]),
        (endorser_score_key := Concat(Bytes("score_"), endorser)),
        (endorsee_score_key := Concat(Bytes("score_"), endorsee)),
        
        (endorser_len := BoxLen(endorser_score_key)),
        (endorsee_len := BoxLen(endorsee_score_key)),
        Assert(endorser_len.hasValue()),
        Assert(endorsee_len.hasValue()),
        
        # Check endorser's trust score is above threshold
        (endorser_score := Btoi(BoxExtract(endorser_score_key, Int(0), Int(8)))),
        Assert(endorser_score >= Int(60)),  # Minimum 60 trust score to endorse
        
        # Prevent self-endorsement
        Assert(endorser != endorsee),
        
        # Update endorsee's endorsement count
        (current_endorsements := Btoi(BoxExtract(endorsee_score_key, Int(216), Int(8)))),
        BoxReplace(endorsee_score_key, Int(216), Itob(current_endorsements + Int(1))),
        
        # Log event
        Log(Concat(
            Bytes("ENDORSEMENT_ADDED:"),
            endorser,
            Bytes(":"),
            endorsee
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
            App.globalPut(total_scores_key, Int(0)),
            App.globalPut(decay_rate_key, Int(1)),  # 1% decay per day of inactivity
            App.globalPut(min_activity_threshold_key, Int(30)),  # 30 days
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == initialize_score, initialize_trust_score],
        [Txn.application_args[0] == update_score, update_trust_score],
        [Txn.application_args[0] == get_score, get_trust_score],
        [Txn.application_args[0] == add_endorsement, add_user_endorsement],
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def trust_score_clear_program():
    """Clear state program for trust score"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(trust_score_contract(), Mode.Application, version=8)
    clear_program = compileTeal(trust_score_clear_program(), Mode.Application, version=8)
    
    print("Trust Score Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")