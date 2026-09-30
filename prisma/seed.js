import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Seeded credentials (for local development only - never use in production):
// User 1: alice@eve.health / DevPass1
// User 2: bob@eve.health   / DevPass1

async function main() {
  console.log('Seeding database...');

  // Users
  const passwordHash = await bcrypt.hash('DevPass1', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@eve.health' },
    update: {},
    create: { name: 'Alice Sharma', email: 'alice@eve.health', passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@eve.health' },
    update: {},
    create: { name: 'Bob Mehta', email: 'bob@eve.health', passwordHash },
  });

  // Diagnostic Centres
  const centres = await Promise.all([
    prisma.diagnosticCentre.upsert({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      update: {},
      create: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Apollo Diagnostics - Andheri',
        location: 'Andheri West, Mumbai, Maharashtra',
      },
    }),
    prisma.diagnosticCentre.upsert({
      where: { id: '22222222-2222-2222-2222-222222222222' },
      update: {},
      create: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Metropolis Healthcare - Bandra',
        location: 'Bandra East, Mumbai, Maharashtra',
      },
    }),
    prisma.diagnosticCentre.upsert({
      where: { id: '33333333-3333-3333-3333-333333333333' },
      update: {},
      create: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'SRL Diagnostics - Pune',
        location: 'Koregaon Park, Pune, Maharashtra',
      },
    }),
  ]);

  // Diagnostic Tests
  const tests = await Promise.all([
    prisma.diagnosticTest.upsert({
      where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      update: {},
      create: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Complete Blood Count (CBC)',
        description: 'Full haematology panel including WBC, RBC, platelets, haemoglobin, and haematocrit.',
        price: 499.00,
      },
    }),
    prisma.diagnosticTest.upsert({
      where: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
      update: {},
      create: {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Lipid Profile',
        description: 'Measures cholesterol, triglycerides, HDL, LDL, and VLDL levels.',
        price: 799.00,
      },
    }),
    prisma.diagnosticTest.upsert({
      where: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
      update: {},
      create: {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'HbA1c (Glycated Haemoglobin)',
        description: 'Indicates average blood glucose over the past 2-3 months. Key diabetes marker.',
        price: 649.00,
      },
    }),
    prisma.diagnosticTest.upsert({
      where: { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
      update: {},
      create: {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'Thyroid Function Test (TFT)',
        description: 'Measures TSH, T3, and T4 levels to assess thyroid gland activity.',
        price: 899.00,
      },
    }),
    prisma.diagnosticTest.upsert({
      where: { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' },
      update: {},
      create: {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        name: 'Vitamin D (25-OH)',
        description: 'Serum 25-hydroxyvitamin D level assessment.',
        price: 1299.00,
      },
    }),
  ]);

  // Centre-Test associations
  const associations = [
    // Apollo Andheri offers CBC, Lipid Profile, TFT
    { centreId: centres[0].id, testId: tests[0].id },
    { centreId: centres[0].id, testId: tests[1].id },
    { centreId: centres[0].id, testId: tests[3].id },
    // Metropolis Bandra offers CBC, HbA1c, Vitamin D
    { centreId: centres[1].id, testId: tests[0].id },
    { centreId: centres[1].id, testId: tests[2].id },
    { centreId: centres[1].id, testId: tests[4].id },
    // SRL Pune offers all five
    { centreId: centres[2].id, testId: tests[0].id },
    { centreId: centres[2].id, testId: tests[1].id },
    { centreId: centres[2].id, testId: tests[2].id },
    { centreId: centres[2].id, testId: tests[3].id },
    { centreId: centres[2].id, testId: tests[4].id },
  ];

  for (const assoc of associations) {
    await prisma.centreTest.upsert({
      where: { centreId_testId: { centreId: assoc.centreId, testId: assoc.testId } },
      update: {},
      create: assoc,
    });
  }

  console.log('✓ Seeded users:', alice.email, bob.email);
  console.log('✓ Seeded centres:', centres.map((c) => c.name).join(', '));
  console.log('✓ Seeded tests:', tests.map((t) => t.name).join(', '));
  console.log('✓ Seeded', associations.length, 'centre-test associations');
  console.log('\nDev credentials:');
  console.log('  alice@eve.health / DevPass1');
  console.log('  bob@eve.health   / DevPass1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
