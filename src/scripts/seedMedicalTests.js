/**
 * Mock Data Seeder Script
 *
 * Run: npm run seed
 *
 * Seeds the database with health packages (same data as the old
 * frontend HEALTH_PACKAGES) plus a few individual tests.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Test from '../modules/medical-test/models/medical-test.model.js';

dotenv.config();

// Category-wise breakdown for the Smart Full Body package
const SMART_FULL_BODY_DETAILS = [
    {
        title: 'Complete Hemogram (CBC Profile)',
        testsCount: 24,
        icon: '🩸',
        items: [
            'Hemoglobin (Hb)',
            'Total Leucocyte Count (TLC / WBC)',
            'Differential Leucocyte Count (DLC)',
            'Neutrophils & Lymphocytes',
            'Monocytes, Eosinophils & Basophils',
            'Absolute Neutrophil / Lymphocyte Count',
            'Platelet Count',
            'Total RBC Count',
            'Packed Cell Volume (PCV / Hematocrit)',
            'Mean Corpuscular Volume (MCV)',
            'Mean Corpuscular Hemoglobin (MCH)',
            'Mean Corpuscular Hb Concentration (MCHC)',
            'Red Cell Distribution Width (RDW-CV & RDW-SD)',
            'Erythrocyte Sedimentation Rate (ESR)'
        ]
    },
    {
        title: 'Diabetes Screen (Free HbA1c Included)',
        testsCount: 3,
        icon: '🩺',
        items: [
            'HbA1c (Glycosylated Hemoglobin - 3 Month Average Sugar)',
            'Estimated Average Glucose (eAG)',
            'Blood Glucose (Fasting / Random)'
        ]
    },
    {
        title: 'Lipid Profile (Cardiac Risk Screen)',
        testsCount: 8,
        icon: '❤️',
        items: [
            'Total Cholesterol',
            'HDL Cholesterol (Good Cholesterol)',
            'LDL Cholesterol (Bad Cholesterol)',
            'Triglycerides',
            'VLDL Cholesterol',
            'Cholesterol / HDL Ratio',
            'LDL / HDL Ratio',
            'Non-HDL Cholesterol'
        ]
    },
    {
        title: 'Liver Function Profile (LFT)',
        testsCount: 11,
        icon: '🫁',
        items: [
            'Bilirubin Total',
            'Bilirubin Direct (Conjugated)',
            'Bilirubin Indirect (Unconjugated)',
            'SGOT / AST (Aspartate Aminotransferase)',
            'SGPT / ALT (Alanine Aminotransferase)',
            'Serum Alkaline Phosphatase (ALP)',
            'Total Serum Protein',
            'Serum Albumin',
            'Serum Globulin',
            'Albumin / Globulin (A/G) Ratio',
            'Gamma GT (GGT)'
        ]
    },
    {
        title: 'Kidney Function Profile (KFT / RFT)',
        testsCount: 6,
        icon: '🧬',
        items: [
            'Serum Creatinine',
            'Blood Urea Nitrogen (BUN)',
            'Serum Urea',
            'Serum Uric Acid',
            'BUN / Serum Creatinine Ratio',
            'Urea / Creatinine Ratio'
        ]
    },
    {
        title: 'Thyroid Function Profile',
        testsCount: 3,
        icon: '🦋',
        items: [
            'Total Triiodothyronine (T3)',
            'Total Thyroxine (T4)',
            'Thyroid Stimulating Hormone (TSH - Ultrasensitive)'
        ]
    },
    {
        title: 'Bone & Electrolyte Health Profile',
        testsCount: 4,
        icon: '🦴',
        items: ['Serum Calcium', 'Serum Phosphorus', 'Serum Sodium', 'Serum Potassium']
    },
    {
        title: 'Complete Urine Examination (CUE / Routine)',
        testsCount: 25,
        icon: '🧫',
        items: [
            'Color & Appearance',
            'Specific Gravity & pH',
            'Urine Protein / Albumin',
            'Urine Glucose / Sugar',
            'Ketone Bodies',
            'Bile Salts & Bile Pigments',
            'Urobilinogen',
            'Pus Cells / Leucocytes',
            'Epithelial Cells',
            'Red Blood Cells (RBCs)',
            'Crystals & Casts',
            'Bacteria & Microscopic Examination'
        ]
    }
];

const healthPackages = [
    {
        slug: 'full-body-smart',
        name: 'Smart Full Body Health Checkup',
        badge: 'MOST POPULAR • 60% OFF',
        testsCount: 84,
        originalPrice: 1999,
        discountedPrice: 799,
        price: 799,
        popular: true,
        category: 'Full Body',
        description:
            'Comprehensive preventive health checkup covering 84 vital parameters including Free HbA1c, Liver, Kidney, Thyroid, Heart, and Complete Blood Count.',
        fastingRequired: true,
        reportTime: '12-15 Hours',
        highlights: [
            'Free HbA1c & Fasting Glucose',
            'Liver & Kidney Function Profiles',
            'Complete Lipid Profile (Heart Risk)',
            'Thyroid Profile (T3, T4, TSH)',
            'Free Home Sample Collection',
            'Free Doctor Report Consultation'
        ],
        details: SMART_FULL_BODY_DETAILS,
        isAvailable: true
    },
    {
        slug: 'diabetes-comprehensive',
        name: 'Diabetes Care & HbA1c Profile',
        badge: 'SPECIAL CARE',
        testsCount: 15,
        originalPrice: 999,
        discountedPrice: 499,
        price: 499,
        popular: false,
        category: 'Diabetes',
        description:
            'Evaluates 3-month average sugar control, fasting blood glucose, and early kidney damage markers.',
        fastingRequired: true,
        reportTime: '10-12 Hours',
        highlights: [
            'HbA1c (Glycosylated Hemoglobin)',
            'Fasting Blood Glucose',
            'Serum Creatinine & Urine Microalbumin',
            'Free Report Analysis by Doctor'
        ],
        isAvailable: true
    },
    {
        slug: 'thyroid-profile',
        name: 'Complete Thyroid Profile (T3, T4, TSH)',
        badge: 'BESTSELLER',
        testsCount: 3,
        originalPrice: 599,
        discountedPrice: 399,
        price: 399,
        popular: false,
        category: 'Thyroid',
        description:
            'Precise hormonal assessment for hypo/hyper-thyroidism, fatigue, unexplained weight changes, and hair loss.',
        fastingRequired: false,
        reportTime: 'Same Day',
        highlights: [
            'Total Triiodothyronine (T3)',
            'Total Thyroxine (T4)',
            'Ultrasensitive TSH',
            'NABL Accredited Double Verification'
        ],
        isAvailable: true
    },
    {
        slug: 'cardiac-heart-screen',
        name: 'Healthy Heart & Lipid Screening',
        badge: 'CARDIO RISK',
        testsCount: 28,
        originalPrice: 1499,
        discountedPrice: 899,
        price: 899,
        popular: false,
        category: 'Heart',
        description:
            'Full lipid fraction analysis, cholesterol ratios, and cardiac risk markers for preventive cardiology.',
        fastingRequired: true,
        reportTime: '12 Hours',
        highlights: [
            'Total Cholesterol & Triglycerides',
            'HDL (Good) & LDL (Bad) Cholesterol',
            'VLDL & Non-HDL Cholesterol Ratio',
            'High Sensitivity CRP (hs-CRP)'
        ],
        isAvailable: true
    },
    {
        slug: 'womens-wellness',
        name: 'Women’s Wellness & Hormonal Screen',
        badge: 'WOMEN CARE',
        testsCount: 68,
        originalPrice: 2499,
        discountedPrice: 999,
        price: 999,
        popular: false,
        category: 'Women Health',
        description:
            'Specialized full body checkup designed for women, screening anemia, thyroid, calcium, vitamin D, and metabolic health.',
        fastingRequired: true,
        reportTime: '15 Hours',
        highlights: [
            'Serum Iron & Ferritin (Anemia)',
            'Calcium & Vitamin D3 Deficiency',
            'Complete Thyroid & Hormonal Screen',
            'CBC + LFT + KFT + Urine Analysis'
        ],
        isAvailable: true
    },
    {
        slug: 'senior-citizen',
        name: 'Senior Citizen Vital Care Package',
        badge: 'SENIOR CARE (60+)',
        testsCount: 92,
        originalPrice: 2999,
        discountedPrice: 1299,
        price: 1299,
        popular: false,
        category: 'Senior Health',
        description:
            'Advanced geriatric screening package covering joints, bone density markers, diabetes, heart, kidney, and liver.',
        fastingRequired: true,
        reportTime: '15-18 Hours',
        highlights: [
            'Rheumatoid Factor & Uric Acid',
            'Bone Health: Calcium & Alkaline Phosphatase',
            'Full Cardiac & Renal Risk Assessment',
            'Priority Home Pickup & Dedicated Support'
        ],
        isAvailable: true
    }
];

// Individual tests (kept from your original seed)
const individualTests = [
    {
        name: 'Complete Blood Count (CBC)',
        description: 'Comprehensive blood panel measuring red blood cells, white blood cells, platelets, and hemoglobin levels.',
        price: 299,
        category: 'Blood',
        fastingRequired: false,
        reportTime: 'Same Day',
        isAvailable: true
    },
    {
        name: 'Blood Sugar Fasting',
        description: 'Measures fasting glucose levels after 8-12 hours of no food or drink. Used for diabetes screening and monitoring.',
        price: 149,
        category: 'Blood',
        fastingRequired: true,
        reportTime: '6-8 Hours',
        isAvailable: true
    },
    {
        name: 'Lipid Profile',
        description: 'Evaluates cholesterol levels including total cholesterol, triglycerides, HDL, and LDL. Essential for heart health assessment.',
        price: 499,
        category: 'Blood',
        fastingRequired: true,
        reportTime: '12 Hours',
        isAvailable: true
    },
    {
        name: 'Urine Routine & Microscopy',
        description: 'Analyzes urine for infections, protein, glucose, and abnormal cells. A standard diagnostic test for kidney and urinary tract health.',
        price: 199,
        category: 'Urine',
        fastingRequired: false,
        reportTime: 'Same Day',
        isAvailable: true
    },
    {
        name: 'Chest X-Ray',
        description: 'Digital imaging of the lungs, heart, and chest bones. Used to detect pneumonia, tuberculosis, and other respiratory conditions.',
        price: 399,
        category: 'Radiology',
        fastingRequired: false,
        reportTime: '4-6 Hours',
        isAvailable: true
    },
    {
        name: 'Kidney Function Test (KFT)',
        description: 'Measures creatinine, urea, and uric acid levels to evaluate kidney health and detect early signs of renal dysfunction.',
        price: 449,
        category: 'Blood',
        fastingRequired: false,
        reportTime: '12 Hours',
        isAvailable: false
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await Test.deleteMany({});
        console.log('🗑️  Cleared existing tests');

        const insertedTests = await Test.insertMany([...healthPackages, ...individualTests]);
        console.log(`\n🌱 Successfully seeded ${insertedTests.length} medical tests:\n`);

        insertedTests.forEach(t => {
            const status = t.isAvailable ? '✔ Available' : '✘ Unavailable';
            console.log(`   [${t.category}] ${t.name} — ₹${t.price} — ${status}`);
        });
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB. Seeding complete!');
        process.exit(0);
    }
};

seedDB();