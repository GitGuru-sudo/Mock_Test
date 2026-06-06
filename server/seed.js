'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Models ──────────────────────────────────────────────────────────────────
const User            = require('./src/models/User');
const Company         = require('./src/models/Company');
const Student         = require('./src/models/Student');
const InterviewSession = require('./src/models/InterviewSession');
const Attendance      = require('./src/models/Attendance');
const Result          = require('./src/models/Result');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomPhone() {
  // 10 digits starting with 9
  let num = '9';
  for (let i = 0; i < 9; i++) {
    num += String(randomInt(0, 9));
  }
  return num;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Seed Data Definitions ───────────────────────────────────────────────────
const COMPANY_DEFS = [
  {
    name: 'Google',
    ctc: 25,
    location: 'Mountain View, CA',
    website: 'https://google.com',
    description: 'Global technology leader specializing in search, cloud computing, and AI.',
    industry: 'Technology',
    rounds: [
      { roundNumber: 1, roundName: 'Aptitude Test',    roundType: 'aptitude'  },
      { roundNumber: 2, roundName: 'Coding Round',     roundType: 'coding'    },
      { roundNumber: 3, roundName: 'Technical Round',  roundType: 'technical' },
      { roundNumber: 4, roundName: 'HR Round',         roundType: 'hr'        },
    ],
  },
  {
    name: 'Microsoft',
    ctc: 20,
    location: 'Redmond, WA',
    website: 'https://microsoft.com',
    description: 'Multinational technology company producing software, hardware, and cloud services.',
    industry: 'Technology',
    rounds: [
      { roundNumber: 1, roundName: 'Aptitude Test',    roundType: 'aptitude'  },
      { roundNumber: 2, roundName: 'Technical Round',  roundType: 'technical' },
      { roundNumber: 3, roundName: 'Coding Round',     roundType: 'coding'    },
      { roundNumber: 4, roundName: 'HR Round',         roundType: 'hr'        },
    ],
  },
  {
    name: 'Amazon',
    ctc: 22,
    location: 'Seattle, WA',
    website: 'https://amazon.com',
    description: 'E-commerce and cloud computing giant with global operations.',
    industry: 'Technology',
    rounds: [
      { roundNumber: 1, roundName: 'Aptitude Test',      roundType: 'aptitude'  },
      { roundNumber: 2, roundName: 'Coding Round',       roundType: 'coding'    },
      { roundNumber: 3, roundName: 'Technical Round 1',  roundType: 'technical' },
      { roundNumber: 4, roundName: 'Technical Round 2',  roundType: 'technical' },
      { roundNumber: 5, roundName: 'HR Round',           roundType: 'hr'        },
    ],
  },
  {
    name: 'Infosys',
    ctc: 8,
    location: 'Bangalore, India',
    website: 'https://infosys.com',
    description: 'Leading IT consulting and outsourcing company.',
    industry: 'IT Services',
    rounds: [
      { roundNumber: 1, roundName: 'Aptitude Test',    roundType: 'aptitude'  },
      { roundNumber: 2, roundName: 'Technical Round',  roundType: 'technical' },
      { roundNumber: 3, roundName: 'HR Round',         roundType: 'hr'        },
    ],
  },
  {
    name: 'TCS',
    ctc: 7,
    location: 'Mumbai, India',
    website: 'https://tcs.com',
    description: 'India\'s largest IT services and consulting company.',
    industry: 'IT Services',
    rounds: [
      { roundNumber: 1, roundName: 'Aptitude Test',  roundType: 'aptitude' },
      { roundNumber: 2, roundName: 'GD Round',       roundType: 'gd'       },
      { roundNumber: 3, roundName: 'HR Round',       roundType: 'hr'       },
    ],
  },
  {
    name: 'Wipro',
    ctc: 9,
    location: 'Bangalore, India',
    website: 'https://wipro.com',
    description: 'Global IT services and consulting company.',
    industry: 'IT Services',
    rounds: [
      { roundNumber: 1, roundName: 'Aptitude Test',    roundType: 'aptitude'  },
      { roundNumber: 2, roundName: 'Technical Round',  roundType: 'technical' },
      { roundNumber: 3, roundName: 'GD Round',         roundType: 'gd'        },
      { roundNumber: 4, roundName: 'HR Round',         roundType: 'hr'        },
    ],
  },
];

const BRANCHES = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];
const BRANCH_COUNTS = { CSE: 15, ECE: 12, ME: 10, CE: 8, EE: 8, IT: 7 };

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // ── 1. Clear all collections ──────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Student.deleteMany({}),
    InterviewSession.deleteMany({}),
    Attendance.deleteMany({}),
    Result.deleteMany({}),
  ]);
  console.log('Cleared all collections.');

  // ── 2. Create Users ───────────────────────────────────────────────────────
  const [adminPw, officerPw] = await Promise.all([
    bcrypt.hash('Admin@123', 12),
    bcrypt.hash('Officer@123', 12),
  ]);

  const users = await User.insertMany([
    { name: 'Admin User',       email: 'admin@placement.com',  password: adminPw,   role: 'admin'   },
    { name: 'Placement Officer', email: 'officer@placement.com', password: officerPw, role: 'officer' },
  ]);
  console.log(`Created ${users.length} users.`);

  // ── 3. Create Companies ───────────────────────────────────────────────────
  const companies = await Company.insertMany(
    COMPANY_DEFS.map((def) => ({
      name: def.name,
      ctc: def.ctc,
      location: def.location,
      website: def.website,
      description: def.description,
      industry: def.industry,
      rounds: def.rounds,
      recruitmentStatus: 'completed',
    }))
  );
  console.log(`Created ${companies.length} companies.`);

  // Map company name → document
  const companyMap = {};
  companies.forEach((c) => { companyMap[c.name] = c; });

  // ── 4. Create Students ────────────────────────────────────────────────────
  const studentDocs = [];
  let idx = 1;
  for (const branch of BRANCHES) {
    const count = BRANCH_COUNTS[branch];
    for (let j = 0; j < count; j++) {
      const num = String(idx).padStart(3, '0');
      const cgpa = Math.round(randomBetween(6.0, 9.5) * 10) / 10;
      studentDocs.push({
        studentId: `STU-${num}`,
        name: `Student ${idx}`,
        email: `student${idx}@college.edu`,
        phone: randomPhone(),
        branch,
        year: randomInt(1, 4),
        cgpa,
        placementStatus: 'not_placed',
      });
      idx++;
    }
  }

  const students = await Student.insertMany(studentDocs);
  console.log(`Created ${students.length} students.`);

  // ── 4b. Create Student User Accounts ────────────────────────────────────────
  const studentPw = await bcrypt.hash('Student@123', 12);
  const studentUserDocs = students.map((s) => ({
    name: s.name,
    email: s.email,
    password: studentPw,
    role: 'student',
    studentRef: s._id,
  }));
  const studentUsers = await User.insertMany(studentUserDocs);
  console.log(`Created ${studentUsers.length} student user accounts.`);

  // Link back from Student → User
  const studentUserUpdates = studentUsers.map((u) => ({
    updateOne: {
      filter: { _id: u.studentRef },
      update: { $set: { userId: u._id } },
    },
  }));
  await Student.bulkWrite(studentUserUpdates);
  console.log('Linked student accounts to user accounts.');

  // ── 5. Create InterviewSessions ───────────────────────────────────────────
  const allSessions = [];
  // Spread sessions over the past 30 days, evenly spaced
  const totalRounds = COMPANY_DEFS.reduce((sum, c) => sum + c.rounds.length, 0);
  let sessionDateOffset = 1;
  const dateStep = Math.max(1, Math.floor(30 / totalRounds));

  // company → round → session
  const sessionMap = {}; // companyId → { [roundNumber]: session }

  for (const companyDef of COMPANY_DEFS) {
    const company = companyMap[companyDef.name];
    sessionMap[company._id.toString()] = {};

    for (const round of companyDef.rounds) {
      const session = await InterviewSession.create({
        company: company._id,
        roundNumber: round.roundNumber,
        roundName: round.roundName,
        roundType: round.roundType,
        scheduledDate: daysAgo(sessionDateOffset),
        status: 'completed',
      });
      sessionMap[company._id.toString()][round.roundNumber] = session;
      allSessions.push(session);
      sessionDateOffset += dateStep;
    }
  }
  // Create 2 sessions scheduled for today (so dashboard "Today's Sessions" shows data)
  const today = new Date();
  for (let i = 0; i < 2 && i < COMPANY_DEFS.length; i++) {
    const companyDef = COMPANY_DEFS[i];
    const company = companyMap[companyDef.name];
    const round = companyDef.rounds[0];
    await InterviewSession.create({
      company: company._id,
      roundNumber: round.roundNumber,
      roundName: round.roundName,
      roundType: round.roundType,
      scheduledDate: today,
      venue: 'Main Auditorium',
      status: 'scheduled',
    });
  }

  console.log(`Created ${allSessions.length} sessions.`);

  // ── 6. Attendance + Results ───────────────────────────────────────────────
  let totalAttendance = 0;
  let totalResults = 0;
  let totalPlaced = 0;

  // Bulk update buffers
  const studentStatusUpdates = []; // { _id, placementStatus }

  for (const companyDef of COMPANY_DEFS) {
    const company = companyMap[companyDef.name];
    const companyId = company._id.toString();
    const numRounds = companyDef.rounds.length;

    // Track which students passed each round: Set of student._id.toString()
    // passedPrev: students who passed the previous round (eligible for next)
    // For round 1 everyone attends; for round N only passedPrev students attend.
    let passedPrev = null; // null means "all students" for round 1

    // Track students who failed at any point (per company)
    const failedStudents = new Set();

    for (const round of companyDef.rounds) {
      const session = sessionMap[companyId][round.roundNumber];
      const isFirstRound = round.roundNumber === 1;
      const isLastRound = round.roundNumber === numRounds;

      // Eligible students for this round
      let eligibleStudents;
      if (isFirstRound) {
        eligibleStudents = students; // all 60
      } else {
        // Only students who passed the previous round
        eligibleStudents = students.filter(
          (s) => passedPrev && passedPrev.has(s._id.toString())
        );
      }

      // ── Attendance ────────────────────────────────────────────────────────
      const attendanceDocs = [];
      const presentStudentIds = new Set();

      for (const student of eligibleStudents) {
        const isPresent = Math.random() < 0.8; // 80% present rate
        attendanceDocs.push({
          session: session._id,
          student: student._id,
          company: company._id,
          roundNumber: round.roundNumber,
          status: isPresent ? 'present' : 'absent',
          markedAt: session.scheduledDate,
        });
        if (isPresent) {
          presentStudentIds.add(student._id.toString());

          // Business rule: round 1 present → set in_process if not_placed
          if (isFirstRound) {
            studentStatusUpdates.push({ id: student._id, status: 'in_process' });
          }
        }
      }

      await Attendance.insertMany(attendanceDocs);
      totalAttendance += attendanceDocs.length;

      // ── Results ───────────────────────────────────────────────────────────
      const resultDocs = [];
      const passedThisRound = new Set();

      // Present students only get results; failed students excluded
      for (const student of eligibleStudents) {
        const sid = student._id.toString();
        if (!presentStudentIds.has(sid)) continue;
        if (failedStudents.has(sid)) continue;

        let outcome;
        if (isFirstRound) {
          // ~60% pass, ~20% fail, ~5% offer (only if single-round company), ~15% pending
          const roll = Math.random();
          if (numRounds === 1) {
            if (roll < 0.60) outcome = 'pass';
            else if (roll < 0.80) outcome = 'fail';
            else if (roll < 0.85) outcome = 'offer';
            else outcome = 'pending';
          } else {
            if (roll < 0.60) outcome = 'pass';
            else if (roll < 0.80) outcome = 'fail';
            else outcome = 'pending';
          }
        } else if (isLastRound) {
          // Last round: ~60% offer, ~25% fail, ~15% pending
          const roll = Math.random();
          if (roll < 0.60) outcome = 'offer';
          else if (roll < 0.85) outcome = 'fail';
          else outcome = 'pending';
        } else {
          // Middle round: ~65% pass, ~20% fail, ~15% pending
          const roll = Math.random();
          if (roll < 0.65) outcome = 'pass';
          else if (roll < 0.85) outcome = 'fail';
          else outcome = 'pending';
        }

        resultDocs.push({
          session: session._id,
          student: student._id,
          company: company._id,
          roundNumber: round.roundNumber,
          outcome,
          recordedAt: session.scheduledDate,
        });

        if (outcome === 'pass') {
          passedThisRound.add(sid);
        } else if (outcome === 'fail') {
          failedStudents.add(sid);
        } else if (outcome === 'offer') {
          // Mark student placed
          studentStatusUpdates.push({ id: student._id, status: 'placed' });
        }
      }

      await Result.insertMany(resultDocs);
      totalResults += resultDocs.length;

      passedPrev = passedThisRound;
    } // end rounds loop
  } // end companies loop

  // ── 7. Apply student status updates (placed takes priority over in_process)
  // Build a map: studentId → highest-priority status
  const studentFinalStatus = {};
  for (const upd of studentStatusUpdates) {
    const key = upd.id.toString();
    // 'placed' > 'in_process'
    if (upd.status === 'placed') {
      studentFinalStatus[key] = 'placed';
    } else if (!studentFinalStatus[key]) {
      studentFinalStatus[key] = upd.status;
    }
  }

  const bulkOps = Object.entries(studentFinalStatus).map(([id, status]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: { $set: { placementStatus: status } },
    },
  }));

  if (bulkOps.length > 0) {
    await Student.bulkWrite(bulkOps);
  }

  totalPlaced = Object.values(studentFinalStatus).filter((s) => s === 'placed').length;

  // ── 8. Summary ────────────────────────────────────────────────────────────
  console.log('\nSeed complete!');
  console.log(`Users: ${users.length + studentUsers.length}`);
  console.log(`Companies: ${companies.length}`);
  console.log(`Students: ${students.length}`);
  console.log(`Sessions: ${allSessions.length}`);
  console.log(`Attendance records: ${totalAttendance}`);
  console.log(`Results: ${totalResults}`);
  console.log(`Placed students: ${totalPlaced}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
