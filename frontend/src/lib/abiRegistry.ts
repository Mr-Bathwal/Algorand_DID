// ABI Registry for smart contract interactions
export const abiRegistry = {
  user_identity: {
    methods: {
      register_user: {
        name: 'register_user',
        args: ['string', 'string'], // email, phone
        returns: 'void'
      },
      add_verification: {
        name: 'add_verification',
        args: ['string', 'uint64', 'uint64', 'string'], // targetUser, verificationType, verifierId, verificationData
        returns: 'void'
      },
      get_user_profile: {
        name: 'get_user_profile',
        args: ['string'], // targetUser
        returns: 'string'
      }
    }
  },
  trust_score: {
    methods: {
      init_score: {
        name: 'init_score',
        args: ['string'], // user_address
        returns: 'void'
      },
      update_score: {
        name: 'update_score',
        args: ['string', 'uint64'], // user_address, new_score
        returns: 'void'
      }
    }
  },
  smart_wallet: {
    methods: {
      create_wallet: {
        name: 'create_wallet',
        args: ['uint64', 'uint64', 'uint64'], // guardian_count, threshold, daily_limit
        returns: 'void'
      }
    }
  }
}

export default abiRegistry
