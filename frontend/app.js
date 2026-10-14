
(function () {
    'use strict';

    // ========================================
    // 1. Configuration and Global Variables
    // ========================================

    var API = (window.STUDENT_API_BASE_URL || '').replace(/\/$/, '');
    var app = document.getElementById('app');
    var modal = document.getElementById('modal');

    var depts = [
        'Computer Science',
        'Information Technology',
        'Electronics',
        'Mechanical',
        'Civil',
        'Business Administration',
        'Arts & Humanities',
        'Science'
    ];

    var names = {
        dashboard: 'Dashboard',
        students: 'Students',
        add: 'Add student',
        search: 'Search',
        about: 'Architecture',
        student: 'Student details',
        edit: 'Edit student'
    };

    var page = 1;

    var filters = {
        search: '',
        department: '',
        semester: '',
        sort: 'name'
    };

    // ========================================
    // 2. Helper Functions
    // ========================================

    // Escape HTML to prevent unsafe content injection.
    function esc(x) {
        return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[c];
        });
    }

    // Send API requests.
    function req(path, opt) {
        return fetch(
            API + path,
            Object.assign({
                headers: {
                    'Content-Type': 'application/json'
                }
            }, opt || {})
        )
            .then(function (r) {
                return r.json().then(function (j) {
                    if (!r.ok || j.success === false) {
                        throw Error(j.message || 'Request failed');
                    }

                    return j;
                });
            })
            .catch(function (e) {
                if (e instanceof TypeError) {
                    throw Error(
                        'Cannot reach the backend. Check the API URL and server.'
                    );
                }

                throw e;
            });
    }

    // Display notification messages.
    function toast(s, bad) {
        var t = document.getElementById('toast');

        t.className = 'toast' + (bad ? ' bad' : '');
        t.textContent = s;

        setTimeout(function () {
            t.className = '';
        }, 3500);
    }

    // Generate a page heading.
    function head(k, t, d, a) {
        return (
            '<div class="heading">' +
                '<div>' +
                    '<div class="eyebrow">' + esc(k) + '</div>' +
                    '<h1>' + esc(t) + '</h1>' +
                    '<p>' + esc(d) + '</p>' +
                '</div>' +
                (a || '') +
            '</div>'
        );
    }

    // Generate an empty-state message.
    function empty(t, d, a) {
        return (
            '<div class="empty">' +
                '<b>' + esc(t) + '</b>' +
                '<p>' + esc(d) + '</p>' +
                (a || '') +
            '</div>'
        );
    }

    // Generate an API error message.
    function error(e, retry) {
        return (
            '<div class="error">' +
                '<b>Could not load data</b>' +
                '<p>' + esc(e.message) + '</p>' +
                '<button class="btn outline" data-retry="' +
                    esc(retry) + '">' +
                    'Try again' +
                '</button>' +
            '</div>'
        );
    }

    // Generate a student table row.
    function row(s) {
        return (
            '<tr>' +
                '<td class="person">' +
                    esc(s.name) +
                    '<br><small>' + esc(s.studentId) + '</small>' +
                '</td>' +
                '<td>' + esc(s.email) + '</td>' +
                '<td>' + esc(s.department) + '</td>' +
                '<td><span class="tag">Sem ' +
                    esc(s.semester) +
                '</span></td>' +
                '<td>' + esc(s.contact) + '</td>' +
                '<td>' +
                    '<div class="actions">' +
                        '<a class="action" href="#/student/' +
                            encodeURIComponent(s._id) +
                        '">View</a>' +

                        '<a class="action" href="#/edit/' +
                            encodeURIComponent(s._id) +
                        '">Edit</a>' +

                        '<button class="action" data-del="' +
                            esc(s._id) +
                        '">Delete</button>' +
                    '</div>' +
                '</td>' +
            '</tr>'
        );
    }

    // Navigate to another page.
    function go(path) {
        location.hash = path;
    }

    // Update active navigation and breadcrumb.
    function headingNav(p) {
        document.getElementById('where').textContent =
            names[p] || 'Student details';

        document.querySelectorAll('[data-nav]').forEach(function (a) {
            a.classList.toggle('active', a.dataset.nav === p);
        });
    }

    // ========================================
    // 3. Page Routing
    // ========================================

    function load() {
        var raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
        var p = raw.split('/');
        var route = p[0];

        if (route === 'dashboard') {
            return dashboard();
        }

        if (route === 'students') {
            return students();
        }

        if (route === 'add') {
            return form(null);
        }

        if (route === 'search') {
            return searchPage();
        }

        if (route === 'about') {
            return about();
        }

        if (route === 'student') {
            return details(decodeURIComponent(p[1] || ''));
        }

        if (route === 'edit') {
            return edit(decodeURIComponent(p[1] || ''));
        }

        go('/dashboard');
    }

    // ========================================
    // 4. Dashboard
    // ========================================

    function dashboard() {
        headingNav('dashboard');

        app.innerHTML = '<div class="loading">Loading dashboard…</div>';

        req('/api/stats')
            .then(function (r) {
                var d = r.data;
                var ds = d.departments || [];
                var ss = d.semesters || [];

                var max = Math.max(
                    1,
                    ...ds.map(function (x) {
                        return x.count;
                    })
                );

                app.innerHTML =
                    head(
                        'OVERVIEW',
                        'Student Management Dashboard',
                        'A live view of student records.',
                        '<a class="btn primary" href="#/add">' +
                            '＋ Add student' +
                        '</a>'
                    ) +

                    '<div class="stats">' +

                        [
                            ['Total students', d.total || 0],
                            ['Departments', ds.length],
                            ['Active semesters', ss.length],
                            ['Recent additions', (d.recent || []).length]
                        ].map(function (x) {
                            return (
                                '<div class="card stat">' +
                                    '<span>' + x[0] + '</span>' +
                                    '<strong>' + x[1] + '</strong>' +
                                '</div>'
                            );
                        }).join('') +

                    '</div>' +

                    '<div class="dashgrid">' +

                        '<div class="card panel">' +
                            '<h2>Students by department</h2>' +

                            (
                                ds.length
                                    ? ds.map(function (x) {
                                        return (
                                            '<div class="barrow">' +
                                                '<span>' +
                                                    esc(x.name) +
                                                '</span>' +

                                                '<div class="track">' +
                                                    '<div class="fill" style="width:' +
                                                        Math.max(
                                                            2,
                                                            x.count / max * 100
                                                        ) +
                                                    '%"></div>' +
                                                '</div>' +

                                                '<b>' + x.count + '</b>' +
                                            '</div>'
                                        );
                                    }).join('')

                                    : empty(
                                        'No student data yet',
                                        'Add a student to populate the dashboard.',
                                        '<a class="btn soft" href="#/add">' +
                                            'Add student' +
                                        '</a>'
                                    )
                            ) +

                        '</div>' +

                        '<div class="card panel">' +
                            '<h2>Semester distribution</h2>' +
                            '<div class="semesters">' +

                                Array.from({ length: 8 }, function (_, i) {
                                    var f = ss.find(function (x) {
                                        return Number(x.semester) === i + 1;
                                    });

                                    return (
                                        '<div class="sem">' +
                                            '<b>' +
                                                Number(f ? f.count : 0) +
                                            '</b>' +
                                            'Semester ' + (i + 1) +
                                        '</div>'
                                    );
                                }).join('') +

                            '</div>' +
                        '</div>' +

                    '</div>' +

                    '<div class="card panel">' +
                        '<h2>Recently added students</h2>' +

                        (
                            d.recent && d.recent.length
                                ? (
                                    '<div class="tablewrap">' +
                                        '<table class="table">' +
                                            '<thead><tr>' +
                                                '<th>Student</th>' +
                                                '<th>Email</th>' +
                                                '<th>Department</th>' +
                                                '<th>Semester</th>' +
                                                '<th>Contact</th>' +
                                                '<th>Actions</th>' +
                                            '</tr></thead>' +

                                            '<tbody>' +
                                                d.recent.map(row).join('') +
                                            '</tbody>' +
                                        '</table>' +
                                    '</div>'
                                )

                                : empty(
                                    'No students added',
                                    'Recent records will show here.',
                                    '<a class="btn primary" href="#/add">' +
                                        'Add your first student' +
                                    '</a>'
                                )
                        ) +

                    '</div>';
            })
            .catch(function (e) {
                app.innerHTML =
                    head(
                        'OVERVIEW',
                        'Student Management Dashboard',
                        'Live database statistics.',
                        ''
                    ) +
                    error(e, 'dashboard');
            });
    }

    // ========================================
    // 5. Student Directory
    // ========================================

    function students() {
        headingNav('students');

        app.innerHTML = '<div class="loading">Loading students…</div>';

        var q = new URLSearchParams();

        Object.keys(filters).forEach(function (k) {
            if (filters[k]) {
                q.set(k, filters[k]);
            }
        });

        q.set('page', page);
        q.set('limit', 10);

        req('/api/students?' + q.toString())
            .then(function (r) {
                var a = r.data.students || [];
                var pg = r.data.pagination;

                app.innerHTML =
                    head(
                        'DIRECTORY',
                        'Students',
                        'Browse and manage student records.',
                        '<a class="btn primary" href="#/add">' +
                            '＋ Add student' +
                        '</a>'
                    ) +

                    '<div class="card toolbar">' +

                        '<input class="field" id="q" ' +
                            'placeholder="Search ID, name, or email" ' +
                            'value="' + esc(filters.search) + '">' +

                        '<select id="dept">' +
                            '<option value="">All departments</option>' +

                            depts.map(function (x) {
                                return (
                                    '<option ' +
                                        (filters.department === x
                                            ? 'selected'
                                            : '') +
                                    '>' + esc(x) + '</option>'
                                );
                            }).join('') +

                        '</select>' +

                        '<select id="sem">' +
                            '<option value="">All semesters</option>' +

                            Array.from({ length: 8 }, function (_, i) {
                                return (
                                    '<option value="' + (i + 1) + '" ' +
                                        (filters.semester === String(i + 1)
                                            ? 'selected'
                                            : '') +
                                    '>' +
                                        'Semester ' + (i + 1) +
                                    '</option>'
                                );
                            }).join('') +

                        '</select>' +

                        '<select id="sort">' +
                            '<option value="name">Name A–Z</option>' +

                            '<option value="studentId" ' +
                                (filters.sort === 'studentId'
                                    ? 'selected'
                                    : '') +
                            '>Student ID</option>' +

                            '<option value="semester" ' +
                                (filters.sort === 'semester'
                                    ? 'selected'
                                    : '') +
                            '>Semester</option>' +
                        '</select>' +

                    '</div>' +

                    '<div class="card tablewrap">' +

                        (
                            a.length
                                ? (
                                    '<table class="table">' +
                                        '<thead><tr>' +
                                            '<th>Student</th>' +
                                            '<th>Email</th>' +
                                            '<th>Department</th>' +
                                            '<th>Semester</th>' +
                                            '<th>Contact</th>' +
                                            '<th>Actions</th>' +
                                        '</tr></thead>' +

                                        '<tbody>' +
                                            a.map(row).join('') +
                                        '</tbody>' +
                                    '</table>'
                                )

                                : empty(
                                    'No matching students',
                                    'Adjust your filters or add a student.',
                                    '<a class="btn soft" href="#/add">' +
                                        'Add student' +
                                    '</a>'
                                )
                        ) +

                        (
                            a.length
                                ? (
                                    '<div class="pager">' +
                                        '<span>' +
                                            pg.total +
                                            ' student records · page ' +
                                            pg.page + ' of ' +
                                            Math.max(pg.pages, 1) +
                                        '</span>' +

                                        '<span>' +
                                            '<button class="action" id="prev" ' +
                                                (pg.page <= 1 ? 'disabled' : '') +
                                            '>Previous</button> ' +

                                            '<button class="action" id="next" ' +
                                                (pg.page >= pg.pages
                                                    ? 'disabled'
                                                    : '') +
                                            '>Next</button>' +
                                        '</span>' +
                                    '</div>'
                                )
                                : ''
                        ) +

                    '</div>';

                // Search input with debounce.
                var timer;

                document.getElementById('q').oninput = function () {
                    clearTimeout(timer);

                    var v = this.value;

                    timer = setTimeout(function () {
                        filters.search = v.trim();
                        page = 1;
                        students();
                    }, 250);
                };

                // Department filter.
                document.getElementById('dept').onchange = function () {
                    filters.department = this.value;
                    page = 1;
                    students();
                };

                // Semester filter.
                document.getElementById('sem').onchange = function () {
                    filters.semester = this.value;
                    page = 1;
                    students();
                };

                // Sorting.
                document.getElementById('sort').onchange = function () {
                    filters.sort = this.value;
                    page = 1;
                    students();
                };

                // Pagination.
                var prev = document.getElementById('prev');
                var next = document.getElementById('next');

                if (prev) {
                    prev.onclick = function () {
                        page--;
                        students();
                    };
                }

                if (next) {
                    next.onclick = function () {
                        page++;
                        students();
                    };
                }
            })
            .catch(function (e) {
                app.innerHTML =
                    head(
                        'DIRECTORY',
                        'Students',
                        'Browse and manage records.',
                        ''
                    ) +
                    error(e, 'students');
            });
    }

    // ========================================
    // 6. Add and Edit Student Form
    // ========================================

    function form(s) {
        headingNav(s ? 'edit' : 'add');

        var editing = !!s;

        app.innerHTML =
            head(
                'STUDENT RECORDS',
                editing ? 'Edit student' : 'Add a student',
                editing
                    ? 'Update this student record.'
                    : 'Enter the student information below.',
                ''
            ) +

            '<form class="card form" id="form" novalidate>' +
                '<div class="fields">' +

                    '<div>' +
                        '<label>Student ID <i class="req">*</i></label>' +
                        '<input class="field" name="studentId" required ' +
                            'maxlength="30" value="' +
                            esc(s && s.studentId) +
                            '" placeholder="ST101">' +
                        '<div class="err" data-err="studentId"></div>' +
                    '</div>' +

                    '<div>' +
                        '<label>Full name <i class="req">*</i></label>' +
                        '<input class="field" name="name" required value="' +
                            esc(s && s.name) +
                            '" placeholder="Full name">' +
                        '<div class="err" data-err="name"></div>' +
                    '</div>' +

                    '<div>' +
                        '<label>Email address <i class="req">*</i></label>' +
                        '<input class="field" name="email" type="email" required ' +
                            'value="' + esc(s && s.email) +
                            '" placeholder="name@example.edu">' +
                        '<div class="err" data-err="email"></div>' +
                    '</div>' +

                    '<div>' +
                        '<label>Department <i class="req">*</i></label>' +
                        '<select name="department" required>' +
                            '<option value="">Select department</option>' +

                            depts.map(function (x) {
                                return (
                                    '<option ' +
                                        (s && s.department === x
                                            ? 'selected'
                                            : '') +
                                    '>' + esc(x) + '</option>'
                                );
                            }).join('') +

                        '</select>' +
                        '<div class="err" data-err="department"></div>' +
                    '</div>' +

                    '<div>' +
                        '<label>Semester <i class="req">*</i></label>' +
                        '<select name="semester" required>' +
                            '<option value="">Select semester</option>' +

                            Array.from({ length: 8 }, function (_, i) {
                                return (
                                    '<option value="' + (i + 1) + '" ' +
                                        (s && Number(s.semester) === i + 1
                                            ? 'selected'
                                            : '') +
                                    '>' +
                                        'Semester ' + (i + 1) +
                                    '</option>'
                                );
                            }).join('') +

                        '</select>' +
                        '<div class="err" data-err="semester"></div>' +
                    '</div>' +

                    '<div>' +
                        '<label>Contact number <i class="req">*</i></label>' +
                        '<input class="field" name="contact" ' +
                            'inputmode="numeric" maxlength="10" required ' +
                            'value="' + esc(s && s.contact) +
                            '" placeholder="10-digit Indian mobile">' +

                        '<div class="hint">' +
                            '10 digits, starting with 6, 7, 8, or 9.' +
                        '</div>' +

                        '<div class="err" data-err="contact"></div>' +
                    '</div>' +

                '</div>' +

                '<div class="formactions">' +
                    '<button class="btn primary" id="save">' +
                        (editing ? 'Save changes' : 'Add student') +
                    '</button>' +

                    '<button class="btn outline" type="reset">' +
                        'Reset' +
                    '</button>' +

                    '<a class="btn outline" href="' +
                        (editing
                            ? '#/student/' + encodeURIComponent(s._id)
                            : '#/students') +
                    '">Cancel</a>' +
                '</div>' +
            '</form>';

        document.getElementById('form').onsubmit = function (e) {
            e.preventDefault();

            var f = new FormData(e.target);

            var d = {
                studentId: String(f.get('studentId') || '').trim(),
                name: String(f.get('name') || '').trim(),
                email: String(f.get('email') || '').trim(),
                department: String(f.get('department') || ''),
                semester: Number(f.get('semester')),
                contact: String(f.get('contact') || '').trim()
            };

            var errors = {};

            if (!d.studentId) {
                errors.studentId = 'Student ID is required.';
            }

            if (!d.name) {
                errors.name = 'Name is required.';
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
                errors.email = 'Enter a valid email.';
            }

            if (!d.department) {
                errors.department = 'Choose a department.';
            }

            if (!d.semester) {
                errors.semester = 'Choose a semester.';
            }

            if (!/^[6-9]\d{9}$/.test(d.contact)) {
                errors.contact =
                    'Enter a valid 10-digit Indian mobile.';
            }

            document.querySelectorAll('[data-err]').forEach(function (el) {
                el.textContent = errors[el.dataset.err] || '';
            });

            if (Object.keys(errors).length) {
                return;
            }

            var b = document.getElementById('save');

            b.disabled = true;
            b.textContent = 'Saving…';

            req(
                editing
                    ? '/api/students/' + encodeURIComponent(s._id)
                    : '/api/students',
                {
                    method: editing ? 'PUT' : 'POST',
                    body: JSON.stringify(d)
                }
            )
                .then(function () {
                    toast(
                        editing
                            ? 'Student updated.'
                            : 'Student added.'
                    );

                    go(
                        editing
                            ? '/student/' + encodeURIComponent(s._id)
                            : '/students'
                    );
                })
                .catch(function (e) {
                    toast(e.message, true);

                    b.disabled = false;
                    b.textContent = editing
                        ? 'Save changes'
                        : 'Add student';
                });
        };
    }

    // ========================================
    // 7. Edit Student
    // ========================================

    function edit(id) {
        headingNav('edit');

        app.innerHTML = '<div class="loading">Loading student…</div>';

        req('/api/students/' + encodeURIComponent(id))
            .then(function (r) {
                form(r.data);
            })
            .catch(function (e) {
                app.innerHTML =
                    head(
                        'STUDENT RECORDS',
                        'Could not open student',
                        'This record may no longer exist.',
                        '<a class="btn outline" href="#/students">' +
                            'Back' +
                        '</a>'
                    ) +
                    error(e, 'students');
            });
    }

    // ========================================
    // 8. Student Details
    // ========================================

    function details(id) {
        headingNav('student');

        app.innerHTML = '<div class="loading">Loading student…</div>';

        req('/api/students/' + encodeURIComponent(id))
            .then(function (r) {
                var s = r.data;

                app.innerHTML =
                    head(
                        'STUDENT PROFILE',
                        s.name,
                        'Student ID · ' + s.studentId,
                        '<a class="btn outline" href="#/students">' +
                            '← Students' +
                        '</a>'
                    ) +

                    '<div class="card panel">' +
                        '<div class="details">' +

                            [
                                ['Email address', s.email],
                                ['Department', s.department],
                                ['Semester', 'Semester ' + s.semester],
                                ['Contact number', s.contact]
                            ].map(function (x) {
                                return (
                                    '<div class="detail">' +
                                        '<small>' + x[0] + '</small>' +
                                        '<b>' + esc(x[1]) + '</b>' +
                                    '</div>'
                                );
                            }).join('') +

                        '</div>' +

                        '<div class="formactions">' +
                            '<a class="btn primary" href="#/edit/' +
                                encodeURIComponent(s._id) +
                            '">Edit student</a>' +

                            '<button class="btn danger" data-del="' +
                                esc(s._id) +
                            '">Delete student</button>' +
                        '</div>' +
                    '</div>';
            })
            .catch(function (e) {
                app.innerHTML =
                    head(
                        'STUDENT PROFILE',
                        'Student not found',
                        'The record may have been removed.',
                        '<a class="btn outline" href="#/students">' +
                            'Back to students' +
                        '</a>'
                    ) +
                    error(e, 'students');
            });
    }

    // ========================================
    // 9. Search Students
    // ========================================

    function searchPage() {
        headingNav('search');

        app.innerHTML =
            head(
                'DIRECTORY',
                'Search students',
                'Look up a record by student ID, name, or email.',
                ''
            ) +

            '<div class="searchhero">' +
                '<h2>Find a student</h2>' +
                '<p>Search the student records in your database.</p>' +

                '<form id="searchform" class="searchrow">' +
                    '<input class="field" id="searchq" ' +
                        'placeholder="Name, student ID, or email">' +

                    '<button class="btn primary">⌕ Search</button>' +

                    '<button class="btn outline" type="button" id="clear">' +
                        'Clear' +
                    '</button>' +
                '</form>' +
            '</div>' +

            '<div id="results"></div>';

        document.getElementById('searchform').onsubmit = function (e) {
            e.preventDefault();

            runSearch(document.getElementById('searchq').value);
        };

        document.getElementById('clear').onclick = function () {
            document.getElementById('searchq').value = '';
            document.getElementById('results').innerHTML = '';
        };
    }

    function runSearch(v) {
        var out = document.getElementById('results');

        if (!v.trim()) {
            out.innerHTML = empty(
                'Enter a search term',
                'Search by ID, name, or email.'
            );

            return;
        }

        out.innerHTML = '<div class="loading">Searching…</div>';

        req(
            '/api/students?search=' +
            encodeURIComponent(v) +
            '&limit=50'
        )
            .then(function (r) {
                var a = r.data.students || [];

                out.innerHTML = a.length
                    ? a.map(function (s) {
                        return (
                            '<div class="card result">' +
                                '<b>' +
                                    esc(s.name) +

                                    '<small style="display:block;color:#8490a6;margin-top:5px">' +
                                        esc(s.studentId) + ' · ' +
                                        esc(s.email) + ' · ' +
                                        esc(s.department) +
                                    '</small>' +
                                '</b>' +

                                '<a class="btn soft" href="#/student/' +
                                    encodeURIComponent(s._id) +
                                '">View details</a>' +
                            '</div>'
                        );
                    }).join('')

                    : empty(
                        'No matching students',
                        'Try a different search term.'
                    );
            })
            .catch(function (e) {
                out.innerHTML = error(e, 'search');
            });
    }

    // ========================================
    // 10. Architecture Information
    // ========================================

    function about() {
        headingNav('about');

        app.innerHTML =
            head(
                'SYSTEM OVERVIEW',
                'Three-tier architecture',
                'Student data passes through separate application layers.',
                ''
            ) +

            '<div class="tiergrid">' +

                '<div class="card tier">' +
                    '<small>01 · PRESENTATION</small>' +
                    '<h3>Browser → Netlify</h3>' +
                    '<p>' +
                        'Responsive HTML, CSS, and JavaScript send HTTPS ' +
                        'requests using Fetch. The browser never connects ' +
                        'to MongoDB.' +
                    '</p>' +
                    '<p>HTML5 · CSS3 · Vanilla JS</p>' +
                '</div>' +

                '<div class="card tier">' +
                    '<small>02 · APPLICATION</small>' +
                    '<h3>Render → Express</h3>' +
                    '<p>' +
                        'The Node.js API validates requests and handles ' +
                        'student CRUD operations through REST endpoints.' +
                    '</p>' +
                    '<p>Node.js · Express · Mongoose</p>' +
                '</div>' +

                '<div class="card tier">' +
                    '<small>03 · DATA</small>' +
                    '<h3>MongoDB Atlas</h3>' +
                    '<p>' +
                        'Student records are stored in studentDB, collection ' +
                        'students. Only the backend has the database URI.' +
                    '</p>' +
                    '<p>MongoDB Atlas · studentDB</p>' +
                '</div>' +

            '</div>' +

            '<div class="card panel">' +
                '<h2>How a record is updated</h2>' +

                '<p class="notice">' +
                    'The browser sends a PUT request to Express. The backend ' +
                    'validates the fields, updates MongoDB through Mongoose, ' +
                    'and returns the saved record. The frontend reports ' +
                    'success only after the API confirms it. Environment ' +
                    'variables keep database secrets out of the public frontend.' +
                '</p>' +
            '</div>';
    }

    // ========================================
    // 11. Delete Student Confirmation
    // ========================================

    function del(id) {
        modal.innerHTML =
            '<div class="backdrop">' +
                '<div class="dialog" role="dialog" aria-modal="true">' +
                    '<h2>Delete this student?</h2>' +
                    '<p id="delcopy">Loading record…</p>' +

                    '<div class="dialogfoot">' +
                        '<button class="btn outline" id="cancel">' +
                            'Cancel' +
                        '</button>' +

                        '<button class="btn danger" id="confirm" disabled>' +
                            'Confirm delete' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.getElementById('cancel').onclick = function () {
            modal.innerHTML = '';
        };

        req('/api/students/' + encodeURIComponent(id))
            .then(function (r) {
                var s = r.data;

                document.getElementById('delcopy').textContent =
                    'Permanently delete ' +
                    s.name +
                    ' (' + s.studentId + ')?';

                document.getElementById('confirm').disabled = false;
            })
            .catch(function (e) {
                document.getElementById('delcopy').textContent = e.message;
            });

        document.getElementById('confirm').onclick = function () {
            var b = this;

            b.disabled = true;
            b.textContent = 'Deleting…';

            req('/api/students/' + encodeURIComponent(id), {
                method: 'DELETE'
            })
                .then(function () {
                    modal.innerHTML = '';

                    toast('Student deleted.');

                    if (location.hash.indexOf('#/student/') === 0) {
                        go('/students');
                    } else {
                        students();
                    }
                })
                .catch(function (e) {
                    modal.innerHTML = '';
                    toast(e.message, true);
                });
        };
    }

    // ========================================
    // 12. Global Click Events
    // ========================================

    document.addEventListener('click', function (e) {
        var d = e.target.closest('[data-del]');

        if (d) {
            del(d.dataset.del);
        }

        var r = e.target.closest('[data-retry]');

        if (r) {
            if (r.dataset.retry === 'dashboard') {
                dashboard();
            } else if (r.dataset.retry === 'students') {
                students();
            } else {
                searchPage();
            }
        }
    });

    // ========================================
    // 13. Navigation and Mobile Sidebar
    // ========================================

    window.addEventListener('hashchange', load);

    var side = document.getElementById('side');
    var back = document.createElement('div');

    back.className = 'mobileback';
    document.body.appendChild(back);

    document.getElementById('menu').onclick = function () {
        side.classList.add('open');
        back.classList.add('show');
    };

    back.onclick = function () {
        side.classList.remove('open');
        back.classList.remove('show');
    };

    document.querySelectorAll('nav a').forEach(function (a) {
        a.onclick = function () {
            side.classList.remove('open');
            back.classList.remove('show');
        };
    });

    // ========================================
    // 14. Initialize Application
    // ========================================

    load();

})();
