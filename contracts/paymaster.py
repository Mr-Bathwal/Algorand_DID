"""
Paymaster contract to sponsor fees for grouped transactions.
Policy: whitelist target app IDs and (optionally) method names. Enforce 2-txn group.
Txn 0: Sponsor calls paymaster.sponsor with flat fee to cover group
Txn 1: User calls target app with fee = 0
"""

from pyteal import *
import sys
sys.path.append('../utils')
from constants import *
from common import *


def paymaster_contract():
    # Global keys
    admin_key = Bytes("admin")
    paused_key = Bytes("paused")
    whitelist_count_key = Bytes("wl_count")
    # whitelist entries stored as boxes: key = b"wl_" + Itob(app_id) -> methods CSV (optional)

    set_admin = Bytes("set_admin")
    pause = Bytes("pause")
    unpause = Bytes("unpause")
    sponsor = Bytes("sponsor")
    add_whitelist = Bytes("add_wl")
    remove_whitelist = Bytes("rm_wl")
    get_version = Bytes("version")

    # Scratch variables
    target_app_u64 = ScratchVar(TealType.uint64)
    methods_bytes = ScratchVar(TealType.bytes)
    key_bytes = ScratchVar(TealType.bytes)

    # no subroutines using MaybeValues; handle BoxLen inline in Seq blocks

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

    add_whitelist_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        target_app_u64.store(Btoi(Txn.application_args[1])),
        methods_bytes.store(Txn.application_args[2]),  # optional CSV of method names; can be empty
        key_bytes.store(Concat(Bytes("wl_"), Itob(target_app_u64.load()))),
        (len_maybe := BoxLen(key_bytes.load())),
        len_maybe,
        If(
            Not(len_maybe.hasValue()),
            Seq([
                App.globalPut(whitelist_count_key, App.globalGet(whitelist_count_key) + Int(1)),
                Assert(BoxCreate(key_bytes.load(), Int(200)))
            ])
        ),
        BoxReplace(key_bytes.load(), Int(0), methods_bytes.load()),
        Log(Concat(Bytes("WL_ADDED:"), Itob(target_app_u64.load()))),
        Return(Int(1))
    ])

    remove_whitelist_fn = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        target_app_u64.store(Btoi(Txn.application_args[1])),
        key_bytes.store(Concat(Bytes("wl_"), Itob(target_app_u64.load()))),
        (len_maybe2 := BoxLen(key_bytes.load())),
        len_maybe2,
        If(len_maybe2.hasValue(), BoxReplace(key_bytes.load(), Int(0), Bytes(""))),
        Log(Concat(Bytes("WL_REMOVED:"), Itob(target_app_u64.load()))),
        Return(Int(1))
    ])

    version_fn = Seq([
        Log(Concat(Bytes("VERSION:"), Bytes(PLATFORM_VERSION))),
        Return(Int(1))
    ])

    # Core: Sponsor policy
    sponsor_fn = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        # Enforce exactly 2 txns in group: Txn 0 = sponsor (this), Txn 1 = target app call
        Assert(Global.group_size() == Int(2)),
        Assert(Txn.group_index() == Int(0)),
        # Validate target is app call and whitelisted
        Assert(Gtxn[1].type_enum() == TxnType.ApplicationCall),
        target_app_u64.store(Gtxn[1].application_id()),
        key_bytes.store(Concat(Bytes("wl_"), Itob(target_app_u64.load()))),
        (len_maybe3 := BoxLen(key_bytes.load())),
        len_maybe3,
        Assert(len_maybe3.hasValue()),
        # Ensure target fee is zero so sponsor covers fees
        Assert(Gtxn[1].fee() == Int(0)),
        # Ensure this tx fee is large enough - cannot read min fee directly; require >= 2000 microAlgos
        Assert(Txn.fee() >= Int(2000)),
        Log(Concat(Bytes("SPONSORED:"), Itob(target_app_u64.load()))),
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), Seq([
            App.globalPut(admin_key, Txn.sender()),
            App.globalPut(paused_key, Int(0)),
            App.globalPut(whitelist_count_key, Int(0)),
            Return(Int(1))
        ])],
        [Txn.application_args.length() == Int(0), Return(Int(0))],
        [Txn.application_args[0] == sponsor, sponsor_fn],
        [Txn.application_args[0] == add_whitelist, add_whitelist_fn],
        [Txn.application_args[0] == remove_whitelist, remove_whitelist_fn],
        [Txn.application_args[0] == set_admin, set_admin_fn],
        [Txn.application_args[0] == pause, pause_fn],
        [Txn.application_args[0] == unpause, unpause_fn],
        [Txn.application_args[0] == get_version, version_fn],
        [Int(1), Return(Int(0))]
    )

    return program


def paymaster_clear_program():
    return Return(Int(1))


if __name__ == "__main__":
    approval_program = compileTeal(paymaster_contract(), Mode.Application, version=8)
    clear_program = compileTeal(paymaster_clear_program(), Mode.Application, version=8)
    print("Paymaster Contract compiled successfully!")
    print(f"Approval Program: {len(approval_program)} bytes")
    print(f"Clear Program: {len(clear_program)} bytes")


