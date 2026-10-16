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
import Phlebotomist from '../modules/phlebotomist/models/phlebotomist.model.js';

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
        role: 'user',
        phone: '+91 9123456789'
    }
];

const testPhlebotomists = [
    {
        name: 'Rajesh Sharma (Phlebo)',
        email: 'phlebo@maddie.com',
        password: 'phlebo@123',
        phone: '+91 9876543210',
        vehicleType: 'Hero Splendor (Bike)',
        servicePincodes: ['110001', '110002', '110016']
    },
    {
        name: 'Anita Verma (Phlebo)',
        email: 'anita.phlebo@maddie.com',
        password: 'phlebo@123',
        phone: '+91 9876543211',
        vehicleType: 'Honda Activa (Scooter)',
        servicePincodes: ['110020', '110024', '110048']
    }
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Clear existing test accounts
        await User.deleteMany({ email: { $in: testUsers.map(u => u.email) } });
        await Phlebotomist.deleteMany({ email: { $in: testPhlebotomists.map(p => p.email) } });
        console.log('🗑️  Cleared existing test users and phlebotomists\n');

        // Create users
        const createdUsers = [];
        for (const uData of testUsers) {
            const user = await User.create(uData);
            createdUsers.push(user);
        }

        // Create phlebotomists
        const createdPhlebos = [];
        for (const pData of testPhlebotomists) {
            const phlebo = await Phlebotomist.create(pData);
            createdPhlebos.push(phlebo);
        }

        console.log(`🌱 Successfully created ${createdUsers.length} test users:`);
        console.log('┌──────────────┬──────────────────────────┬──────────────────┐');
        console.log('│ Role         │ Email                    │ Password         │');
        console.log('├──────────────┼──────────────────────────┼──────────────────┤');
        createdUsers.forEach(u => {
            const role     = u.role.padEnd(12);
            const email    = u.email.padEnd(24);
            const password = testUsers.find(t => t.email === u.email).password.padEnd(16);
            console.log(`│ ${role} │ ${email} │ ${password} │`);
        });
        console.log('└──────────────┴──────────────────────────┴──────────────────┘\n');

        console.log(`🩸 Successfully created ${createdPhlebos.length} dedicated phlebotomists:`);
        console.log('┌──────────────────────────┬──────────────────────────┬──────────────────┬─────────────────┐');
        console.log('│ Name                     │ Email                    │ Password         │ Phone           │');
        console.log('├──────────────────────────┼──────────────────────────┼──────────────────┼─────────────────┤');
        createdPhlebos.forEach(p => {
            const name     = p.name.padEnd(24);
            const email    = p.email.padEnd(24);
            const password = testPhlebotomists.find(t => t.email === p.email).password.padEnd(16);
            const phone    = p.phone.padEnd(15);
            console.log(`│ ${name} │ ${email} │ ${password} │ ${phone} │`);
        });
        console.log('└──────────────────────────┴──────────────────────────┴──────────────────┴─────────────────┘');

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
