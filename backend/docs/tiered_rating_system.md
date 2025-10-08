# Daycare Tiered Rating System Documentation

## Overview

The DaycareAlert Tiered Rating System provides a comprehensive assessment of childcare facilities using both traditional star ratings (1-5 stars) and detailed subcategory scores (1-10 scale) for more granular evaluation. This system allows parents to make more informed decisions based on factors most important to their family's needs.

## Rating Components

### Overall Star Rating (1-5 Stars)

The overall star rating remains a familiar and easy-to-understand metric for parents, with ratings from 1 to 5 stars in 0.5-star increments:

- **5 Stars**: Exceptional quality and safety
- **4.5 Stars**: Excellent quality and safety
- **4 Stars**: Very good quality and safety
- **3.5 Stars**: Good quality and safety
- **3 Stars**: Satisfactory quality and safety
- **2.5 Stars**: Fair quality or some concerns
- **2 Stars**: Below average quality or moderate concerns
- **1.5 Stars**: Poor quality or significant concerns
- **1 Star**: Severe concerns, minimum compliance only

### Subcategory Scores (1-10 Scale)

Each daycare is also evaluated across four key dimensions using a more detailed 1-10 scale:

1. **Safety & Compliance** (1-10)
   - Regulatory compliance and safety factors
   - Based on inspection history, risk scores, violation patterns
   - Lower scores indicate safety concerns or compliance issues

2. **Operational Quality** (1-10)
   - Hours of operation, weekend availability, accessibility
   - Subsidy acceptance, infant care, age range flexibility
   - Special services and accommodations

3. **Educational Programming** (1-10)
   - Curriculum quality and educational approach
   - Accreditations and specialized educational methods
   - Learning environment and developmental focus

4. **Staff Qualifications** (1-10)
   - Staff education, certification, and training
   - Professional development opportunities
   - Experience levels and qualifications

## Methodology

### Overall Star Rating Calculation

The overall star rating is calculated through a sophisticated algorithm that balances multiple factors:

1. **Base Rating**: Determined primarily by risk score and violation history
2. **Category-Specific Adjustments**: Modified based on performance in specific regulatory categories
3. **Quality Indicators**: Enhanced by operational quality factors, educational approaches, and staff qualifications
4. **Progressive Scoring**: Uses diminishing returns for quality boosts to avoid rating inflation:
   - First 0.1 points: 100% value
   - Next 0.1 points: 80% value
   - Next 0.1 points: 60% value
   - Next 0.1 points: 40% value
   - Any additional: 20% value
5. **Maximum Quality Boost**: Capped at +0.4 stars regardless of number of quality indicators
6. **Rating Ceilings**: Specific caps based on risk levels:
   - Facilities with recent high-risk violations: Maximum 4.0 stars
   - Facilities with very high risk scores (>60): Maximum 3.0 stars
   - Temporarily closed/inactive facilities: Maximum 2.5 stars

### Subcategory Score Calculation

Each subcategory utilizes a distinct calculation method:

#### 1. Safety & Compliance Score:
- Risk score converted to 1-10 scale (inverted, lower risk = higher rating)
- Violation counts and severity weighted
- Recent violations receive greater weight than older violations

#### 2. Operational Quality Score:
- Base score of 5 (average) adjusted based on operational factors
- Factors include:
  - Extended hours (+0.03 to +0.09 stars, scaled to 10-point scale)
  - Weekend availability (+0.03 to +0.09 stars, scaled)
  - Subsidy acceptance (+0.06 stars, scaled)
  - Specialized care options (+0.03 to +0.06 stars, scaled)
- Penalties for facilities with special conditions or temporary closures

#### 3. Educational Programming Score:
- Base score of 5 adjusted based on educational indicators
- Factors include:
  - Curriculum methods (Montessori, Reggio Emilia, STEM, etc.)
  - Accreditations (NAEYC, NECPA, etc.)
  - Educational keywords in service descriptions

#### 4. Staff Qualifications Score:
- Base score of 5 adjusted based on staff qualification indicators
- Factors include:
  - Degrees and certifications
  - Professional training
  - Experience levels
  - Staff-to-child ratios

## API Access

The tiered rating system is accessible through dedicated API endpoints:

### 1. List Tiered Ratings

`GET /api/ratings/tiered`

Returns a list of daycare ratings with both overall star ratings and subcategory scores.

### 2. Get Specific Daycare Tiered Rating

`GET /api/ratings/tiered/operation/:operationId`

Returns detailed rating information for a specific daycare, including all subcategory scores and quality indicators.

### 3. Get Subcategory Distribution Statistics

`GET /api/ratings/tiered/distribution/subcategories`

Returns statistical information about the distribution of scores across all subcategories.

## Data Structure

The tiered rating data structure includes:

```json
{
  "operation_id": "123456",
  "overall_rating": 4.5,
  "safety_compliance_score": 8.5,
  "operational_quality_score": 7.2,
  "educational_programming_score": 9.0,
  "staff_qualifications_score": 6.8,
  "subcategories": {
    "scores": {
      "safety_compliance": 8.5,
      "operational_quality": 7.2,
      "educational_programming": 9.0,
      "staff_qualifications": 6.8
    },
    "descriptions": {
      "safety_compliance": "Measures regulatory compliance and safety factors including violation history, risk scores, and safety protocols.",
      "operational_quality": "Evaluates hours of operation, weekend availability, subsidy acceptance, and other operational conveniences.",
      "educational_programming": "Assesses curriculum quality, accreditations, and educational approach based on available information.",
      "staff_qualifications": "Examines staff credentials, training levels, and professional development opportunities."
    },
    "tooltip_info": {
      // Expanded details for user interfaces
    }
  },
  "OPERATION_NAME": "Sample Daycare",
  "OPERATION_TYPE": "Licensed Center",
  // Additional daycare information...
}
```

## Interpretation Guidelines

### Overall Star Rating

- **5 Stars**: Exceptional in most dimensions, minimal risk
- **4.5 Stars**: Excellent with minor limitations in some areas
- **4 Stars**: Very good with some room for improvement
- **3.5 Stars**: Good but with notable limitations
- **3 Stars**: Average quality meeting basic expectations
- **2.5 Stars**: Below average with some concerning factors
- **2 Stars or below**: Significant concerns in multiple areas

### Subcategory Scores

- **9-10**: Exceptional performance in this category
- **7-8.9**: Strong performance with minimal limitations
- **5-6.9**: Average performance meeting basic expectations
- **3-4.9**: Below average with notable limitations
- **1-2.9**: Poor performance with significant concerns

## Using the Tiered System

The tiered rating system allows parents to:

1. **Get a quick overview** using the familiar star rating
2. **Dive deeper** into specific areas of interest using subcategory scores
3. **Make personalized decisions** based on family priorities:
   - Parents concerned primarily with safety can focus on the Safety & Compliance score
   - Parents needing extended hours can prioritize the Operational Quality score
   - Parents focused on education can emphasize the Educational Programming score
   - Parents interested in teacher quality can prioritize the Staff Qualifications score

This comprehensive approach ensures that parents can make informed childcare decisions based on what matters most to their family, without being overwhelmed by too much information or limited by overly simplistic ratings.