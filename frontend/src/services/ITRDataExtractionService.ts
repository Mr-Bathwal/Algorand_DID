import Tesseract from 'tesseract.js'
// Browser-compatible PDF parsing (pdf-parse doesn't work in browser)
// We'll implement a simple text extraction fallback

export interface ITRExtractedData {
  pan: string
  ackNumber: string
  assessmentYear: string
  applicantName: string
  annualCertifiedIncome: string
  filingDate: string
  filingStatus: string
  itrForm: string
  emailId: string
  mobileNumber: string
  address: string
  bankAccountNumber: string
  ifscCode: string
  taxableIncome: string
  totalTax: string
  refundAmount: string
  verified: boolean
  extractionMethod: 'OCR' | 'PDF_TEXT' | 'MANUAL'
  extractionConfidence: number
  errors: string[]
}

export interface ExtractionResult {
  success: boolean
  data: Partial<ITRExtractedData>
  errors: string[]
  warnings: string[]
  extractionMethod: 'OCR' | 'PDF_TEXT' | 'MANUAL'
  processingTime: number
}

/**
 * ITR Data Extraction Service
 * Handles extraction of ITR data from PDF documents and images using OCR and text parsing
 */
export class ITRDataExtractionService {
  private static instance: ITRDataExtractionService
  
  // Regex patterns for different ITR fields
  private static readonly PATTERNS = {
    PAN: /[A-Z]{5}[0-9]{4}[A-Z]{1}/g,
    ACK_NUMBER: /(?:acknowledgment|acknowledgement|ack).*?(?:number|no)[:\s]*(\d{15})/gi,
    ASSESSMENT_YEAR: /(?:assessment|ay)[:\s]*(\d{4}[-_]\d{2,4})/gi,
    ANNUAL_INCOME: /(?:annual|yearly|total).*?(?:income|salary)[:\s]*[₹]?\s*([0-9,]+(?:\.\d{2})?)/gi,
    FILING_DATE: /(?:filing|filed|submitted)[:\s]*(on|date)?[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    MOBILE: /(?:mobile|phone|contact)[:\s]*(\d{10})/gi,
    BANK_ACCOUNT: /(?:bank|account)[:\s]*(?:no|number)[:\s]*(\d{9,18})/gi,
    IFSC: /[A-Z]{4}0[A-Z0-9]{6}/g,
    TAXABLE_INCOME: /(?:taxable|net).*?income[:\s]*[₹]?\s*([0-9,]+(?:\.\d{2})?)/gi,
    TOTAL_TAX: /(?:total|tax).*?(?:payable|due)[:\s]*[₹]?\s*([0-9,]+(?:\.\d{2})?)/gi,
    REFUND: /(?:refund|due)[:\s]*[₹]?\s*([0-9,]+(?:\.\d{2})?)/gi
  }

  // ITR Form types
  private static readonly ITR_FORMS = [
    'ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'
  ]

  public static getInstance(): ITRDataExtractionService {
    if (!ITRDataExtractionService.instance) {
      ITRDataExtractionService.instance = new ITRDataExtractionService()
    }
    return ITRDataExtractionService.instance
  }

  /**
   * Extract ITR data from uploaded file (PDF or Image)
   */
  async extractFromFile(file: File): Promise<ExtractionResult> {
    const startTime = Date.now()
    let result: ExtractionResult = {
      success: false,
      data: {},
      errors: [],
      warnings: [],
      extractionMethod: 'PDF_TEXT',
      processingTime: 0
    }

    try {
      // Validate file type
      if (!this.isValidFileType(file)) {
        result.errors.push('Invalid file type. Please upload PDF, JPEG, PNG, or other image formats.')
        return result
      }

      // Extract based on file type
      if (file.type === 'application/pdf') {
        result = await this.extractFromPDF(file)
      } else if (file.type.startsWith('image/')) {
        result = await this.extractFromImage(file)
      } else {
        result.errors.push('Unsupported file format.')
        return result
      }

      // Post-process and validate extracted data
      result.data = this.postProcessExtractedData(result.data)
      result.data.verified = this.validateExtractedData(result.data)
      result.processingTime = Date.now() - startTime

      return result

    } catch (error) {
      console.error('ITR data extraction failed:', error)
      result.errors.push(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.processingTime = Date.now() - startTime
      return result
    }
  }

  /**
   * Extract data from PDF document
   */
  private async extractFromPDF(file: File): Promise<ExtractionResult> {
    try {
      console.log('PDF parsing in browser - using simplified text extraction')
      
      // For browser compatibility, we'll try to extract basic text
      // In a real implementation, you'd use a browser-compatible PDF library like PDF.js
      const arrayBuffer = await file.arrayBuffer()
      
      // Simple approach: convert PDF to text using basic parsing
      // This is a fallback - in production you'd want to use PDF.js
      let extractedText = ''
      
      try {
        // Try to extract simple text from PDF buffer
        const uint8Array = new Uint8Array(arrayBuffer)
        const textDecoder = new TextDecoder('utf-8', { fatal: false })
        const rawText = textDecoder.decode(uint8Array)
        
        // Extract readable text from PDF content
        const textMatches = rawText.match(/\b[A-Z0-9][A-Z0-9\s.,'-]*\b/g) || []
        extractedText = textMatches.join(' ')
        
        if (!extractedText || extractedText.length < 50) {
          throw new Error('Insufficient text extracted from PDF')
        }
        
      } catch (err) {
        console.warn('Simple PDF parsing failed, will use OCR instead')
        // If PDF text extraction fails, use OCR on the file
        return await this.extractFromImage(file)
      }
      
      const extractedData = this.parseTextContent(extractedText)
      
      return {
        success: true,
        data: extractedData,
        errors: [],
        warnings: ['PDF parsed with simplified method - OCR might be more accurate'],
        extractionMethod: 'PDF_TEXT',
        processingTime: 0
      }
      
    } catch (error) {
      console.error('PDF parsing error:', error)
      console.log('Falling back to OCR for PDF file')
      
      // Fallback to OCR if PDF parsing fails
      return await this.extractFromImage(file)
    }
  }

  /**
   * Extract data from image using OCR
   */
  private async extractFromImage(file: File): Promise<ExtractionResult> {
    try {
      console.log('Starting OCR processing for image...')
      
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => console.log('OCR Progress:', m)
        }
      )

      console.log('OCR text extracted:', text.substring(0, 200) + '...')
      
      const extractedData = this.parseTextContent(text)
      
      return {
        success: true,
        data: extractedData,
        errors: [],
        warnings: extractedData.errors || [],
        extractionMethod: 'OCR',
        processingTime: 0
      }
    } catch (error) {
      console.error('OCR processing error:', error)
      return {
        success: false,
        data: {},
        errors: [`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        extractionMethod: 'OCR',
        processingTime: 0
      }
    }
  }

  /**
   * Parse text content to extract ITR fields
   */
  private parseTextContent(text: string): Partial<ITRExtractedData> {
    const data: Partial<ITRExtractedData> = {
      errors: []
    }

    try {
      // Extract PAN
      const panMatches = text.match(ITRDataExtractionService.PATTERNS.PAN)
      if (panMatches && panMatches.length > 0) {
        data.pan = panMatches[0]
      }

      // Extract Acknowledgment Number
      const ackMatches = text.match(ITRDataExtractionService.PATTERNS.ACK_NUMBER)
      if (ackMatches && ackMatches[1]) {
        data.ackNumber = ackMatches[1]
      }

      // Extract Assessment Year
      const ayMatches = text.match(ITRDataExtractionService.PATTERNS.ASSESSMENT_YEAR)
      if (ayMatches && ayMatches[1]) {
        data.assessmentYear = ayMatches[1].replace('_', '-')
      }

      // Extract Annual Income
      const incomeMatches = text.match(ITRDataExtractionService.PATTERNS.ANNUAL_INCOME)
      if (incomeMatches && incomeMatches[1]) {
        data.annualCertifiedIncome = incomeMatches[1].replace(/,/g, '')
      }

      // Extract Filing Date
      const dateMatches = text.match(ITRDataExtractionService.PATTERNS.FILING_DATE)
      if (dateMatches && dateMatches[2]) {
        data.filingDate = this.normalizeDateFormat(dateMatches[2])
      }

      // Extract Email
      const emailMatches = text.match(ITRDataExtractionService.PATTERNS.EMAIL)
      if (emailMatches && emailMatches.length > 0) {
        data.emailId = emailMatches[0]
      }

      // Extract Mobile Number
      const mobileMatches = text.match(ITRDataExtractionService.PATTERNS.MOBILE)
      if (mobileMatches && mobileMatches[1]) {
        data.mobileNumber = mobileMatches[1]
      }

      // Extract Bank Account Number
      const bankMatches = text.match(ITRDataExtractionService.PATTERNS.BANK_ACCOUNT)
      if (bankMatches && bankMatches[1]) {
        data.bankAccountNumber = bankMatches[1]
      }

      // Extract IFSC Code
      const ifscMatches = text.match(ITRDataExtractionService.PATTERNS.IFSC)
      if (ifscMatches && ifscMatches.length > 0) {
        data.ifscCode = ifscMatches[0]
      }

      // Extract Taxable Income
      const taxableMatches = text.match(ITRDataExtractionService.PATTERNS.TAXABLE_INCOME)
      if (taxableMatches && taxableMatches[1]) {
        data.taxableIncome = taxableMatches[1].replace(/,/g, '')
      }

      // Extract Total Tax
      const taxMatches = text.match(ITRDataExtractionService.PATTERNS.TOTAL_TAX)
      if (taxMatches && taxMatches[1]) {
        data.totalTax = taxMatches[1].replace(/,/g, '')
      }

      // Extract Refund Amount
      const refundMatches = text.match(ITRDataExtractionService.PATTERNS.REFUND)
      if (refundMatches && refundMatches[1]) {
        data.refundAmount = refundMatches[1].replace(/,/g, '')
      }

      // Extract Applicant Name (more complex pattern)
      data.applicantName = this.extractApplicantName(text)

      // Extract ITR Form Type
      data.itrForm = this.extractITRFormType(text)

      // Set filing status
      data.filingStatus = 'Successfully Submitted' // Default, can be enhanced

    } catch (error) {
      console.error('Text parsing error:', error)
      data.errors?.push(`Text parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return data
  }

  /**
   * Extract applicant name from text
   */
  private extractApplicantName(text: string): string {
    // Look for name patterns near "name" keyword
    const namePatterns = [
      /(?:name|assessee)[:\s]*((?:[A-Z][a-z]+ ?)+)/gi,
      /mr\.?\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/gi,
      /mrs\.?\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/gi,
      /ms\.?\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/gi
    ]

    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
        return match[1].trim()
      }
    }

    return ''
  }

  /**
   * Extract ITR form type from text
   */
  private extractITRFormType(text: string): string {
    for (const form of ITRDataExtractionService.ITR_FORMS) {
      if (text.toLowerCase().includes(form.toLowerCase())) {
        return form
      }
    }
    return ''
  }

  /**
   * Normalize date format to YYYY-MM-DD
   */
  private normalizeDateFormat(dateStr: string): string {
    try {
      // Handle various date formats
      const cleanDate = dateStr.replace(/[^\d\/\-]/g, '')
      const parts = cleanDate.split(/[\/\-]/)
      
      if (parts.length === 3) {
        let day = parts[0]
        let month = parts[1]
        let year = parts[2]
        
        // Handle 2-digit years
        if (year.length === 2) {
          year = parseInt(year) > 50 ? '19' + year : '20' + year
        }
        
        // Ensure proper format
        day = day.padStart(2, '0')
        month = month.padStart(2, '0')
        
        return `${year}-${month}-${day}`
      }
    } catch (error) {
      console.error('Date normalization error:', error)
    }
    
    return dateStr
  }

  /**
   * Post-process extracted data
   */
  private postProcessExtractedData(data: Partial<ITRExtractedData>): Partial<ITRExtractedData> {
    // Clean and format PAN
    if (data.pan) {
      data.pan = data.pan.toUpperCase().replace(/[^A-Z0-9]/g, '')
    }

    // Clean acknowledgment number
    if (data.ackNumber) {
      data.ackNumber = data.ackNumber.replace(/\D/g, '')
    }

    // Format income amounts
    if (data.annualCertifiedIncome) {
      data.annualCertifiedIncome = this.formatCurrency(data.annualCertifiedIncome)
    }
    if (data.taxableIncome) {
      data.taxableIncome = this.formatCurrency(data.taxableIncome)
    }
    if (data.totalTax) {
      data.totalTax = this.formatCurrency(data.totalTax)
    }
    if (data.refundAmount) {
      data.refundAmount = this.formatCurrency(data.refundAmount)
    }

    return data
  }

  /**
   * Format currency values
   */
  private formatCurrency(value: string): string {
    // Remove currency symbols and clean up
    const cleaned = value.replace(/[₹$,]/g, '').trim()
    // Ensure it's a valid number
    const num = parseFloat(cleaned)
    return isNaN(num) ? '0' : num.toString()
  }

  /**
   * Validate extracted data
   */
  private validateExtractedData(data: Partial<ITRExtractedData>): boolean {
    let isValid = true
    const errors: string[] = data.errors || []

    // Validate PAN format
    if (data.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan)) {
      errors.push('Invalid PAN format')
      isValid = false
    }

    // Validate acknowledgment number (15 digits)
    if (data.ackNumber && !/^\d{15}$/.test(data.ackNumber)) {
      errors.push('Invalid acknowledgment number format (should be 15 digits)')
      isValid = false
    }

    // Validate email format
    if (data.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailId)) {
      errors.push('Invalid email format')
      isValid = false
    }

    // Validate mobile number (10 digits)
    if (data.mobileNumber && !/^\d{10}$/.test(data.mobileNumber)) {
      errors.push('Invalid mobile number format (should be 10 digits)')
      isValid = false
    }

    data.errors = errors
    return isValid
  }

  /**
   * Check if file type is supported
   */
  private isValidFileType(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ]
    
    return supportedTypes.includes(file.type.toLowerCase())
  }

  /**
   * Get supported file types for UI display
   */
  public getSupportedFileTypes(): string[] {
    return ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
  }

  /**
   * Get extraction confidence score based on number of fields extracted
   */
  public getExtractionConfidence(data: Partial<ITRExtractedData>): number {
    const requiredFields = ['pan', 'ackNumber', 'assessmentYear', 'applicantName', 'annualCertifiedIncome']
    const extractedCount = requiredFields.filter(field => data[field as keyof ITRExtractedData]).length
    
    return Math.round((extractedCount / requiredFields.length) * 100)
  }

  /**
   * Create a demo/sample extracted data for testing
   */
  public createSampleData(): ITRExtractedData {
    return {
      pan: 'ABCDE1234F',
      ackNumber: '123456789012345',
      assessmentYear: '2024-25',
      applicantName: 'John Doe',
      annualCertifiedIncome: '500000',
      filingDate: '2024-03-15',
      filingStatus: 'Successfully Submitted',
      itrForm: 'ITR-1',
      emailId: 'john.doe@example.com',
      mobileNumber: '9876543210',
      address: '123 Main Street, City, State - 123456',
      bankAccountNumber: '123456789012345',
      ifscCode: 'SBIN0001234',
      taxableIncome: '450000',
      totalTax: '45000',
      refundAmount: '5000',
      verified: true,
      extractionMethod: 'PDF_TEXT',
      extractionConfidence: 100,
      errors: []
    }
  }

  /**
   * Enhanced extraction with fallback for demo purposes
   */
  public async extractWithDemoFallback(file: File): Promise<ExtractionResult> {
    try {
      // Try normal extraction first
      const result = await this.extractFromFile(file)
      
      // If extraction fails or yields no useful data, use demo data
      if (!result.success || !this.hasMinimumData(result.data)) {
        console.log('Using demo data for testing purposes')
        const demoData = this.createSampleData()
        
        return {
          success: true,
          data: {
            pan: demoData.pan,
            ackNumber: demoData.ackNumber,
            assessmentYear: demoData.assessmentYear,
            applicantName: demoData.applicantName,
            annualCertifiedIncome: demoData.annualCertifiedIncome,
            filingDate: demoData.filingDate
          },
          errors: [],
          warnings: ['Demo data used - upload a real ITR document for actual extraction'],
          extractionMethod: 'MANUAL',
          processingTime: 1000
        }
      }
      
      return result
    } catch (error) {
      // Ultimate fallback - return demo data
      console.log('Using demo data as final fallback')
      const demoData = this.createSampleData()
      
      return {
        success: true,
        data: {
          pan: demoData.pan,
          ackNumber: demoData.ackNumber,
          assessmentYear: demoData.assessmentYear,
          applicantName: demoData.applicantName,
          annualCertifiedIncome: demoData.annualCertifiedIncome,
          filingDate: demoData.filingDate
        },
        errors: [],
        warnings: ['Demo data used - system is in development mode'],
        extractionMethod: 'MANUAL',
        processingTime: 1000
      }
    }
  }

  /**
   * Check if extracted data has minimum required fields
   */
  private hasMinimumData(data: Partial<ITRExtractedData>): boolean {
    return !!(data.pan || data.ackNumber || data.annualCertifiedIncome)
  }
}
