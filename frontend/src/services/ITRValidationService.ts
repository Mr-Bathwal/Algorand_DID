import { ITRExtractedData } from './ITRDataExtractionService'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  field: string
  formattedValue?: string
}

export interface CompleteValidationResult {
  isCompletelyValid: boolean
  validFieldCount: number
  totalFieldCount: number
  validationScore: number
  fieldResults: { [key: string]: ValidationResult }
  criticalErrors: string[]
  suggestions: string[]
}

/**
 * ITR Field Validation Service
 * Provides comprehensive validation for all ITR fields with detailed error messages
 */
export class ITRValidationService {
  private static instance: ITRValidationService

  // Critical fields that must be valid for government verification
  private static readonly CRITICAL_FIELDS = [
    'pan', 'ackNumber', 'assessmentYear', 'applicantName', 'annualCertifiedIncome'
  ]

  // Optional but recommended fields
  private static readonly RECOMMENDED_FIELDS = [
    'filingDate', 'emailId', 'mobileNumber', 'itrForm'
  ]

  // Assessment year ranges (current and past valid years)
  private static readonly VALID_ASSESSMENT_YEARS = (() => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 10; i++) {
      const year = currentYear - i
      years.push(`${year}-${(year + 1).toString().slice(2)}`)
      years.push(`${year}-${year + 1}`)
    }
    return years
  })()

  // Valid ITR forms
  private static readonly VALID_ITR_FORMS = [
    'ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'
  ]

  // Indian state codes for address validation
  private static readonly INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Dadra and Nagar Haveli',
    'Daman and Diu', 'Lakshadweep', 'Puducherry'
  ]

  public static getInstance(): ITRValidationService {
    if (!ITRValidationService.instance) {
      ITRValidationService.instance = new ITRValidationService()
    }
    return ITRValidationService.instance
  }

  /**
   * Validate complete ITR data
   */
  public validateCompleteData(data: Partial<ITRExtractedData>): CompleteValidationResult {
    const fieldResults: { [key: string]: ValidationResult } = {}
    const criticalErrors: string[] = []
    const suggestions: string[] = []

    // Validate each field
    const fields = [
      'pan', 'ackNumber', 'assessmentYear', 'applicantName', 'annualCertifiedIncome',
      'filingDate', 'emailId', 'mobileNumber', 'address', 'bankAccountNumber',
      'ifscCode', 'taxableIncome', 'totalTax', 'refundAmount', 'itrForm'
    ]

    fields.forEach(field => {
      const value = data[field as keyof ITRExtractedData]
      if (value !== undefined && value !== null && value !== '') {
        fieldResults[field] = this.validateField(field, value as string)
        
        // Collect critical errors
        if (ITRValidationService.CRITICAL_FIELDS.includes(field) && !fieldResults[field].isValid) {
          criticalErrors.push(...fieldResults[field].errors)
        }
      } else if (ITRValidationService.CRITICAL_FIELDS.includes(field)) {
        fieldResults[field] = {
          isValid: false,
          errors: [`${this.getFieldDisplayName(field)} is required`],
          warnings: [],
          field
        }
        criticalErrors.push(`${this.getFieldDisplayName(field)} is required`)
      }
    })

    // Generate suggestions
    suggestions.push(...this.generateSuggestions(data, fieldResults))

    // Calculate validation metrics
    const validFields = Object.values(fieldResults).filter(r => r.isValid).length
    const totalFields = Object.keys(fieldResults).length
    const validationScore = totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0
    const isCompletelyValid = criticalErrors.length === 0

    return {
      isCompletelyValid,
      validFieldCount: validFields,
      totalFieldCount: totalFields,
      validationScore,
      fieldResults,
      criticalErrors,
      suggestions
    }
  }

  /**
   * Validate individual field
   */
  public validateField(fieldName: string, value: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: fieldName,
      formattedValue: value
    }

    if (!value || value.trim() === '') {
      result.isValid = false
      result.errors.push(`${this.getFieldDisplayName(fieldName)} cannot be empty`)
      return result
    }

    switch (fieldName) {
      case 'pan':
        return this.validatePAN(value)
      case 'ackNumber':
        return this.validateAckNumber(value)
      case 'assessmentYear':
        return this.validateAssessmentYear(value)
      case 'applicantName':
        return this.validateApplicantName(value)
      case 'annualCertifiedIncome':
      case 'taxableIncome':
      case 'totalTax':
      case 'refundAmount':
        return this.validateCurrency(fieldName, value)
      case 'filingDate':
        return this.validateDate(fieldName, value)
      case 'emailId':
        return this.validateEmail(value)
      case 'mobileNumber':
        return this.validateMobileNumber(value)
      case 'address':
        return this.validateAddress(value)
      case 'bankAccountNumber':
        return this.validateBankAccount(value)
      case 'ifscCode':
        return this.validateIFSC(value)
      case 'itrForm':
        return this.validateITRForm(value)
      default:
        return this.validateGenericText(fieldName, value)
    }
  }

  /**
   * Validate PAN format
   */
  private validatePAN(pan: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'pan',
      formattedValue: pan.toUpperCase().trim()
    }

    const cleanPAN = pan.toUpperCase().replace(/[^A-Z0-9]/g, '')
    result.formattedValue = cleanPAN

    // Check format: ABCDE1234F
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPAN)) {
      result.isValid = false
      result.errors.push('PAN must be in format: ABCDE1234F (5 letters, 4 numbers, 1 letter)')
    }

    // Check for valid letter combinations
    if (cleanPAN.length === 10) {
      const firstLetter = cleanPAN[3]
      if (firstLetter === 'O' || firstLetter === 'I') {
        result.warnings.push('PAN contains potentially ambiguous characters (O/I)')
      }
    }

    return result
  }

  /**
   * Validate acknowledgment number
   */
  private validateAckNumber(ackNumber: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'ackNumber',
      formattedValue: ackNumber.replace(/\D/g, '')
    }

    const cleanAck = ackNumber.replace(/\D/g, '')
    result.formattedValue = cleanAck

    if (cleanAck.length !== 15) {
      result.isValid = false
      result.errors.push('Acknowledgment number must be exactly 15 digits')
    }

    if (!/^\d+$/.test(cleanAck)) {
      result.isValid = false
      result.errors.push('Acknowledgment number can only contain digits')
    }

    // Format for display with spaces
    if (cleanAck.length === 15) {
      result.formattedValue = cleanAck.replace(/(\d{5})(\d{5})(\d{5})/, '$1 $2 $3')
    }

    return result
  }

  /**
   * Validate assessment year
   */
  private validateAssessmentYear(year: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'assessmentYear',
      formattedValue: year.trim()
    }

    // Normalize format
    let normalizedYear = year.replace(/[_\s]/g, '-').trim()
    
    // Handle different formats: 2023-24, 2023-2024, etc.
    if (/^\d{4}-\d{2}$/.test(normalizedYear)) {
      // Already in correct format
      result.formattedValue = normalizedYear
    } else if (/^\d{4}-\d{4}$/.test(normalizedYear)) {
      // Convert 2023-2024 to 2023-24
      const parts = normalizedYear.split('-')
      result.formattedValue = `${parts[0]}-${parts[1].slice(2)}`
      normalizedYear = result.formattedValue
    } else {
      result.isValid = false
      result.errors.push('Assessment year must be in format: YYYY-YY (e.g., 2023-24)')
      return result
    }

    // Check if year is in valid range
    if (!ITRValidationService.VALID_ASSESSMENT_YEARS.includes(normalizedYear)) {
      const currentYear = new Date().getFullYear()
      const minYear = currentYear - 10
      result.isValid = false
      result.errors.push(`Assessment year must be between ${minYear}-${minYear+1-2000} and ${currentYear}-${(currentYear+1).toString().slice(2)}`)
    }

    return result
  }

  /**
   * Validate applicant name
   */
  private validateApplicantName(name: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'applicantName',
      formattedValue: name.trim().replace(/\s+/g, ' ')
    }

    const cleanName = name.trim()

    if (cleanName.length < 2) {
      result.isValid = false
      result.errors.push('Name must be at least 2 characters long')
    }

    if (cleanName.length > 100) {
      result.isValid = false
      result.errors.push('Name cannot exceed 100 characters')
    }

    if (!/^[a-zA-Z\s.'-]+$/.test(cleanName)) {
      result.isValid = false
      result.errors.push('Name can only contain letters, spaces, dots, hyphens, and apostrophes')
    }

    // Check for proper capitalization
    const words = cleanName.split(' ')
    const properCase = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
    
    if (cleanName !== properCase) {
      result.warnings.push('Consider proper name capitalization')
      result.formattedValue = properCase
    }

    return result
  }

  /**
   * Validate currency amounts
   */
  private validateCurrency(fieldName: string, value: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: fieldName,
      formattedValue: value
    }

    // Remove currency symbols and commas
    const cleanValue = value.replace(/[₹$,\s]/g, '').trim()
    
    if (!/^\d*\.?\d*$/.test(cleanValue)) {
      result.isValid = false
      result.errors.push(`${this.getFieldDisplayName(fieldName)} must be a valid number`)
      return result
    }

    const numValue = parseFloat(cleanValue)
    
    if (isNaN(numValue)) {
      result.isValid = false
      result.errors.push(`${this.getFieldDisplayName(fieldName)} must be a valid number`)
      return result
    }

    if (numValue < 0) {
      result.isValid = false
      result.errors.push(`${this.getFieldDisplayName(fieldName)} cannot be negative`)
      return result
    }

    // Field-specific validations
    if (fieldName === 'annualCertifiedIncome' || fieldName === 'taxableIncome') {
      if (numValue > 10000000000) { // 10 billion
        result.warnings.push('Income amount seems unusually high')
      }
      if (numValue > 0 && numValue < 50000) {
        result.warnings.push('Income amount is below taxable limit for most cases')
      }
    }

    // Format for display
    result.formattedValue = this.formatCurrency(numValue)

    return result
  }

  /**
   * Validate date fields
   */
  private validateDate(fieldName: string, dateStr: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: fieldName,
      formattedValue: dateStr.trim()
    }

    try {
      // Try to parse various date formats
      let date: Date | null = null
      const cleanDate = dateStr.trim()

      // Try different formats
      const formats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/, // DD/MM/YYYY or DD-MM-YYYY
        /^\d{2}[\/\-]\d{2}[\/\-]\d{2}$/, // DD/MM/YY or DD-MM-YY
      ]

      if (formats[0].test(cleanDate)) {
        date = new Date(cleanDate)
        result.formattedValue = cleanDate
      } else if (formats[1].test(cleanDate)) {
        const parts = cleanDate.split(/[\/\-]/)
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        result.formattedValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      } else if (formats[2].test(cleanDate)) {
        const parts = cleanDate.split(/[\/\-]/)
        let year = parseInt(parts[2])
        year = year > 50 ? 1900 + year : 2000 + year
        date = new Date(`${year}-${parts[1]}-${parts[0]}`)
        result.formattedValue = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }

      if (!date || isNaN(date.getTime())) {
        result.isValid = false
        result.errors.push('Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY')
        return result
      }

      // Validate date range
      const currentDate = new Date()
      const minDate = new Date('1947-01-01') // India independence
      
      if (date > currentDate) {
        result.warnings.push('Date is in the future')
      }
      
      if (date < minDate) {
        result.isValid = false
        result.errors.push('Date is too far in the past')
      }

      // Filing date specific validation
      if (fieldName === 'filingDate') {
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(currentDate.getFullYear() - 1)
        
        if (date > currentDate) {
          result.isValid = false
          result.errors.push('Filing date cannot be in the future')
        }
      }

    } catch (error) {
      result.isValid = false
      result.errors.push('Invalid date format')
    }

    return result
  }

  /**
   * Validate email address
   */
  private validateEmail(email: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'emailId',
      formattedValue: email.toLowerCase().trim()
    }

    const cleanEmail = email.trim().toLowerCase()
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      result.isValid = false
      result.errors.push('Invalid email format')
    }

    if (cleanEmail.length > 254) {
      result.isValid = false
      result.errors.push('Email address is too long')
    }

    // Check for common typos
    const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
    const domain = cleanEmail.split('@')[1]
    if (domain && !commonDomains.includes(domain)) {
      const similar = commonDomains.find(d => 
        this.levenshteinDistance(domain, d) <= 2
      )
      if (similar) {
        result.warnings.push(`Did you mean ${similar}?`)
      }
    }

    return result
  }

  /**
   * Validate mobile number
   */
  private validateMobileNumber(mobile: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'mobileNumber',
      formattedValue: mobile.replace(/\D/g, '')
    }

    const cleanMobile = mobile.replace(/\D/g, '')
    result.formattedValue = cleanMobile

    if (cleanMobile.length !== 10) {
      result.isValid = false
      result.errors.push('Mobile number must be exactly 10 digits')
    }

    if (!/^[6-9]/.test(cleanMobile)) {
      result.isValid = false
      result.errors.push('Indian mobile numbers must start with 6, 7, 8, or 9')
    }

    return result
  }

  /**
   * Validate address
   */
  private validateAddress(address: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'address',
      formattedValue: address.trim()
    }

    const cleanAddress = address.trim()

    if (cleanAddress.length < 10) {
      result.isValid = false
      result.errors.push('Address must be at least 10 characters long')
    }

    if (cleanAddress.length > 500) {
      result.isValid = false
      result.errors.push('Address cannot exceed 500 characters')
    }

    // Check for PIN code
    if (!/\d{6}/.test(cleanAddress)) {
      result.warnings.push('Address should include a 6-digit PIN code')
    }

    // Check for Indian state
    const hasState = ITRValidationService.INDIAN_STATES.some(state =>
      cleanAddress.toLowerCase().includes(state.toLowerCase())
    )
    
    if (!hasState) {
      result.warnings.push('Address should include a valid Indian state')
    }

    return result
  }

  /**
   * Validate bank account number
   */
  private validateBankAccount(account: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'bankAccountNumber',
      formattedValue: account.replace(/\D/g, '')
    }

    const cleanAccount = account.replace(/\D/g, '')
    result.formattedValue = cleanAccount

    if (cleanAccount.length < 9 || cleanAccount.length > 18) {
      result.isValid = false
      result.errors.push('Bank account number must be between 9 and 18 digits')
    }

    if (!/^\d+$/.test(cleanAccount)) {
      result.isValid = false
      result.errors.push('Bank account number can only contain digits')
    }

    return result
  }

  /**
   * Validate IFSC code
   */
  private validateIFSC(ifsc: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'ifscCode',
      formattedValue: ifsc.toUpperCase().trim()
    }

    const cleanIFSC = ifsc.toUpperCase().replace(/[^A-Z0-9]/g, '')
    result.formattedValue = cleanIFSC

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIFSC)) {
      result.isValid = false
      result.errors.push('IFSC code must be in format: ABCD0123456 (4 letters, 0, 6 alphanumeric)')
    }

    return result
  }

  /**
   * Validate ITR form type
   */
  private validateITRForm(form: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: 'itrForm',
      formattedValue: form.toUpperCase().trim()
    }

    const cleanForm = form.toUpperCase().trim()
    result.formattedValue = cleanForm

    if (!ITRValidationService.VALID_ITR_FORMS.includes(cleanForm)) {
      result.isValid = false
      result.errors.push(`ITR form must be one of: ${ITRValidationService.VALID_ITR_FORMS.join(', ')}`)
    }

    return result
  }

  /**
   * Validate generic text field
   */
  private validateGenericText(fieldName: string, value: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      field: fieldName,
      formattedValue: value.trim()
    }

    const cleanValue = value.trim()

    if (cleanValue.length === 0) {
      result.isValid = false
      result.errors.push(`${this.getFieldDisplayName(fieldName)} cannot be empty`)
    }

    return result
  }

  /**
   * Generate helpful suggestions based on validation results
   */
  private generateSuggestions(data: Partial<ITRExtractedData>, fieldResults: { [key: string]: ValidationResult }): string[] {
    const suggestions: string[] = []

    // Check completion percentage
    const validFields = Object.values(fieldResults).filter(r => r.isValid).length
    const totalFields = Object.keys(fieldResults).length
    
    if (validFields / totalFields < 0.7) {
      suggestions.push('Consider filling more fields for better verification accuracy')
    }

    // Specific field suggestions
    if (!data.emailId) {
      suggestions.push('Adding email ID helps with communication during verification')
    }

    if (!data.mobileNumber) {
      suggestions.push('Mobile number is useful for OTP-based verifications')
    }

    if (!data.itrForm) {
      suggestions.push('ITR form type helps in better categorization')
    }

    // Income validation suggestions
    if (data.annualCertifiedIncome && data.taxableIncome) {
      const annual = parseFloat(data.annualCertifiedIncome.replace(/[^\d.]/g, ''))
      const taxable = parseFloat(data.taxableIncome.replace(/[^\d.]/g, ''))
      
      if (taxable > annual) {
        suggestions.push('Taxable income is higher than annual income - please verify')
      }
    }

    return suggestions
  }

  /**
   * Get user-friendly field display name
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      pan: 'PAN Number',
      ackNumber: 'Acknowledgment Number',
      assessmentYear: 'Assessment Year',
      applicantName: 'Applicant Name',
      annualCertifiedIncome: 'Annual Income',
      filingDate: 'Filing Date',
      filingStatus: 'Filing Status',
      itrForm: 'ITR Form',
      emailId: 'Email ID',
      mobileNumber: 'Mobile Number',
      address: 'Address',
      bankAccountNumber: 'Bank Account Number',
      ifscCode: 'IFSC Code',
      taxableIncome: 'Taxable Income',
      totalTax: 'Total Tax',
      refundAmount: 'Refund Amount'
    }
    
    return displayNames[fieldName] || fieldName
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Calculate Levenshtein distance for string similarity
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Quick validation check for critical fields only
   */
  public validateCriticalFields(data: Partial<ITRExtractedData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    ITRValidationService.CRITICAL_FIELDS.forEach(field => {
      const value = data[field as keyof ITRExtractedData]
      if (!value || value.toString().trim() === '') {
        errors.push(`${this.getFieldDisplayName(field)} is required`)
      } else {
        const result = this.validateField(field, value.toString())
        if (!result.isValid) {
          errors.push(...result.errors)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
