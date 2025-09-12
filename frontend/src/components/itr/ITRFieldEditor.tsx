import React, { useState, useEffect } from 'react'
import { ITRExtractedData } from '../../services/ITRDataExtractionService'
import { ITRValidationService, ValidationResult, CompleteValidationResult } from '../../services/ITRValidationService'

interface ITRFieldEditorProps {
  initialData: Partial<ITRExtractedData>
  onDataChange: (data: Partial<ITRExtractedData>) => void
  onValidationChange: (validation: CompleteValidationResult) => void
  showOptionalFields?: boolean
  readOnlyFields?: string[]
  highlightErrors?: boolean
  className?: string
}

interface FieldConfig {
  key: keyof ITRExtractedData
  label: string
  placeholder: string
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select'
  required: boolean
  maxLength?: number
  options?: string[]
  format?: (value: string) => string
  helpText?: string
}

const ITRFieldEditor: React.FC<ITRFieldEditorProps> = ({
  initialData,
  onDataChange,
  onValidationChange,
  showOptionalFields = true,
  readOnlyFields = [],
  highlightErrors = true,
  className = ''
}) => {
  const [formData, setFormData] = useState<Partial<ITRExtractedData>>(initialData)
  const [validation, setValidation] = useState<CompleteValidationResult | null>(null)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [showAllFields, setShowAllFields] = useState(false)

  const validationService = ITRValidationService.getInstance()

  // Field configurations
  const fieldConfigs: FieldConfig[] = [
    // Critical Fields
    {
      key: 'pan',
      label: 'PAN Number',
      placeholder: 'ABCDE1234F',
      type: 'text',
      required: true,
      maxLength: 10,
      format: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      helpText: 'Permanent Account Number (10 characters: ABCDE1234F)'
    },
    {
      key: 'ackNumber',
      label: 'ITR Acknowledgment Number',
      placeholder: '12345 67890 12345',
      type: 'text',
      required: true,
      maxLength: 17, // Including spaces
      format: (value) => {
        const cleaned = value.replace(/\D/g, '')
        return cleaned.replace(/(\d{5})(\d{5})(\d{5})/, '$1 $2 $3').trim()
      },
      helpText: '15-digit acknowledgment number from your ITR filing'
    },
    {
      key: 'assessmentYear',
      label: 'Assessment Year',
      placeholder: '2024-25',
      type: 'text',
      required: true,
      maxLength: 7,
      format: (value) => {
        const cleaned = value.replace(/[^\d-]/g, '')
        if (/^\d{4}-\d{4}$/.test(cleaned)) {
          const parts = cleaned.split('-')
          return `${parts[0]}-${parts[1].slice(2)}`
        }
        return cleaned
      },
      helpText: 'Assessment year in format YYYY-YY (e.g., 2024-25)'
    },
    {
      key: 'applicantName',
      label: 'Applicant Name',
      placeholder: 'Full Name as per PAN',
      type: 'text',
      required: true,
      maxLength: 100,
      format: (value) => value.replace(/[^a-zA-Z\s.'-]/g, ''),
      helpText: 'Full name as mentioned in your PAN card'
    },
    {
      key: 'annualCertifiedIncome',
      label: 'Annual Certified Income',
      placeholder: '5,00,000',
      type: 'text',
      required: true,
      format: (value) => {
        const num = value.replace(/[^\d.]/g, '')
        return new Intl.NumberFormat('en-IN').format(parseFloat(num) || 0)
      },
      helpText: 'Annual income as per your ITR filing'
    },

    // Important but Optional Fields
    {
      key: 'filingDate',
      label: 'Filing Date',
      placeholder: 'YYYY-MM-DD',
      type: 'date',
      required: false,
      helpText: 'Date when you filed your ITR'
    },
    {
      key: 'itrForm',
      label: 'ITR Form',
      placeholder: 'Select ITR Form',
      type: 'select',
      required: false,
      options: ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'],
      helpText: 'Type of ITR form used for filing'
    },

    // Additional Financial Information
    {
      key: 'taxableIncome',
      label: 'Taxable Income',
      placeholder: '4,50,000',
      type: 'text',
      required: false,
      format: (value) => {
        const num = value.replace(/[^\d.]/g, '')
        return new Intl.NumberFormat('en-IN').format(parseFloat(num) || 0)
      },
      helpText: 'Taxable income after deductions'
    },
    {
      key: 'totalTax',
      label: 'Total Tax',
      placeholder: '45,000',
      type: 'text',
      required: false,
      format: (value) => {
        const num = value.replace(/[^\d.]/g, '')
        return new Intl.NumberFormat('en-IN').format(parseFloat(num) || 0)
      },
      helpText: 'Total tax liability'
    },
    {
      key: 'refundAmount',
      label: 'Refund Amount',
      placeholder: '5,000',
      type: 'text',
      required: false,
      format: (value) => {
        const num = value.replace(/[^\d.]/g, '')
        return new Intl.NumberFormat('en-IN').format(parseFloat(num) || 0)
      },
      helpText: 'Tax refund amount (if applicable)'
    },

    // Contact Information
    {
      key: 'emailId',
      label: 'Email ID',
      placeholder: 'email@example.com',
      type: 'email',
      required: false,
      maxLength: 254,
      format: (value) => value.toLowerCase().trim(),
      helpText: 'Email address used for ITR filing'
    },
    {
      key: 'mobileNumber',
      label: 'Mobile Number',
      placeholder: '9876543210',
      type: 'tel',
      required: false,
      maxLength: 10,
      format: (value) => value.replace(/\D/g, ''),
      helpText: 'Mobile number registered with IT department'
    },

    // Banking Information
    {
      key: 'bankAccountNumber',
      label: 'Bank Account Number',
      placeholder: '123456789012345',
      type: 'text',
      required: false,
      maxLength: 18,
      format: (value) => value.replace(/\D/g, ''),
      helpText: 'Bank account number for refund processing'
    },
    {
      key: 'ifscCode',
      label: 'IFSC Code',
      placeholder: 'SBIN0001234',
      type: 'text',
      required: false,
      maxLength: 11,
      format: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      helpText: 'Bank IFSC code'
    },

    // Address
    {
      key: 'address',
      label: 'Address',
      placeholder: 'Complete address with PIN code',
      type: 'text',
      required: false,
      maxLength: 500,
      helpText: 'Residential address as per ITR filing'
    }
  ]

  // Update form data and trigger validation
  const updateFormData = (newData: Partial<ITRExtractedData>) => {
    setFormData(newData)
    onDataChange(newData)
    
    // Perform validation
    const validationResult = validationService.validateCompleteData(newData)
    setValidation(validationResult)
    onValidationChange(validationResult)
  }

  // Handle field changes
  const handleFieldChange = (fieldKey: keyof ITRExtractedData, value: string) => {
    const fieldConfig = fieldConfigs.find(f => f.key === fieldKey)
    
    // Apply formatting if available
    let formattedValue = value
    if (fieldConfig?.format) {
      formattedValue = fieldConfig.format(value)
    }
    
    // Apply max length
    if (fieldConfig?.maxLength && formattedValue.length > fieldConfig.maxLength) {
      formattedValue = formattedValue.slice(0, fieldConfig.maxLength)
    }
    
    updateFormData({
      ...formData,
      [fieldKey]: formattedValue
    })
  }

  // Handle field focus/blur for touched state
  const handleFieldBlur = (fieldKey: keyof ITRExtractedData) => {
    setTouchedFields(prev => new Set([...prev, fieldKey]))
  }

  // Get validation result for a specific field
  const getFieldValidation = (fieldKey: keyof ITRExtractedData): ValidationResult | undefined => {
    return validation?.fieldResults[fieldKey]
  }

  // Check if field should show error
  const shouldShowError = (fieldKey: keyof ITRExtractedData): boolean => {
    if (!highlightErrors) return false
    const fieldValidation = getFieldValidation(fieldKey)
    const isTouched = touchedFields.has(fieldKey)
    return isTouched && fieldValidation && !fieldValidation.isValid
  }

  // Get field CSS classes
  const getFieldClasses = (fieldKey: keyof ITRExtractedData, baseClasses: string = ''): string => {
    const fieldValidation = getFieldValidation(fieldKey)
    const showError = shouldShowError(fieldKey)
    const showWarning = fieldValidation?.warnings && fieldValidation.warnings.length > 0
    
    let classes = baseClasses
    
    if (showError) {
      classes += ' border-red-500 focus:border-red-500 focus:ring-red-500'
    } else if (showWarning) {
      classes += ' border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
    } else if (fieldValidation?.isValid) {
      classes += ' border-green-500 focus:border-green-500 focus:ring-green-500'
    } else {
      classes += ' border-slate-600 focus:border-blue-500 focus:ring-blue-500'
    }
    
    if (readOnlyFields.includes(fieldKey)) {
      classes += ' bg-slate-700 cursor-not-allowed'
    }
    
    return classes
  }

  // Initialize validation on mount
  useEffect(() => {
    const validationResult = validationService.validateCompleteData(initialData)
    setValidation(validationResult)
    onValidationChange(validationResult)
  }, [])

  // Filter fields to display
  const fieldsToShow = showOptionalFields 
    ? fieldConfigs 
    : fieldConfigs.filter(f => f.required || formData[f.key])

  const criticalFields = fieldsToShow.filter(f => f.required)
  const optionalFields = fieldsToShow.filter(f => !f.required)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Validation Summary */}
      {validation && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-300">
              Field Validation Summary
            </h4>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-slate-400">
                {validation.validFieldCount} / {validation.totalFieldCount} valid
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                validation.validationScore >= 90 
                  ? 'bg-green-500/20 text-green-300'
                  : validation.validationScore >= 70
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {validation.validationScore}%
              </div>
            </div>
          </div>
          
          {validation.criticalErrors.length > 0 && (
            <div className="text-xs text-red-300 mb-2">
              Critical errors: {validation.criticalErrors.length}
            </div>
          )}
          
          {validation.suggestions.length > 0 && (
            <div className="text-xs text-blue-300">
              💡 {validation.suggestions[0]}
            </div>
          )}
        </div>
      )}

      {/* Critical Fields Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <span className="text-red-400 mr-2">*</span>
          Required Fields
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {criticalFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              
              {field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  onBlur={() => handleFieldBlur(field.key)}
                  disabled={readOnlyFields.includes(field.key)}
                  className={getFieldClasses(
                    field.key,
                    'w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-1 focus:outline-none'
                  )}
                >
                  <option value="">{field.placeholder}</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  onBlur={() => handleFieldBlur(field.key)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  disabled={readOnlyFields.includes(field.key)}
                  className={getFieldClasses(
                    field.key,
                    'w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-1 focus:outline-none placeholder-slate-400'
                  )}
                />
              )}
              
              {/* Field validation feedback */}
              {shouldShowError(field.key) && (
                <div className="text-xs text-red-300 mt-1">
                  {getFieldValidation(field.key)?.errors.join(', ')}
                </div>
              )}
              
              {getFieldValidation(field.key)?.warnings && getFieldValidation(field.key)?.warnings.length > 0 && (
                <div className="text-xs text-yellow-300 mt-1">
                  ⚠️ {getFieldValidation(field.key)?.warnings.join(', ')}
                </div>
              )}
              
              {field.helpText && (
                <div className="text-xs text-slate-400 mt-1">
                  {field.helpText}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional Fields Section */}
      {showOptionalFields && optionalFields.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Optional Fields
            </h3>
            <button type="button"
              onClick={() => setShowAllFields(!showAllFields)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showAllFields ? 'Hide' : 'Show All'} ({optionalFields.length})
            </button>
          </div>
          
          {showAllFields && (
            <div className="grid gap-4 md:grid-cols-2">
              {optionalFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="block text-sm font-medium text-slate-300">
                    {field.label}
                  </label>
                  
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      onBlur={() => handleFieldBlur(field.key)}
                      disabled={readOnlyFields.includes(field.key)}
                      className={getFieldClasses(
                        field.key,
                        'w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-1 focus:outline-none'
                      )}
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.key === 'address' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      onBlur={() => handleFieldBlur(field.key)}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      disabled={readOnlyFields.includes(field.key)}
                      rows={3}
                      className={getFieldClasses(
                        field.key,
                        'w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-1 focus:outline-none placeholder-slate-400 resize-none'
                      )}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      onBlur={() => handleFieldBlur(field.key)}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      disabled={readOnlyFields.includes(field.key)}
                      className={getFieldClasses(
                        field.key,
                        'w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-1 focus:outline-none placeholder-slate-400'
                      )}
                    />
                  )}
                  
                  {/* Field validation feedback */}
                  {shouldShowError(field.key) && (
                    <div className="text-xs text-red-300 mt-1">
                      {getFieldValidation(field.key)?.errors.join(', ')}
                    </div>
                  )}
                  
                  {getFieldValidation(field.key)?.warnings && getFieldValidation(field.key)?.warnings.length > 0 && (
                    <div className="text-xs text-yellow-300 mt-1">
                      ⚠️ {getFieldValidation(field.key)?.warnings.join(', ')}
                    </div>
                  )}
                  
                  {field.helpText && (
                    <div className="text-xs text-slate-400 mt-1">
                      {field.helpText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-600">
        <button type="button"
          onClick={() => {
            const sampleData = {
              pan: 'ABCDE1234F',
              ackNumber: '123456789012345',
              assessmentYear: '2024-25',
              applicantName: 'Sample Taxpayer',
              annualCertifiedIncome: '500000'
            }
            updateFormData({ ...formData, ...sampleData })
          }}
          className="px-3 py-1 text-xs bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 transition-colors"
        >
          Fill Sample Data
        </button>
        
        <button type="button"
          onClick={() => {
            const criticalData: Partial<ITRExtractedData> = {}
            criticalFields.forEach(field => {
              if (formData[field.key]) {
                criticalData[field.key] = formData[field.key]
              }
            })
            updateFormData(criticalData)
          }}
          className="px-3 py-1 text-xs bg-yellow-600/20 text-yellow-300 rounded hover:bg-yellow-600/30 transition-colors"
        >
          Keep Only Required
        </button>
        
        <button type="button"
          onClick={() => updateFormData({})}
          className="px-3 py-1 text-xs bg-red-600/20 text-red-300 rounded hover:bg-red-600/30 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  )
}

export default ITRFieldEditor
