// Smart contract ABIs - Algorand Application Binary Interfaces
export const abis = {
  user_identity: {
    // User Identity Contract ABI
    methods: [
      {
        name: 'register_user',
        args: ['string', 'string'], // email, phone
        returns: 'void'
      },
      {
        name: 'add_verification',
        args: ['string', 'string', 'uint64'], // verification_type, hash, timestamp
        returns: 'void'
      },
      {
        name: 'get_user_data',
        args: ['string'], // user_id
        returns: 'string'
      }
    ]
  },
  trust_score: {
    // Trust Score Contract ABI
    methods: [
      {
        name: 'init_score',
        args: ['string'], // user_address
        returns: 'void'
      },
      {
        name: 'update_score',
        args: ['string', 'uint64'], // user_address, new_score
        returns: 'void'
      }
    ]
  },
  smart_wallet: {
    // Smart Wallet Contract ABI
    methods: [
      {
        name: 'create_wallet',
        args: ['uint64', 'uint64', 'uint64'], // guardian_count, threshold, daily_limit
        returns: 'void'
      }
    ]
  }
}
