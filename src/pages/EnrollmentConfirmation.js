import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import './EnrollmentConfirmation.css';

const EnrollmentConfirmation = () => {
  const { enrollmentId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    enrollmentDate: '',
    enrollmentStartDate: '',
    numberEnrolled: 1,
    monthlyTuition: '',
    verifiedBy: '',
    verificationNotes: '',
    enrollmentContractUrl: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [calculatedCommission, setCalculatedCommission] = useState(0);

  useEffect(() => {
    // Calculate commission when monthly tuition changes
    if (formData.monthlyTuition && formData.numberEnrolled) {
      const commission = parseFloat(formData.monthlyTuition) * formData.numberEnrolled;
      setCalculatedCommission(commission);
    }
  }, [formData.monthlyTuition, formData.numberEnrolled]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enrollments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          enrollmentId,
          ...formData
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.message || 'Failed to confirm enrollment');
      }
    } catch (error) {
      console.error('Error confirming enrollment:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="confirmation-success">
        <div className="success-icon">✓</div>
        <h1>Enrollment Confirmed!</h1>
        <p>Thank you for confirming this enrollment.</p>
        <p className="commission-info">
          Your referral commission of <strong>${calculatedCommission.toFixed(2)}</strong> has been recorded.
        </p>
        <p>You'll receive an invoice within 1-2 business days.</p>
      </div>
    );
  }

  return (
    <div className="enrollment-confirmation-page">
      <div className="confirmation-header">
        <h1>Confirm Student Enrollment</h1>
        <p>Please provide enrollment details to complete the referral process</p>
      </div>

      <form onSubmit={handleSubmit} className="enrollment-form">
        <div className="form-section">
          <h3>Enrollment Information</h3>

          <div className="form-group">
            <label htmlFor="enrollmentDate">Enrollment Date *</label>
            <input
              type="date"
              id="enrollmentDate"
              name="enrollmentDate"
              value={formData.enrollmentDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentStartDate">Start Date *</label>
            <input
              type="date"
              id="enrollmentStartDate"
              name="enrollmentStartDate"
              value={formData.enrollmentStartDate}
              onChange={handleChange}
              required
            />
            <small>When will the child(ren) start attending?</small>
          </div>

          <div className="form-group">
            <label htmlFor="numberEnrolled">Number of Children Enrolled *</label>
            <select
              id="numberEnrolled"
              name="numberEnrolled"
              value={formData.numberEnrolled}
              onChange={handleChange}
              required
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Commission Details</h3>

          <div className="form-group">
            <label htmlFor="monthlyTuition">Monthly Tuition (per child) *</label>
            <div className="input-with-prefix">
              <span className="prefix">$</span>
              <input
                type="number"
                id="monthlyTuition"
                name="monthlyTuition"
                value={formData.monthlyTuition}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <small>Standard monthly tuition amount per child</small>
          </div>

          {calculatedCommission > 0 && (
            <div className="commission-display">
              <strong>Referral Commission:</strong>
              <span className="amount">${calculatedCommission.toFixed(2)}</span>
              <small>(1 month tuition × {formData.numberEnrolled} child{formData.numberEnrolled > 1 ? 'ren' : ''})</small>
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>Verification</h3>

          <div className="form-group">
            <label htmlFor="verifiedBy">Your Name *</label>
            <input
              type="text"
              id="verifiedBy"
              name="verifiedBy"
              value={formData.verifiedBy}
              onChange={handleChange}
              placeholder="Full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="verificationNotes">Additional Notes</label>
            <textarea
              id="verificationNotes"
              name="verificationNotes"
              value={formData.verificationNotes}
              onChange={handleChange}
              placeholder="Any additional information about this enrollment..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="enrollmentContractUrl">Enrollment Contract URL (Optional)</label>
            <input
              type="url"
              id="enrollmentContractUrl"
              name="enrollmentContractUrl"
              value={formData.enrollmentContractUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
            <small>Link to signed enrollment agreement</small>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm Enrollment'}
          </button>
        </div>

        <div className="info-box">
          <p><strong>What happens next?</strong></p>
          <ol>
            <li>We'll process your confirmation within 1-2 business days</li>
            <li>You'll receive an invoice for the referral commission</li>
            <li>Payment is due within 30 days of invoice date</li>
          </ol>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentConfirmation;
