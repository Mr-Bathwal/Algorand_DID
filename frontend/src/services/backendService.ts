// Backend service for handling session-based authentication and smart contract interactions
import axios from 'axios';

export interface BackendConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface GoogleAuthResponse {
  sessionToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  algorandAccount: {
    address: string;
    encryptedPrivateKey: string;
  };
}

export interface SessionInfo {
  sessionToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  algorandAccount: {
    address: string;
  };
}

export interface TransactionRequest {
  method: string;
  appId?: number;
  params: any[];
  boxes?: { name: string }[];
  sessionToken: string;
  walletAddress?: string;
}

export interface TransactionResponse {
  transactionId?: string;
  success: boolean;
  error?: string;
  data?: any;
}

class BackendService {
  private config: BackendConfig;
  private sessionToken: string | null = null;

  constructor(config: BackendConfig) {
    this.config = config;
    this.setupAxios();
  }

  private setupAxios() {
    axios.defaults.baseURL = this.config.baseUrl;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    
    if (this.config.apiKey) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Add request interceptor to include session token
    axios.interceptors.request.use((config) => {
      if (this.sessionToken) {
        config.headers['X-Session-Token'] = this.sessionToken;
      }
      return config;
    });

    // Add response interceptor to handle session expiration
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearSession();
          // Redirect to login or show auth modal
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Exchange Google OAuth code for session token
   */
  async exchangeGoogleCode(code: string): Promise<GoogleAuthResponse> {
    try {
      const response = await axios.post('/auth/google', {
        code,
        redirectUri: window.location.origin + '/auth/callback'
      });

      const authResponse: GoogleAuthResponse = response.data;
      this.sessionToken = authResponse.sessionToken;
      
      // Store session in localStorage for persistence
      localStorage.setItem('sessionToken', authResponse.sessionToken);
      localStorage.setItem('userInfo', JSON.stringify(authResponse.user));
      localStorage.setItem('algorandAccount', JSON.stringify(authResponse.algorandAccount));

      return authResponse;
    } catch (error: any) {
      console.error('Failed to exchange Google code:', error);
      throw new Error(error.response?.data?.message || 'Authentication failed');
    }
  }

  /**
   * Verify ID token and create session
   */
  async verifyIdToken(idToken: string): Promise<GoogleAuthResponse> {
    try {
      const response = await axios.post('/auth/verify-token', {
        idToken
      });

      const authResponse: GoogleAuthResponse = response.data;
      this.sessionToken = authResponse.sessionToken;
      
      // Store session in localStorage for persistence
      localStorage.setItem('sessionToken', authResponse.sessionToken);
      localStorage.setItem('userInfo', JSON.stringify(authResponse.user));
      localStorage.setItem('algorandAccount', JSON.stringify(authResponse.algorandAccount));

      return authResponse;
    } catch (error: any) {
      console.error('Failed to verify ID token:', error);
      throw new Error(error.response?.data?.message || 'Token verification failed');
    }
  }

  /**
   * Get current session info
   */
  async getSessionInfo(): Promise<SessionInfo | null> {
    if (!this.sessionToken) {
      return null;
    }

    try {
      const response = await axios.get('/auth/session');
      return response.data;
    } catch (error) {
      console.error('Failed to get session info:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Register user with smart contract using UserIdentity.registerUser
   * Matches: registerUser(sender: string, email: string, phone: string)
   */
  async registerUser(email: string, phone: string, walletAddress?: string): Promise<TransactionResponse> {
    try {
      console.log('Registering user with smart contract:', { email, phone, walletAddress })

      const result = await this.submitTransaction({
        method: 'register_user',
        appId: 745680430, // user_identity app_id from contractsSdk.ts
        params: ['register_user', email, phone],
        sessionToken: this.getSessionToken() || '',
        walletAddress: walletAddress // Include wallet address for backend
      })

      return result
    } catch (error: any) {
      console.error('User registration error:', error)
      throw error
    }
  }

  /**
   * Mark verification as completed (tick checklist) - NO HASHES TO SMART CONTRACT
   * Smart contract only stores boolean verification status, not data
   */
  async markVerificationComplete(targetUser: string, verificationType: number, verifierId: number): Promise<TransactionResponse> {
    try {
      console.log('Marking verification complete:', { targetUser, verificationType, verifierId })

      const result = await this.submitTransaction({
        method: 'add_verification',
        appId: 745680430, // user_identity app_id
        params: ['add_verification', targetUser, verificationType, verifierId, 'verified'], // Correct parameter order
        boxes: [{ name: `user_${targetUser}` }],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Mark verification error:', error)
      throw error
    }
  }

  /**
   * Create smart wallet with guardians and recovery
   */
  async createSmartWallet(guardianCount: number, threshold: number, dailyLimitMicroAlgos: number): Promise<TransactionResponse> {
    try {
      console.log('Creating smart wallet:', { guardianCount, threshold, dailyLimitMicroAlgos })

      const result = await this.submitTransaction({
        method: 'create_wallet',
        appId: 745680538, // smart_wallet app_id
        params: ['create_wallet', guardianCount, threshold, dailyLimitMicroAlgos],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Smart wallet creation error:', error)
      throw error
    }
  }

  /**
   * Initialize trust score for user
   */
  async initializeTrustScore(userAddress: string): Promise<TransactionResponse> {
    try {
      console.log('Initializing trust score:', { userAddress })

      const result = await this.submitTransaction({
        method: 'init_score',
        appId: 745680432, // trust_score app_id
        params: ['init_score', userAddress],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Trust score initialization error:', error)
      throw error
    }
  }

  /**
   * Update trust score for user
   */
  async updateTrustScore(userAddress: string, newScore: number): Promise<TransactionResponse> {
    try {
      console.log('Updating trust score:', { userAddress, newScore })

      const result = await this.submitTransaction({
        method: 'update_score',
        appId: 745680432, // trust_score app_id
        params: ['update_score', userAddress, newScore],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Trust score update error:', error)
      throw error
    }
  }

  /**
   * Issue certificate to user
   */
  async issueCertificate(
    recipientAddr: string,
    certType: string,
    certName: string,
    courseDetails: string,
    gradeInfo: string,
    issueDateUnix: number,
    expiryDateUnix: number
  ): Promise<TransactionResponse> {
    try {
      console.log('Issuing certificate:', { recipientAddr, certName })

      const result = await this.submitTransaction({
        method: 'issue_cert',
        appId: 745680498, // certificate_management app_id
        params: ['issue_cert', recipientAddr, certType, certName, courseDetails, gradeInfo, issueDateUnix, expiryDateUnix],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Certificate issuance error:', error)
      throw error
    }
  }

  /**
   * Create sponsored transaction group (gasless)
   */
  async createSponsoredTransaction(targetAppId: number, targetArgs: any[]): Promise<TransactionResponse> {
    try {
      console.log('Creating sponsored transaction:', { targetAppId, targetArgs })

      const result = await this.submitTransaction({
        method: 'sponsor',
        appId: 745692491, // paymaster app_id
        params: ['sponsor', targetAppId, 3000], // 3000 microALGO flat fee
        boxes: [{ name: `wl_${targetAppId}` }],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Sponsored transaction error:', error)
      throw error
    }
  }

  /**
   * Store verification data in IPFS (hashes and actual data)
   */
  async storeVerificationInIPFS(verificationData: any, ipfsHash: string): Promise<TransactionResponse> {
    try {
      console.log('Storing verification in IPFS:', { ipfsHash })

      // This just confirms IPFS storage - no smart contract call needed
      return {
        success: true,
        data: { ipfsHash },
        transactionId: `ipfs_${Date.now()}`
      }
    } catch (error: any) {
      console.error('IPFS storage error:', error)
      throw error
    }
  }

  /**
   * Get user profile from smart contract
   */
  async getUserProfile(userAddress: string): Promise<TransactionResponse> {
    try {
      console.log('Getting user profile:', { userAddress })

      const result = await this.submitTransaction({
        method: 'get_user_profile',
        appId: 745680430, // user_identity app_id
        params: ['get_user_profile', userAddress],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Get user profile error:', error)
      throw error
    }
  }

  /**
   * Get trust score from smart contract
   */
  async getTrustScore(userAddress: string): Promise<TransactionResponse> {
    try {
      console.log('Getting trust score:', { userAddress })

      const result = await this.submitTransaction({
        method: 'get_score',
        appId: 745680432, // trust_score app_id
        params: ['get_score', userAddress],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Get trust score error:', error)
      throw error
    }
  }

  /**
   * Get smart wallet info
   */
  async getWalletInfo(userAddress: string): Promise<TransactionResponse> {
    try {
      console.log('Getting wallet info:', { userAddress })

      const result = await this.submitTransaction({
        method: 'get_wallet_info',
        appId: 745680538, // smart_wallet app_id
        params: ['get_wallet_info', userAddress],
        sessionToken: this.getSessionToken() || ''
      })

      return result
    } catch (error: any) {
      console.error('Get wallet info error:', error)
      throw error
    }
  }


  /**
   * Submit transaction to backend for signing and execution
   */
  async submitTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      const response = await axios.post('/blockchain/execute', request);
      return response.data;
    } catch (error: any) {
      console.error('Failed to submit transaction:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Transaction failed'
      };
    }
  }

  /**
   * Get user's Algorand account info
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await axios.get('/blockchain/account');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get account info:', error);
      throw new Error(error.response?.data?.message || 'Failed to get account info');
    }
  }

  /**
   * Get user's verification status
   */
  async getVerificationStatus(): Promise<any> {
    try {
      const response = await axios.get('/verification/status');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get verification status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get verification status');
    }
  }

  /**
   * Submit verification data
   */
  async submitVerification(data: any): Promise<any> {
    try {
      const response = await axios.post('/verification/submit', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to submit verification:', error);
      throw new Error(error.response?.data?.message || 'Verification submission failed');
    }
  }

  /**
   * Get user's certificates
   */
  async getUserCertificates(): Promise<any> {
    try {
      const response = await axios.get('/certificates/user');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get certificates:', error);
      throw new Error(error.response?.data?.message || 'Failed to get certificates');
    }
  }

  /**
   * Get user's badges
   */
  async getUserBadges(): Promise<any> {
    try {
      const response = await axios.get('/badges/user');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get badges:', error);
      throw new Error(error.response?.data?.message || 'Failed to get badges');
    }
  }

  /**
   * Get user's trust score
   */
  async getTrustScore(): Promise<any> {
    try {
      const response = await axios.get('/trust-score');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get trust score:', error);
      throw new Error(error.response?.data?.message || 'Failed to get trust score');
    }
  }

  /**
   * Initialize session from stored data
   */
  initializeSession(): boolean {
    const storedToken = localStorage.getItem('sessionToken');
    const storedUser = localStorage.getItem('userInfo');
    const storedAccount = localStorage.getItem('algorandAccount');

    if (storedToken && storedUser && storedAccount) {
      this.sessionToken = storedToken;
      return true;
    }

    return false;
  }

  /**
   * Clear session and logout
   */
  async logout(): Promise<void> {
    try {
      if (this.sessionToken) {
        await axios.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  private clearSession(): void {
    this.sessionToken = null;
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('algorandAccount');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  /**
   * Get stored user info
   */
  getStoredUserInfo(): any | null {
    const stored = localStorage.getItem('userInfo');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Get stored Algorand account
   */
  getStoredAlgorandAccount(): any | null {
    const stored = localStorage.getItem('algorandAccount');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Get current session token
   */
  getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Submit OpenCV + TensorFlow liveness verification to smart contract
   */
  async submitOpenCVLivenessVerification(data: {
    livenessLabel: 'real' | 'fake'
    confidence: number
    faceHash: string
    faceBox: [number, number, number, number]
    timestamp: number
    userId: string
    detectionMethod: string
  }): Promise<TransactionResponse> {
    try {
      console.log('Submitting OpenCV liveness verification to smart contract...', {
        livenessLabel: data.livenessLabel,
        confidence: data.confidence,
        detectionMethod: data.detectionMethod
      })

      const result = await this.submitTransaction('verifyOpenCVLiveness', [
        data.livenessLabel,
        data.confidence,
        data.faceHash,
        data.faceBox,
        data.timestamp,
        data.userId,
        data.detectionMethod
      ])

      return result
    } catch (error: any) {
      console.error('❌ OpenCV liveness verification submission error:', error)
      throw error
    }
  }
}

// Create singleton instance
const backendConfig: BackendConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  apiKey: import.meta.env.VITE_BACKEND_API_KEY
};

export const backendService = new BackendService(backendConfig);

// Initialize session on app start
backendService.initializeSession();
