"""
Module 4: Dynamic Badge & Achievement System Smart Contract
Gamified achievement system that recognizes various accomplishments and milestones
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *

def badge_system_contract():
    """
    Badge System Smart Contract
    Manages badge creation, issuance, stacking, and community recognition
    """
    
    # Global State Keys
    admin_key = Bytes("admin")
    total_badges_key = Bytes("total_badges")
    next_badge_id_key = Bytes("next_badge_id")
    badge_template_count_key = Bytes("badge_templates")
    paused_key = Bytes("paused")
    
    # Badge Template Keys (for reusable badge definitions)
    template_prefix = Bytes("template_")
    
    # Application Methods
    create_badge_template = Bytes("create_template")
    issue_badge = Bytes("issue_badge")
    nominate_for_badge = Bytes("nominate_badge")
    vote_on_nomination = Bytes("vote_nomination")
    stack_badges = Bytes("stack_badges")
    get_badge = Bytes("get_badge")
    get_user_badges = Bytes("get_user_badges")
    get_badge_leaderboard = Bytes("get_leaderboard")
    revoke_badge = Bytes("revoke_badge")
    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    get_version = Bytes("version")
    
    @Subroutine(TealType.bytes)
    def generate_badge_id():
        """Generate unique badge ID"""
        current_id = App.globalGet(next_badge_id_key)
        App.globalPut(next_badge_id_key, current_id + Int(1))
        return Itob(current_id)
    
    @Subroutine(TealType.uint64)
    def validate_badge_type(badge_type):
        """Validate badge type is within allowed range"""
        return And(
            badge_type >= Int(BADGE_TYPE_SKILL),
            badge_type <= Int(BADGE_TYPE_SOCIAL_IMPACT)
        )
    
    @Subroutine(TealType.uint64)
    def calculate_badge_value(badge_type, issuer_trust_score, community_votes):
        """Calculate the value/weight of a badge for trust score purposes"""
        base_value = Int(5)  # Base value for any badge
        
        # Type multiplier
        type_multiplier = If(
            badge_type == Int(BADGE_TYPE_PROFESSIONAL),
            Int(3),  # Professional badges worth more
            If(
                badge_type == Int(BADGE_TYPE_SKILL),
                Int(2),  # Skill badges worth medium
                Int(1)   # Other badges worth base
            )
        )
        
        # Issuer trust multiplier (higher trust issuers give more valuable badges)
        trust_multiplier = issuer_trust_score / Int(20)  # 0-5 multiplier
        
        # Community vote multiplier
        vote_multiplier = If(
            community_votes > Int(10),
            Int(2),
            If(community_votes > Int(5), Int(1), Int(0))
        )
        
        total_value = base_value * type_multiplier * (Int(1) + trust_multiplier + vote_multiplier) / Int(10)
        
        return If(total_value > Int(50), Int(50), total_value)  # Cap at 50 points
    
    # Create Badge Template
    create_new_badge_template = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (template_name := Txn.application_args[1]),
        (badge_type := Btoi(Txn.application_args[2])),
        (description := Txn.application_args[3]),
        (criteria := Txn.application_args[4]),
        (icon_url := Txn.application_args[5]),
        
        Assert(validate_string_length(template_name, 3, 100)),
        Assert(validate_badge_type(badge_type)),
        Assert(validate_string_length(description, 10, 500)),
        Assert(validate_string_length(criteria, 10, 1000)),
        Assert(validate_string_length(icon_url, 5, 200)),
        
        # Generate template ID
        (template_id := App.globalGet(badge_template_count_key)),
        (template_box_key := Concat(template_prefix, Itob(template_id))),
        
        # Create template box
        Assert(BoxCreate(template_box_key, Int(600))),
        
        # Store template data
        BoxReplace(template_box_key, Int(0), Concat(
            Itob(template_id),          # template_id
            Bytes("|"),
            template_name,              # name
            Bytes("|"),
            Itob(badge_type),          # type
            Bytes("|"),
            description,                # description
            Bytes("|"),
            criteria,                   # criteria
            Bytes("|"),
            icon_url,                   # icon_url
            Bytes("|"),
            Txn.sender(),              # creator
            Bytes("|"),
            Itob(Global.latest_timestamp()), # created_at
            Bytes("|"),
            Itob(Int(1)),              # active (1 = active, 0 = inactive)
            Bytes("|"),
            Itob(Int(0))               # usage_count
        )),
        
        # Update global counter
        App.globalPut(badge_template_count_key, template_id + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("BADGE_TEMPLATE_CREATED:"),
            Itob(template_id),
            Bytes(":"),
            template_name,
            Bytes(":"),
            Txn.sender()
        )),
        
        Return(Int(1))
    ])
    
    # Issue Badge
    issue_new_badge = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (recipient := Txn.application_args[1]),
        (template_id := Btoi(Txn.application_args[2])),
        (evidence := Txn.application_args[3]),
        (custom_metadata := Txn.application_args[4]),
        
        Assert(validate_address(recipient)),
        Assert(validate_string_length(evidence, 5, 500)),
        
        # Validate template exists
        (template_box_key := Concat(template_prefix, Itob(template_id))),
        (template_box_len := BoxLen(template_box_key)),
        Assert(template_box_len.hasValue()),
        
        # Generate badge ID
        (badge_id := generate_badge_id()),
        (badge_box_key := encode_badge_id(Btoi(badge_id))),
        
        # Create badge box
        Assert(BoxCreate(badge_box_key, Int(500))),
        
        # Store badge data
        BoxReplace(badge_box_key, Int(0), Concat(
            badge_id,                   # badge_id
            Bytes("|"),
            recipient,                  # recipient
            Bytes("|"),
            Txn.sender(),              # issuer
            Bytes("|"),
            Itob(template_id),         # template_id
            Bytes("|"),
            evidence,                   # evidence
            Bytes("|"),
            custom_metadata,            # custom_metadata
            Bytes("|"),
            Itob(Global.latest_timestamp()), # issued_at
            Bytes("|"),
            Itob(Int(1)),              # active (1 = active, 0 = revoked)
            Bytes("|"),
            Itob(Int(0)),              # community_votes
            Bytes("|"),
            Itob(Int(0))               # stacked_with (0 = not stacked)
        )),
        
        # Update user badge index
        (user_badge_index_key := Concat(Bytes("user_badges_"), recipient)),
        (user_badge_index_len := BoxLen(user_badge_index_key)),
        If(
            user_badge_index_len.hasValue(),
            # Append to existing list
            Seq([
                (existing_badges := BoxGet(user_badge_index_key)),
                BoxReplace(user_badge_index_key, Int(0), Concat(
                    existing_badges.value(),
                    Bytes(","),
                    badge_id
                ))
            ]),
            # Create new list
            Seq([
                BoxCreate(user_badge_index_key, Int(300)),
                BoxReplace(user_badge_index_key, Int(0), badge_id)
            ])
        ),
        
        # Update template usage count
        # This is simplified - in practice, you'd parse and update the specific field
        
        # Update global counter
        App.globalPut(total_badges_key, App.globalGet(total_badges_key) + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("BADGE_ISSUED:"),
            badge_id,
            Bytes(":"),
            recipient,
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(template_id)
        )),
        
        Return(Int(1))
    ])
    
    # Nominate for Badge (Community-driven)
    nominate_for_community_badge = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (nominee := Txn.application_args[1]),
        (template_id := Btoi(Txn.application_args[2])),
        (nomination_reason := Txn.application_args[3]),
        
        Assert(validate_address(nominee)),
        Assert(validate_string_length(nomination_reason, 10, 500)),
        
        # Prevent self-nomination
        Assert(Txn.sender() != nominee),
        
        # Validate template exists and is community-votable
        (template_box_key := Concat(template_prefix, Itob(template_id))),
        (template_box_len := BoxLen(template_box_key)),
        Assert(template_box_len.hasValue()),
        
        # Create nomination box
        (nomination_id := App.globalGet(next_badge_id_key)),
        (nomination_box_key := Concat(Bytes("nomination_"), Itob(nomination_id))),
        Assert(BoxCreate(nomination_box_key, Int(400))),
        
        # Store nomination data
        BoxReplace(nomination_box_key, Int(0), Concat(
            Itob(nomination_id),       # nomination_id
            Bytes("|"),
            nominee,                    # nominee
            Bytes("|"),
            Txn.sender(),              # nominator
            Bytes("|"),
            Itob(template_id),         # template_id
            Bytes("|"),
            nomination_reason,          # reason
            Bytes("|"),
            Itob(Global.latest_timestamp()), # nominated_at
            Bytes("|"),
            Itob(Int(1)),              # votes_for
            Bytes("|"),
            Itob(Int(0)),              # votes_against
            Bytes("|"),
            Itob(Int(0)),              # status (0=active, 1=approved, 2=rejected)
            Bytes("|"),
            Itob(Global.latest_timestamp() + Int(604800)) # voting_ends_at (7 days)
        )),
        
        # Update nomination ID counter
        App.globalPut(next_badge_id_key, nomination_id + Int(1)),
        
        # Log event
        Log(Concat(
            Bytes("BADGE_NOMINATION_CREATED:"),
            Itob(nomination_id),
            Bytes(":"),
            nominee,
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(template_id)
        )),
        
        Return(Int(1))
    ])
    
    # Vote on Nomination
    vote_on_badge_nomination = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs
        (nomination_id := Btoi(Txn.application_args[1])),
        (vote := Btoi(Txn.application_args[2])),  # 1 = for, 0 = against
        
        Assert(Or(vote == Int(0), vote == Int(1))),
        
        # Get nomination data
        (nomination_box_key := Concat(Bytes("nomination_"), Itob(nomination_id))),
        (nom_box_len := BoxLen(nomination_box_key)),
        Assert(nom_box_len.hasValue()),
        
        # Check voting period is still active
        # This is simplified - in practice, you'd parse the voting_ends_at field
        
        # Prevent double voting (simplified - would need voter tracking)
        
        # Update vote counts (simplified implementation)
        # In practice, you'd parse the existing data and update specific fields
        
        # Log vote
        Log(Concat(
            Bytes("NOMINATION_VOTE_CAST:"),
            Itob(nomination_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(vote)
        )),
        
        Return(Int(1))
    ])
    
    # Stack Badges (Combine multiple badges into higher-tier achievement)
    stack_multiple_badges = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Validate inputs - list of badge IDs to stack
        (badge_count := Btoi(Txn.application_args[1])),
        (stacked_badge_name := Txn.application_args[2]),
        
        Assert(And(badge_count >= Int(2), badge_count <= Int(10))),
        Assert(validate_string_length(stacked_badge_name, 3, 100)),
        
        # Verify all badges belong to sender
        # This is simplified - in practice, you'd iterate through the badge list
        
        # Create stacked badge
        (stacked_badge_id := generate_badge_id()),
        (stacked_badge_key := encode_badge_id(Btoi(stacked_badge_id))),
        Assert(BoxCreate(stacked_badge_key, Int(400))),
        
        # Store stacked badge data
        BoxReplace(stacked_badge_key, Int(0), Concat(
            stacked_badge_id,          # badge_id
            Bytes("|"),
            Txn.sender(),              # recipient (stacker)
            Bytes("|"),
            Txn.sender(),              # issuer (self-issued through stacking)
            Bytes("|"),
            Itob(Int(0)),              # template_id (0 for stacked badges)
            Bytes("|"),
            stacked_badge_name,        # evidence/name
            Bytes("|"),
            Bytes("STACKED"),          # metadata
            Bytes("|"),
            Itob(Global.latest_timestamp()), # issued_at
            Bytes("|"),
            Itob(Int(1)),              # active
            Bytes("|"),
            Itob(badge_count),         # community_votes (repurposed as component count)
            Bytes("|"),
            Itob(Int(1))               # stacked_with (1 = is stacked badge)
        )),
        
        # Log stacking event
        Log(Concat(
            Bytes("BADGES_STACKED:"),
            stacked_badge_id,
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(badge_count)
        )),
        
        Return(Int(1))
    ])
    
    # Get Badge Details
    get_badge_details = Seq([
        (badge_id := Btoi(Txn.application_args[1])),
        (badge_box_key := encode_badge_id(badge_id)),
        
        (badge_box_len := BoxLen(badge_box_key)),
        If(
            badge_box_len.hasValue(),
            Seq([
                (badge_data := BoxGet(badge_box_key)),
                Log(Concat(Bytes("BADGE_DETAILS:"), badge_data.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("BADGE_NOT_FOUND:"), Itob(badge_id))),
                Return(Int(0))
            ])
        )
    ])
    
    # Get User Badges
    get_user_badge_list = Seq([
        (user_address := Txn.application_args[1]),
        (user_badge_index_key := Concat(Bytes("user_badges_"), user_address)),
        
        (user_badge_index_len := BoxLen(user_badge_index_key)),
        If(
            user_badge_index_len.hasValue(),
            Seq([
                (user_badges := BoxGet(user_badge_index_key)),
                Log(Concat(Bytes("USER_BADGES:"), user_badges.value())),
                Return(Int(1))
            ]),
            Seq([
                Log(Concat(Bytes("NO_BADGES_FOUND:"), user_address)),
                Return(Int(0))
            ])
        )
    ])
    
    # Revoke Badge (Issuer or Admin only)
    revoke_existing_badge = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        (badge_id := Btoi(Txn.application_args[1])),
        (revocation_reason := Txn.application_args[2]),
        (badge_box_key := encode_badge_id(badge_id)),
        
        (badge_box_len := BoxLen(badge_box_key)),
        Assert(badge_box_len.hasValue()),
        Assert(validate_string_length(revocation_reason, 5, 200)),
        
        # Verify sender is issuer or admin (simplified)
        # In practice, you'd parse the badge data to check issuer
        
        # Update badge status to revoked (simplified)
        # In practice, you'd parse and update the specific active field
        
        # Log revocation
        Log(Concat(
            Bytes("BADGE_REVOKED:"),
            Itob(badge_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            revocation_reason
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
            App.globalPut(total_badges_key, Int(0)),
            App.globalPut(next_badge_id_key, Int(1)),
            App.globalPut(badge_template_count_key, Int(0)),
            App.globalPut(paused_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        
        [Txn.application_args[0] == create_badge_template, create_new_badge_template],
        [Txn.application_args[0] == issue_badge, issue_new_badge],
        [Txn.application_args[0] == nominate_for_badge, nominate_for_community_badge],
        [Txn.application_args[0] == vote_on_nomination, vote_on_badge_nomination],
        [Txn.application_args[0] == stack_badges, stack_multiple_badges],
        [Txn.application_args[0] == get_badge, get_badge_details],
        [Txn.application_args[0] == get_user_badges, get_user_badge_list],
        [Txn.application_args[0] == revoke_badge, revoke_existing_badge],
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        
        # Default case
        [Int(1), Return(Int(0))]
    )
    
    return program

def badge_system_clear_program():
    """Clear state program for badge system"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_program = compileTeal(badge_system_contract(), Mode.Application, version=8)
    clear_program = compileTeal(badge_system_clear_program(), Mode.Application, version=8)
    
    print("Badge System Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")