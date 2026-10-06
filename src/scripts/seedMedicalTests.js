/**
 * Mock Data Seeder Script
 *
 * Run: npm run seed
 *
 * Seeds the database with sample medical tests for testing purposes.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Test from '../modules/medical-test/models/medical-test.model.js';

dotenv.config();

const mockTests = [
    {
        name: "Complete Blood Count (CBC)",
        description: "Comprehensive blood panel measuring red blood cells, white blood cells, platelets, and hemoglobin levels.",
        price: 299,
        category: "Blood",
        isAvailable: true
    },
    {
        name: "Blood Sugar Fasting",
        description: "Measures fasting glucose levels after 8-12 hours of no food or drink. Used for diabetes screening and monitoring.",
        price: 149,
        category: "Blood",
        isAvailable: true
    },
    {
        name: "Lipid Profile",
        description: "Evaluates cholesterol levels including total cholesterol, triglycerides, HDL, and LDL. Essential for heart health assessment.",
        price: 499,
        category: "Blood",
        isAvailable: true
    },
    {
        name: "Urine Routine & Microscopy",
        description: "Analyzes urine for infections, protein, glucose, and abnormal cells. A standard diagnostic test for kidney and urinary tract health.",
        price: 199,
        category: "Urine",
        isAvailable: true
    },
    {
        name: "Chest X-Ray",
        description: "Digital imaging of the lungs, heart, and chest bones. Used to detect pneumonia, tuberculosis, and other respiratory conditions.",
        price: 399,
        category: "Radiology",
        isAvailable: true
    },
    {
        name: "Full Body Checkup",
        description: "A comprehensive health package covering 50+ parameters including CBC, liver function, kidney function, thyroid, lipid profile, and urine analysis.",
        price: 1999,
        category: "Full Body",
        isAvailable: true
    },
    {
        name: "Thyroid Profile (T3, T4, TSH)",
        description: "Assesses thyroid gland function by measuring T3, T4, and TSH hormone levels. Helps diagnose hypothyroidism and hyperthyroidism.",
        price: 599,
        category: "Blood",
        isAvailable: true
    },
    {
        name: "Kidney Function Test (KFT)",
        description: "Measures creatinine, urea, and uric acid levels to evaluate kidney health and detect early signs of renal dysfunction.",
        price: 449,
        category: "Blood",
        isAvailable: false
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await Test.deleteMany({});
        console.log('🗑️  Cleared existing tests');

        const insertedTests = await Test.insertMany(mockTests);
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
