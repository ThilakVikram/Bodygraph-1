import { randomBytes } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../lib/auth/password";
import { generateMemberCode } from "../lib/utils";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function qrToken() {
  return randomBytes(16).toString("hex");
}

const DAY_MS = 86_400_000;

async function main() {
  console.log("Seeding database...");

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.progressRecord.deleteMany();
  await prisma.dietItem.deleteMany();
  await prisma.dietPlan.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.member.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  const branch = await prisma.branch.create({
    data: { name: "Downtown Branch", address: "123 Main St", phone: "555-0100" },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@bodygraph.dev",
      passwordHash: hashPassword("Admin@123"),
      role: "ADMIN",
      name: "Alex Morgan",
      phone: "555-0101",
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      email: "reception@bodygraph.dev",
      passwordHash: hashPassword("Reception@123"),
      role: "RECEPTIONIST",
      name: "Riley Chen",
      phone: "555-0102",
    },
  });

  const trainerUser1 = await prisma.user.create({
    data: {
      email: "trainer@bodygraph.dev",
      passwordHash: hashPassword("Trainer@123"),
      role: "TRAINER",
      name: "Jordan Blake",
      phone: "555-0103",
    },
  });
  const trainer1 = await prisma.trainer.create({
    data: {
      userId: trainerUser1.id,
      branchId: branch.id,
      specialization: "Strength & Conditioning",
      experienceYears: 6,
      bio: "Certified strength coach focused on progressive overload and injury-safe programming.",
    },
  });

  const trainerUser2 = await prisma.user.create({
    data: {
      email: "trainer2@bodygraph.dev",
      passwordHash: hashPassword("Trainer@123"),
      role: "TRAINER",
      name: "Sam Rivera",
      phone: "555-0104",
    },
  });
  const trainer2 = await prisma.trainer.create({
    data: {
      userId: trainerUser2.id,
      branchId: branch.id,
      specialization: "Weight Loss & Cardio",
      experienceYears: 4,
    },
  });

  const [monthly, quarterly, halfYearly, yearly] = await Promise.all([
    prisma.membershipPlan.create({
      data: {
        name: "Monthly",
        description: "Flexible month-to-month membership.",
        durationDays: 30,
        price: 49,
        features: JSON.stringify(["Full gym access", "Locker access"]),
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: "Quarterly",
        description: "Save more with a 3-month plan.",
        durationDays: 90,
        price: 129,
        features: JSON.stringify(["Full gym access", "Locker access", "1 free trainer session"]),
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: "Half-Yearly",
        description: "6 months of consistent training.",
        durationDays: 182,
        price: 229,
        features: JSON.stringify([
          "Full gym access",
          "Locker access",
          "2 free trainer sessions",
          "Diet consultation",
        ]),
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: "Yearly",
        description: "Best value, billed annually.",
        durationDays: 365,
        price: 399,
        features: JSON.stringify([
          "Full gym access",
          "Locker access",
          "4 free trainer sessions",
          "Diet consultation",
          "Progress tracking",
        ]),
      },
    }),
  ]);

  const memberSeeds = [
    { name: "Taylor Nguyen", email: "member@bodygraph.dev", gender: "FEMALE", trainerId: trainer1.id },
    { name: "Casey Patel", email: "casey@bodygraph.dev", gender: "MALE", trainerId: trainer1.id },
    { name: "Morgan Lee", email: "morgan@bodygraph.dev", gender: "OTHER", trainerId: trainer2.id },
    { name: "Jamie Ortiz", email: "jamie@bodygraph.dev", gender: "MALE", trainerId: trainer2.id },
    { name: "Drew Kim", email: "drew@bodygraph.dev", gender: "FEMALE", trainerId: null },
  ];

  const members = [];
  for (const seed of memberSeeds) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        passwordHash: hashPassword("Member@123"),
        role: "MEMBER",
        name: seed.name,
      },
    });
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        memberCode: generateMemberCode(),
        qrToken: qrToken(),
        branchId: branch.id,
        trainerId: seed.trainerId,
        gender: seed.gender,
        joinDate: new Date(Date.now() - Math.floor(Math.random() * 200) * DAY_MS),
        dateOfBirth: new Date(
          1990 + Math.floor(Math.random() * 15),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        address: "45 Fitness Ave",
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "555-0199",
      },
    });
    members.push(member);
  }

  const now = Date.now();
  const plans = [monthly, quarterly, halfYearly, yearly];
  const membershipConfigs = [
    { startOffsetDays: -20, plan: monthly },
    { startOffsetDays: -85, plan: quarterly },
    { startOffsetDays: -400, plan: yearly },
    { startOffsetDays: -10, plan: halfYearly },
    { startOffsetDays: -5, plan: monthly },
  ];

  for (let i = 0; i < members.length; i++) {
    const cfg = membershipConfigs[i];
    const startDate = new Date(now + cfg.startOffsetDays * DAY_MS);
    const endDate = new Date(startDate.getTime() + cfg.plan.durationDays * DAY_MS);
    const status = endDate.getTime() < now ? "EXPIRED" : "ACTIVE";

    const membership = await prisma.membership.create({
      data: {
        memberId: members[i].id,
        planId: cfg.plan.id,
        startDate,
        endDate,
        status,
        amount: cfg.plan.price,
      },
    });

    await prisma.payment.create({
      data: {
        invoiceNumber: `INV-SEED-${1000 + i}`,
        memberId: members[i].id,
        membershipId: membership.id,
        amount: cfg.plan.price,
        method: i % 2 === 0 ? "CARD" : "CASH",
        status: "PAID",
        paymentDate: startDate,
        recordedById: receptionist.id,
      },
    });
  }
  void plans;

  for (const member of members) {
    for (let d = 0; d < 14; d++) {
      if (Math.random() > 0.55) continue;
      const day = new Date(now - d * DAY_MS);
      day.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
      const checkOut = new Date(day.getTime() + (45 + Math.floor(Math.random() * 60)) * 60_000);
      await prisma.attendance.create({
        data: {
          memberId: member.id,
          checkIn: day,
          checkOut: d === 0 ? null : checkOut,
          method: Math.random() > 0.5 ? "QR" : "MANUAL",
          markedById: receptionist.id,
        },
      });
    }
  }

  const exerciseSeeds = [
    { name: "Barbell Back Squat", category: "Strength", muscleGroup: "Legs" },
    { name: "Bench Press", category: "Strength", muscleGroup: "Chest" },
    { name: "Deadlift", category: "Strength", muscleGroup: "Back" },
    { name: "Pull-Up", category: "Bodyweight", muscleGroup: "Back" },
    { name: "Overhead Press", category: "Strength", muscleGroup: "Shoulders" },
    { name: "Treadmill Run", category: "Cardio", muscleGroup: "Full Body" },
    { name: "Plank", category: "Core", muscleGroup: "Core" },
    { name: "Dumbbell Lunge", category: "Strength", muscleGroup: "Legs" },
  ];
  const exercises = [];
  for (const e of exerciseSeeds) {
    exercises.push(
      await prisma.exercise.create({
        data: {
          ...e,
          createdById: trainerUser1.id,
          description: `${e.name} — standard form.`,
          instructions: "Maintain a neutral spine and controlled tempo.",
        },
      }),
    );
  }

  for (let i = 0; i < 2; i++) {
    const member = members[i];
    const plan = await prisma.workoutPlan.create({
      data: {
        name: i === 0 ? "Strength Foundations" : "Fat Loss Circuit",
        description: "Progressive 4-week plan.",
        memberId: member.id,
        trainerId: trainer1.id,
        startDate: new Date(now - 7 * DAY_MS),
        status: "ACTIVE",
      },
    });
    for (let day = 1; day <= 3; day++) {
      const ex = exercises[(day * 2) % exercises.length];
      await prisma.workoutExercise.create({
        data: {
          workoutPlanId: plan.id,
          exerciseId: ex.id,
          dayOfWeek: day,
          sets: 4,
          reps: "8-10",
          restSeconds: 90,
          order: day,
        },
      });
    }
  }

  for (let i = 0; i < 2; i++) {
    const member = members[i];
    const diet = await prisma.dietPlan.create({
      data: {
        name: "Lean Muscle Nutrition",
        memberId: member.id,
        trainerId: trainer1.id,
        startDate: new Date(now - 7 * DAY_MS),
        status: "ACTIVE",
      },
    });
    const meals = [
      { mealType: "BREAKFAST", foodName: "Oats with berries & whey", calories: 420, protein: 32, carbs: 48, fat: 9 },
      { mealType: "LUNCH", foodName: "Grilled chicken, rice & veggies", calories: 620, protein: 48, carbs: 65, fat: 14 },
      { mealType: "DINNER", foodName: "Salmon, quinoa & greens", calories: 580, protein: 42, carbs: 40, fat: 22 },
      { mealType: "SNACK", foodName: "Greek yogurt & almonds", calories: 260, protein: 18, carbs: 14, fat: 12 },
    ];
    for (let m = 0; m < meals.length; m++) {
      await prisma.dietItem.create({ data: { dietPlanId: diet.id, order: m, ...meals[m] } });
    }
  }

  for (const member of members.slice(0, 3)) {
    for (let w = 0; w < 4; w++) {
      await prisma.progressRecord.create({
        data: {
          memberId: member.id,
          recordedById: trainerUser1.id,
          recordDate: new Date(now - w * 7 * DAY_MS),
          weight: 78 - w * 0.6 + Math.random(),
          bodyFatPercent: 22 - w * 0.4,
          chest: 100 + w * 0.2,
          waist: 88 - w * 0.3,
        },
      });
    }
  }

  const inventorySeeds = [
    { name: "Yoga Mats", category: "Accessories", quantity: 30, minStockLevel: 10, unit: "pcs" },
    { name: "Dumbbells (5kg pair)", category: "Equipment", quantity: 4, minStockLevel: 5, unit: "pairs" },
    { name: "Protein Powder (1kg)", category: "Supplements", quantity: 12, minStockLevel: 5, unit: "tubs" },
    { name: "Resistance Bands", category: "Accessories", quantity: 2, minStockLevel: 8, unit: "pcs" },
    { name: "Towels", category: "Facility", quantity: 50, minStockLevel: 20, unit: "pcs" },
  ];
  for (const item of inventorySeeds) {
    const created = await prisma.inventoryItem.create({ data: item });
    await prisma.inventoryTransaction.create({
      data: {
        itemId: created.id,
        type: "STOCK_IN",
        quantity: item.quantity,
        reason: "Initial stock",
        performedById: admin.id,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: members[1].userId,
        type: "MEMBERSHIP_EXPIRY",
        title: "Membership expiring soon",
        message: "Your quarterly membership expires in 5 days. Renew to keep your access uninterrupted.",
        link: "/membership",
      },
      {
        userId: members[0].userId,
        type: "WORKOUT_ASSIGNED",
        title: "New workout plan assigned",
        message: "Your trainer assigned you a new plan: Strength Foundations.",
        link: "/workouts",
      },
      {
        userId: admin.id,
        type: "ANNOUNCEMENT",
        title: "Welcome to Bodygraph Manager",
        message: "Your gym management system is ready to go.",
      },
    ],
  });

  console.log("Seed complete.\n");
  console.log("Demo logins:");
  console.log("  Admin:        admin@bodygraph.in / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
