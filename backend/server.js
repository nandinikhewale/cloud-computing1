
require('dotenv').config({
    path: require('path').join(__dirname, '.env')
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('node:dns');

const dnsServers = (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map(server => server.trim())
    .filter(Boolean);

if (dnsServers.length) {
    try {
        dns.setServers(dnsServers);
    } catch (e) {
        console.error('MongoDB DNS configuration failed:', e.message);
        process.exit(1);
    }
}

const app = express();
const PORT = process.env.PORT || 5000;

const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Business Administration',
    'Arts & Humanities',
    'Science'
];

// Student Schema
const schema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            maxlength: 30
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        department: {
            type: String,
            required: true,
            enum: departments
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8,
            validate: Number.isInteger
        },
        contact: {
            type: String,
            required: true,
            match: /^[6-9]\d{9}$/
        }
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'students'
    }
);

const Student = mongoose.model('Student', schema);

// CORS Configuration
const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

const origins = [
    'https://cloud-computing1-frontend.vercel.app',
    ...configuredOrigins
].map(value => {
    let url;

    try {
        url = new URL(value);
    } catch {
        throw new Error(
            `Invalid FRONTEND_URL value "${value}". Use a full HTTP(S) URL.`
        );
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(
            `Invalid FRONTEND_URL value "${value}". Use a full HTTP(S) URL.`
        );
    }

    return url.origin;
});

app.use(
    cors({
        origin: (origin, cb) => {
            const isAllowed =
                !origin ||
                origins.includes(origin) ||
                (
                    process.env.NODE_ENV !== 'production' &&
                    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
                );

            if (isAllowed) {
                return cb(null, true);
            }

            return cb(new Error(`Origin "${origin}" is not allowed by CORS`));
        }
    })
);

app.use(express.json({ limit: '32kb' }));

// Helper Functions
const wrap = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const fail = (status, message) =>
    Object.assign(new Error(message), { status });

const trim = x =>
    typeof x === 'string' ? x.trim() : '';

// Validate Student Data
function validate(b) {
    const d = {
        studentId: trim(b.studentId),
        name: trim(b.name),
        email: trim(b.email).toLowerCase(),
        department: trim(b.department),
        semester: Number(b.semester),
        contact: trim(b.contact)
    };

    const e = {};

    if (!d.studentId || d.studentId.length > 30) {
        e.studentId = 'Student ID is required (max 30 characters).';
    }

    if (!d.name || d.name.length > 100) {
        e.name = 'Name is required (max 100 characters).';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
        e.email = 'Enter a valid email address.';
    }

    if (!departments.includes(d.department)) {
        e.department = 'Choose a valid department.';
    }

    if (
        !Number.isInteger(d.semester) ||
        d.semester < 1 ||
        d.semester > 8
    ) {
        e.semester = 'Semester must be 1–8.';
    }

    if (!/^[6-9]\d{9}$/.test(d.contact)) {
        e.contact = 'Contact must be a 10-digit Indian mobile number.';
    }

    return { d, e };
}

// Health Check API
app.get('/api/health', (req, res) => {
    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
        success: connected,
        status: 'ok',
        database: connected ? 'connected' : 'disconnected'
    });
});

// Get All Students with Search, Filters, Sorting and Pagination
app.get(
    '/api/students',
    wrap(async (req, res) => {
        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit, 10) || 100)
        );

        const filter = {};
        const search = trim(req.query.search);

        if (search) {
            const safe = Array.from(search)
                .map(c => '.*+?^$()|[]{}\\'.includes(c) ? '\\' + c : c)
                .join('');

            const re = new RegExp(safe, 'i');

            filter.$or = [
                { studentId: re },
                { name: re },
                { email: re }
            ];
        }

        if (req.query.department) {
            filter.department = trim(req.query.department);
        }

        if (req.query.semester) {
            const n = Number(req.query.semester);

            if (!Number.isInteger(n) || n < 1 || n > 8) {
                throw fail(400, 'Semester filter must be 1–8.');
            }

            filter.semester = n;
        }

        const sorts = {
            name: { name: 1 },
            studentId: { studentId: 1 },
            semester: { semester: 1, name: 1 },
            createdAt: { createdAt: -1 }
        };

        const sort = sorts[req.query.sort] || sorts.name;

        const [students, total] = await Promise.all([
            Student.find(filter)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            Student.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                students,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    })
);

// Get a Single Student
app.get(
    '/api/students/:id',
    wrap(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw fail(400, 'Invalid student record ID.');
        }

        const s = await Student.findById(req.params.id).lean();

        if (!s) {
            throw fail(404, 'Student not found.');
        }

        res.json({
            success: true,
            data: s
        });
    })
);

// Add a New Student
app.post(
    '/api/students',
    wrap(async (req, res) => {
        const { d, e } = validate(req.body || {});

        if (Object.keys(e).length) {
            return res.status(400).json({
                success: false,
                message: 'Please correct the student information.',
                errors: e
            });
        }

        try {
            const s = await Student.create(d);

            res.status(201).json({
                success: true,
                message: 'Student added successfully.',
                data: s
            });
        } catch (x) {
            if (x.code === 11000) {
                throw fail(409, 'That Student ID is already in use.');
            }

            throw x;
        }
    })
);

// Update an Existing Student
app.put(
    '/api/students/:id',
    wrap(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw fail(400, 'Invalid student record ID.');
        }

        const { d, e } = validate(req.body || {});

        if (Object.keys(e).length) {
            return res.status(400).json({
                success: false,
                message: 'Please correct the student information.',
                errors: e
            });
        }

        try {
            const s = await Student.findByIdAndUpdate(
                req.params.id,
                d,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!s) {
                throw fail(404, 'Student not found.');
            }

            res.json({
                success: true,
                message: 'Student updated successfully.',
                data: s
            });
        } catch (x) {
            if (x.code === 11000) {
                throw fail(409, 'That Student ID is already in use.');
            }

            throw x;
        }
    })
);

// Delete a Student
app.delete(
    '/api/students/:id',
    wrap(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            throw fail(400, 'Invalid student record ID.');
        }

        const s = await Student.findByIdAndDelete(req.params.id);

        if (!s) {
            throw fail(404, 'Student not found.');
        }

        res.json({
            success: true,
            message: 'Student deleted successfully.',
            data: {
                id: s._id,
                studentId: s.studentId
            }
        });
    })
);

// Dashboard Statistics API
app.get(
    '/api/stats',
    wrap(async (req, res) => {
        const [
            total,
            departmentStats,
            semesters,
            recent
        ] = await Promise.all([
            Student.countDocuments(),

            Student.aggregate([
                {
                    $group: {
                        _id: '$department',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        count: -1,
                        _id: 1
                    }
                }
            ]),

            Student.aggregate([
                {
                    $group: {
                        _id: '$semester',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]),

            Student.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                total,

                departments: departmentStats.map(x => ({
                    name: x._id,
                    count: x.count
                })),

                semesters: semesters.map(x => ({
                    semester: x._id,
                    count: x.count
                })),

                recent
            }
        });
    })
);

// Handle Unknown API Routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const status =
        err.status ||
        (err.name === 'ValidationError' ? 400 : 500);

    if (status >= 500) {
        console.error('Request error:', err.message);
    }

    res.status(status).json({
        success: false,
        message:
            status >= 500
                ? 'A server error occurred. Please try again later.'
                : err.message
    });
});

// MongoDB Connection and Server Startup
const mongoUri = process.env.MONGODB_URI?.trim();

if (!mongoUri) {
    console.error(
        'MongoDB connection failed: MONGODB_URI is not set. ' +
        'Copy .env.example to .env and set your MongoDB Atlas connection string.'
    );

    process.exit(1);
}

if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
    console.error(
        'MongoDB connection failed: MONGODB_URI must start with ' +
        'mongodb:// or mongodb+srv://.'
    );

    process.exit(1);
}

mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB || 'studentDB',
    serverSelectionTimeoutMS: 10000
})
    .then(() => {
        console.log('Connected to MongoDB');

        app.listen(PORT, () => {
            console.log('API listening on ' + PORT);
        });
    })
    .catch(e => {
        console.error('MongoDB connection failed:', e.message);
        process.exit(1);
    });
