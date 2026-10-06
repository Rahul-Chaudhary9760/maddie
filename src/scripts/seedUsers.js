/**
 * User Seeder Script
 *
 * Run: npm run seed:users
 *
 * Creates one test account for each role: admin, lab_staff, user
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../modules/auth/models/user.model.js';

dotenv.config();

const testUsers = [
    {
        name: 'Super Admin',
        email: 'admin@maddie.com',
        password: 'admin@123',
        role: 'admin'
    },
    {
        name: 'Lab Staff One',
        email: 'labstaff@maddie.com',
        password: 'labstaff@123',
        role: 'lab_staff'
    },
    {
        name: 'Test User',
        email: 'user@maddie.com',
        password: 'user@123',
        role: 'user'
    }
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Remove existing test accounts (by email) to avoid duplicates
        const emails = testUsers.map(u => u.email);
        await User.deleteMany({ email: { $in: emails } });
        console.log('🗑️  Cleared existing test accounts\n');

        // Create users one-by-one so pre-save hook (bcrypt) runs for each
        const created = [];
        for (const userData of testUsers) {
            const user = await User.create(userData);
            created.push(user);
        }

        console.log(`🌱 Successfully created ${created.length} test users:\n`);
        console.log('┌─────────────┬──────────────────────┬──────────────────┐');
        console.log('│ Role        │ Email                │ Password         │');
        console.log('├─────────────┼──────────────────────┼──────────────────┤');
        created.forEach(u => {
            const role     = u.role.padEnd(11);
            const email    = u.email.padEnd(20);
            const password = testUsers.find(t => t.email === u.email).password.padEnd(16);
            console.log(`│ ${role} │ ${email} │ ${password} │`);
        });
        console.log('└─────────────┴──────────────────────┴──────────────────┘');

        console.log('\n⚠️  These are test credentials — do NOT use in production!\n');

    } catch (error) {
        console.error('❌ User seeding failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB. Done!');
        process.exit(0);
    }
};

seedUsers();
