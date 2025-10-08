/**
 * Enhanced Risk Factors and Recommendation Templates
 * 
 * This file contains comprehensive risk factor keywords and recommendation templates
 * for the daycare risk analysis system.
 */

// Comprehensive risk factor keywords
const RISK_FACTOR_KEYWORDS = {
  'supervision': {
    keywords: [
      'supervision', 'unsupervised', 'ratio', 'caregiver ratio', 'teacher ratio',
      'attention', 'line of sight', 'monitor', 'watching', 'unattended', 
      'alone', 'left alone', 'wandered', 'missing', 'count', 'headcount',
      'attendance', 'tracking', 'lost child', 'not supervised', 'inadequate supervision',
      'insufficient staff', 'understaffed', 'caregiver', 'group size'
    ],
    description: 'Supervision and staff-to-child ratio concerns'
  },
  
  'safety': {
    keywords: [
      'hazard', 'safety', 'danger', 'secure', 'security', 'emergency', 'fire', 
      'evacuation', 'drill', 'plan', 'exit', 'accident', 'injury', 'first aid', 
      'incident', 'sharp', 'harmful', 'fall', 'burn', 'shock', 'choke', 'choking',
      'drowning', 'water', 'fence', 'gate', 'lock', 'escape', 'access', 'unauthorized',
      'poison', 'toxic', 'chemicals', 'reach', 'child-proof', 'childproof', 'protected',
      'safety plan', 'emergency procedures', 'danger', 'unsafe', 'tripping', 'trip hazard',
      'fire extinguisher', 'emergency exit', 'smoke detector', 'alarm', 'harness', 'restraint'
    ],
    description: 'Safety hazards and emergency preparedness issues'
  },
  
  'health': {
    keywords: [
      'sanitary', 'health', 'illness', 'sick', 'disease', 'infection', 'contagious',
      'medicine', 'medication', 'prescription', 'medical', 'allergy', 'allergies', 
      'allergic', 'immunization', 'vaccine', 'record', 'clean', 'hygiene', 'sanitation',
      'diaper', 'changing', 'handwashing', 'hand-washing', 'wash hands', 'washing',
      'disinfect', 'sanitize', 'contaminated', 'food safety', 'food handling', 'kitchen',
      'nutrition', 'meal', 'feeding', 'formula', 'breast milk', 'breastmilk', 'snack',
      'special diet', 'dietary', 'restriction', 'medical condition', 'health statement',
      'physician', 'doctor', 'nurse', 'medical emergency', 'medical plan', 'bottle',
      'expired', 'temperature', 'refrigerator', 'spoiled', 'pest', 'rodent', 'insect'
    ],
    description: 'Health, sanitation, and medication management issues'
  },
  
  'training': {
    keywords: [
      'training', 'qualified', 'certification', 'CPR', 'first aid', 'credential',
      'background check', 'clearance', 'experience', 'knowledge', 'competent', 'skilled',
      'professional development', 'continuing education', 'education', 'course', 'workshop',
      'orientation', 'onboarding', 'hiring', 'staff', 'employee', 'director', 'teacher',
      'caregiver', 'qualification', 'preparation', 'trained', 'untrained', 'unqualified',
      'clock hours', 'annual training', 'required training', 'mandatory training',
      'expired certification', 'renewal', 'pediatric', 'child development'
    ],
    description: 'Staff training, qualifications, and background check issues'
  },
  
  'facility': {
    keywords: [
      'building', 'facility', 'structure', 'maintenance', 'repair', 'broken', 'damaged',
      'playground', 'outdoor', 'equipment', 'toys', 'furniture', 'fixture', 'appliance',
      'plumbing', 'electrical', 'lighting', 'ventilation', 'air quality', 'HVAC', 
      'temperature', 'cooling', 'heating', 'hot', 'cold', 'leak', 'moisture', 'mold',
      'mildew', 'paint', 'peeling', 'chipping', 'flooring', 'carpet', 'tile', 'ceiling',
      'wall', 'window', 'door', 'cabinet', 'storage', 'toilet', 'bathroom', 'sink',
      'clean', 'dirty', 'unsanitary', 'pest', 'rodent', 'insect', 'trash', 'garbage',
      'waste', 'clutter', 'crowded', 'space', 'square feet', 'surface', 'impact',
      'cushioning', 'surfacing', 'outdoor play', 'fence', 'gate'
    ],
    description: 'Facility maintenance, equipment, and environmental issues'
  },
  
  'discipline': {
    keywords: [
      'discipline', 'punishment', 'behavior', 'management', 'guidance', 'redirect',
      'timeout', 'time out', 'restraint', 'corporal', 'physical', 'harsh', 'yell',
      'scream', 'shout', 'verbal', 'language', 'inappropriate', 'abuse', 'neglect',
      'emotional', 'psychological', 'humiliate', 'embarrass', 'isolate', 'isolation',
      'restrict', 'restriction', 'confine', 'confinement', 'cruel', 'unusual',
      'threat', 'threaten', 'punish', 'force', 'food', 'withhold', 'deny', 'reward',
      'positive reinforcement', 'consequence', 'bribe', 'scare', 'frighten'
    ],
    description: 'Discipline practices and behavior management concerns'
  },
  
  'recordkeeping': {
    keywords: [
      'record', 'documentation', 'form', 'file', 'paperwork', 'document', 'missing',
      'incomplete', 'inaccurate', 'outdated', 'expired', 'permission', 'authorization',
      'consent', 'signature', 'signed', 'parent', 'emergency contact', 'contact information',
      'pickup', 'release', 'medical form', 'health form', 'enrollment', 'registration',
      'admission', 'attendance', 'log', 'incident report', 'accident report', 'policy',
      'handbook', 'agreement', 'contract', 'required document', 'required form',
      'verification', 'certificate', 'license', 'permit', 'inspection', 'compliance'
    ],
    description: 'Record-keeping, documentation, and administrative issues'
  },
  
  'sleep': {
    keywords: [
      'sleep', 'nap', 'rest', 'crib', 'mat', 'cot', 'bedding', 'blanket', 'sheet',
      'pillow', 'SIDS', 'sudden infant death', 'position', 'back', 'tummy', 'side',
      'prone', 'supine', 'swaddle', 'swaddling', 'sleep area', 'sleep environment',
      'sleep surface', 'firm', 'soft', 'suffocation', 'breathing', 'monitor', 'check',
      'sleep policy', 'sleep schedule', 'sleep practice', 'safe sleep', 'sleep training',
      'restrictive device', 'infant sleep', 'toddler sleep', 'sleep supervision'
    ],
    description: 'Sleep safety and practice concerns, especially for infants'
  },
  
  'transportation': {
    keywords: [
      'transportation', 'vehicle', 'car', 'bus', 'van', 'field trip', 'excursion',
      'outing', 'travel', 'driver', 'license', 'driving record', 'seat belt', 'seatbelt',
      'car seat', 'booster', 'restraint', 'safety belt', 'buckle', 'unbuckled', 'unrestrained',
      'pick up', 'drop off', 'loading', 'unloading', 'transition', 'supervision',
      'checklist', 'count', 'left behind', 'forgot', 'insurance', 'maintenance',
      'inspection', 'sign out', 'sign in', 'permission', 'transportation log'
    ],
    description: 'Transportation safety and vehicle-related concerns'
  },
  
  'nutrition': {
    keywords: [
      'food', 'nutrition', 'meal', 'snack', 'menu', 'diet', 'feed', 'feeding', 'eat',
      'hunger', 'hungry', 'thirst', 'thirsty', 'drink', 'water', 'beverage', 'formula',
      'breast milk', 'breastmilk', 'allergy', 'allergic', 'intolerance', 'restriction',
      'special diet', 'preparation', 'serve', 'serving', 'portion', 'calorie', 'nutrient',
      'kitchen', 'cooking', 'food handler', 'food safety', 'temperature', 'spoiled',
      'expired', 'refrigerated', 'storage', 'contamination', 'cross-contamination',
      'handwashing', 'utensil', 'dishes', 'sanitize', 'clean', 'food-borne', 'foodborne'
    ],
    description: 'Food safety, nutrition, and feeding concerns'
  },
  
  'child_wellbeing': {
    keywords: [
      'wellbeing', 'well-being', 'welfare', 'care', 'neglect', 'abuse', 'mistreatment',
      'maltreatment', 'emotional', 'physical', 'psychological', 'development', 'developmental',
      'stimulation', 'activity', 'play', 'learning', 'education', 'curriculum', 'screen time',
      'television', 'tablet', 'phone', 'device', 'outdoor time', 'exercise', 'physical activity',
      'mental health', 'comfort', 'distress', 'crying', 'attention', 'needs', 'responsive',
      'interaction', 'engage', 'engagement', 'nurturing', 'attachment', 'bonding'
    ],
    description: 'Child well-being, development, and emotional concerns'
  }
};

// Comprehensive recommendation templates
const RECOMMENDATION_TEMPLATES = {
  'supervision': [
    'Ask about the teacher-to-child ratios in each classroom and how they compare to state requirements',
    'Inquire about supervision policies during transitions, playground time, and nap time',
    'Ask how staff ensure all children are accounted for throughout the day, especially during transitions',
    'Discuss how the center handles staff breaks and substitutes to maintain proper supervision',
    'Ask about their system for tracking which children are present each day',
    'Inquire about how they handle pickup procedures to ensure children only leave with authorized individuals',
    'Ask about staffing patterns throughout the day and if ratios ever change'
  ],
  
  'safety': [
    'Ask about emergency evacuation procedures and how often they practice fire and severe weather drills',
    'Inquire about security measures for entering/exiting the building and preventing unauthorized access',
    'Ask how they manage fire safety and hazard prevention throughout the facility',
    'Request information about their procedures for playground safety inspections',
    'Ask about how they ensure toys and equipment are age-appropriate and in good condition',
    'Inquire about their protocols for handling injuries and medical emergencies',
    'Ask about how hazardous materials are stored and secured away from children',
    'Discuss their policy on checking the safety of sleeping equipment, especially for infants',
    'Ask about water safety procedures if the facility has water features or plans water activities'
  ],
  
  'health': [
    'Ask about their illness policy and the specific symptoms that require a child to stay home',
    'Inquire about their medication administration procedures and documentation requirements',
    'Ask about their food allergy management protocols and how they prevent cross-contamination',
    'Discuss how they handle diaper changing, handwashing, and sanitizing routines',
    'Ask about cleaning and disinfection schedules for toys, surfaces, and common areas',
    'Inquire about their immunization requirements and documentation policies',
    'Discuss how they communicate health concerns to parents (such as exposure to illness)',
    'Ask about their protocols for handling children with special health needs',
    'Request information about daily health checks and how they monitor children for signs of illness',
    'Inquire about staff hygiene policies and sick leave procedures for employees'
  ],
  
  'training': [
    'Ask about required staff certifications and ongoing training requirements',
    'Inquire about CPR, first aid, and emergency response training for all staff members',
    'Ask how new staff are trained on policies, procedures, and child development',
    'Discuss the educational backgrounds and experience levels of classroom teachers',
    'Ask about director qualifications and experience in early childhood education',
    'Inquire about staff background check procedures and ongoing screening',
    'Ask about staff retention rates and turnover at the center',
    'Discuss ongoing professional development opportunities for teachers',
    'Ask about staff training specific to age groups they supervise (infant, toddler, preschool)',
    'Inquire about training related to children with special needs or challenging behaviors'
  ],
  
  'facility': [
    'Ask about their playground inspection and maintenance schedule',
    'Inquire about how frequently equipment, toys, and surfaces are cleaned and sanitized',
    'Ask about their building maintenance protocols and how they address repairs',
    'Discuss indoor air quality management and ventilation in the classrooms',
    'Ask about temperature control in the building during extreme weather',
    'Inquire about pest control procedures and use of chemicals in the facility',
    'Ask to see all areas your child will use, including bathrooms, playground, and nap spaces',
    'Discuss the age-appropriateness of toys and equipment in your child\'s classroom',
    'Ask about the center\'s approach to maintaining adequate indoor and outdoor space per child'
  ],
  
  'discipline': [
    'Ask about their behavior management philosophy and discipline policies',
    'Inquire about how teachers handle common challenging behaviors for your child\'s age group',
    'Discuss specific techniques used to redirect children and teach appropriate behaviors',
    'Ask how staff communicate with parents about behavioral concerns',
    'Inquire about their policy on time-outs, if used, and other consequences',
    'Ask about positive reinforcement strategies and how good behavior is encouraged',
    'Discuss how the center handles conflicts between children',
    'Ask about their approach to helping children develop self-regulation skills',
    'Inquire about how they accommodate children with behavioral or emotional challenges'
  ],
  
  'recordkeeping': [
    'Ask about the types of records they maintain for each child and how they ensure accuracy',
    'Inquire about their system for tracking and updating emergency contact information',
    'Discuss their policy on documenting and reporting incidents or accidents',
    'Ask about daily communication logs or apps used to share information with parents',
    'Inquire about how they maintain confidentiality of children\'s records',
    'Ask to review their parent handbook and any forms you\'ll need to complete',
    'Discuss their process for obtaining necessary authorizations for activities or medications'
  ],
  
  'sleep': [
    'Ask about their safe sleep policies, especially for infants',
    'Inquire about sleeping arrangements and how nap areas are set up and supervised',
    'Discuss how they accommodate individual sleep schedules, particularly for babies',
    'Ask about their procedures for checking on sleeping children',
    'Inquire about how they handle children who have difficulty sleeping or wake early',
    'Ask about bedding policies and how often sleep surfaces are cleaned',
    'Discuss their approach to sleep training and whether they follow parent preferences'
  ],
  
  'transportation': [
    'Ask if transportation services are provided and details about routes and schedules',
    'Inquire about vehicle safety features and maintenance schedules',
    'Discuss driver qualifications and training requirements',
    'Ask about child restraint systems used and how they ensure proper installation',
    'Inquire about their procedures for accounting for all children during loading and unloading',
    'Ask about field trip policies and parent notification procedures',
    'Discuss supervision during transportation and staff-to-child ratios in vehicles'
  ],
  
  'nutrition': [
    'Ask to see sample menus and how often they rotate',
    'Inquire about food preparation practices and who prepares the meals',
    'Discuss how special dietary needs and food allergies are accommodated',
    'Ask about feeding schedules and flexibility for different age groups',
    'Inquire about their policy on bringing food from home',
    'Ask about their approach to introducing new foods and encouraging healthy eating',
    'Discuss hydration practices and how they ensure children have access to water throughout the day',
    'Ask about their policies on celebration foods and treats for special occasions'
  ],
  
  'child_wellbeing': [
    'Ask about their curriculum and daily activities for your child\'s age group',
    'Inquire about their approach to supporting children\'s emotional development',
    'Discuss the balance between structured learning time and free play',
    'Ask about outdoor time and physical activity opportunities',
    'Inquire about their policy on screen time and use of technology',
    'Ask how teachers help children develop social skills and friendships',
    'Discuss how they support transitions between activities and handle separation anxiety',
    'Ask about their approach to cultural diversity and inclusion'
  ],
  
  'general': [
    'Request a tour during normal operating hours to observe classroom dynamics and staff interactions',
    'Ask about opportunities for parent involvement and how they maintain communication with families',
    'Inquire about their hours of operation, holiday schedule, and closure policies',
    'Discuss their policy for handling parent concerns or complaints',
    'Ask about staff-to-child ratios throughout the day and in different classrooms',
    'Request to observe your child\'s potential classroom for at least 30 minutes',
    'Ask about their daily schedule and how they balance different types of activities',
    'Inquire about how they help children transition to new classrooms as they grow',
    'Ask what makes their center unique compared to others in the area',
    'Discuss tuition, payment policies, and any additional fees'
  ]
};

module.exports = {
  RISK_FACTOR_KEYWORDS,
  RECOMMENDATION_TEMPLATES
};