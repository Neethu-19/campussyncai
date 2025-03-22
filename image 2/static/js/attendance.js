// Store attendance data in localStorage
let attendanceData = JSON.parse(localStorage.getItem('attendanceData') || '{}');

// Constants for attendance analysis
const ATTENDANCE_THRESHOLD = {
    EXCELLENT: 90,
    GOOD: 75,
    AVERAGE: 65,
    POOR: 50
};

// Initialize attendance tracking
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    document.getElementById('attendanceDate').max = today;

    // Initialize form submission
    const form = document.getElementById('attendanceForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const subject = document.getElementById('subjectSelect').value;
            const date = document.getElementById('attendanceDate').value;
            const status = document.querySelector('input[name="status"]:checked').value;
            recordAttendance(subject, date, status);
            form.reset();
            document.getElementById('attendanceDate').value = today;
        });
    }

    // Populate subjects from schedule
    populateSubjects();
    
    // Render existing stats
    renderAttendanceStats();
    renderRecentActivity();
});

function populateSubjects() {
    const subjectSelect = document.getElementById('subjectSelect');
    if (!subjectSelect) return;

    // Get current timetable from localStorage
    const timetable = JSON.parse(localStorage.getItem('currentTimetable') || '{}');
    const subjects = new Set();

    // Extract unique subjects from the timetable
    for (const day in timetable) {
        // Skip metadata properties
        if (day === 'fileName' || day === 'uploadTime') continue;
        
        const periods = timetable[day];
        if (periods && typeof periods === 'object') {
            Object.values(periods).forEach(subject => {
                // Add subject if it's not empty, 'Free Hour', or '-'
                if (subject && 
                    subject !== 'Free Hour' && 
                    subject !== '-' && 
                    !subject.includes('Break') &&
                    !subject.includes('Lunch')) {
                    subjects.add(subject);
                }
            });
        }
    }

    // Add options to select
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    [...subjects].sort().forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });

    // If no subjects found, show a message
    if (subjects.size === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Please upload your schedule first";
        option.disabled = true;
        subjectSelect.appendChild(option);
        
        // Show a notification
        showAttendanceNotification(
            "No schedule found", 
            "Please upload your schedule on the main page first.", 
            0
        );
    }
}

function renderRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    const allActivities = [];
    for (const subject in attendanceData) {
        attendanceData[subject].history.forEach(record => {
            allActivities.push({
                subject,
                date: new Date(record.date),
                status: record.status
            });
        });
    }

    // Sort by date, most recent first
    allActivities.sort((a, b) => b.date - a.date);

    // Take last 10 activities
    const recentActivities = allActivities.slice(0, 10);

    if (recentActivities.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No attendance records yet</div>';
        return;
    }

    const html = recentActivities.map(activity => `
        <div class="timeline-item ${activity.status}">
            <div class="timeline-date">
                ${activity.date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                })}
            </div>
            <div class="timeline-content">
                <strong>${activity.subject}</strong>
                <span class="badge ${activity.status === 'present' ? 'bg-success' : 'bg-danger'}">
                    ${activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </span>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function recordAttendance(subject, date, status) {
    if (!attendanceData[subject]) {
        attendanceData[subject] = {
            totalClasses: 0,
            attendedClasses: 0,
            history: []
        };
    }

    attendanceData[subject].totalClasses++;
    if (status === 'present') {
        attendanceData[subject].attendedClasses++;
    }

    attendanceData[subject].history.push({
        date: date,
        status: status
    });

    saveAttendanceData();
    renderAttendanceStats();
    provideRecommendations(subject);
}

function calculateAttendancePercentage(subject) {
    if (!attendanceData[subject] || attendanceData[subject].totalClasses === 0) {
        return 0;
    }
    return (attendanceData[subject].attendedClasses / attendanceData[subject].totalClasses) * 100;
}

function getAttendanceTrend(subject) {
    if (!attendanceData[subject] || !attendanceData[subject].history.length) {
        return 'neutral';
    }

    const recentClasses = attendanceData[subject].history.slice(-5);
    const recentAttendance = recentClasses.filter(c => c.status === 'present').length;
    const recentPercentage = (recentAttendance / recentClasses.length) * 100;
    const overallPercentage = calculateAttendancePercentage(subject);

    if (recentPercentage > overallPercentage + 5) return 'improving';
    if (recentPercentage < overallPercentage - 5) return 'declining';
    return 'stable';
}

function calculateRequiredClasses(subject, targetPercentage) {
    const current = attendanceData[subject];
    if (!current) return 0;

    const currentPercentage = calculateAttendancePercentage(subject);
    if (currentPercentage >= targetPercentage) return 0;

    // Formula: (target% * total - attended) / (1 - target%)
    const requiredClasses = Math.ceil(
        (targetPercentage * current.totalClasses / 100 - current.attendedClasses) /
        (1 - targetPercentage / 100)
    );

    return Math.max(0, requiredClasses);
}

function provideRecommendations(subject) {
    const percentage = calculateAttendancePercentage(subject);
    const trend = getAttendanceTrend(subject);
    let message = '';
    let actionRequired = '';

    if (percentage >= ATTENDANCE_THRESHOLD.EXCELLENT) {
        message = `Excellent attendance in ${subject}! You're well above the required attendance.`;
        if (trend === 'stable' || trend === 'improving') {
            actionRequired = 'You can afford to miss a class if needed.';
        }
    } else if (percentage >= ATTENDANCE_THRESHOLD.GOOD) {
        message = `Good attendance in ${subject}. Keep maintaining this level.`;
        if (trend === 'declining') {
            actionRequired = 'Try to maintain your attendance to stay in the good range.';
        }
    } else if (percentage >= ATTENDANCE_THRESHOLD.AVERAGE) {
        message = `Average attendance in ${subject}.`;
        const requiredForGood = calculateRequiredClasses(subject, ATTENDANCE_THRESHOLD.GOOD);
        actionRequired = `Attend ${requiredForGood} more consecutive classes to reach good standing.`;
    } else {
        message = `Attendance needs improvement in ${subject}.`;
        const requiredForAvg = calculateRequiredClasses(subject, ATTENDANCE_THRESHOLD.AVERAGE);
        actionRequired = `Critical: You need to attend ${requiredForAvg} more consecutive classes to reach average standing.`;
    }

    showAttendanceNotification(message, actionRequired, percentage);
}

function renderAttendanceStats() {
    const container = document.getElementById('attendanceStats');
    if (!container) return;

    let html = '<div class="row">';
    
    for (const subject in attendanceData) {
        const percentage = calculateAttendancePercentage(subject);
        const trend = getAttendanceTrend(subject);
        const colorClass = percentage >= ATTENDANCE_THRESHOLD.GOOD ? 'bg-success' :
                         percentage >= ATTENDANCE_THRESHOLD.AVERAGE ? 'bg-warning' : 'bg-danger';

        html += `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${subject}</h5>
                        <div class="progress mb-3">
                            <div class="progress-bar ${colorClass}" 
                                 role="progressbar" 
                                 style="width: ${percentage}%" 
                                 aria-valuenow="${percentage}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${percentage.toFixed(1)}%
                            </div>
                        </div>
                        <p class="card-text">
                            <i class="fas fa-${trend === 'improving' ? 'arrow-up text-success' :
                                              trend === 'declining' ? 'arrow-down text-danger' :
                                              'equals text-warning'}"></i>
                            ${attendanceData[subject].attendedClasses}/${attendanceData[subject].totalClasses} classes attended
                        </p>
                        <button class="btn btn-sm btn-primary" 
                                onclick="provideRecommendations('${subject}')">
                            View Analysis
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function showAttendanceNotification(message, actionRequired, percentage) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const bgClass = percentage >= ATTENDANCE_THRESHOLD.GOOD ? 'bg-success' :
                   percentage >= ATTENDANCE_THRESHOLD.AVERAGE ? 'bg-warning' : 'bg-danger';

    toast.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <i class="fas fa-chart-line me-2"></i>
            <strong class="me-auto">Attendance Analysis</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            <p class="mb-2">${message}</p>
            <p class="mb-0 text-${percentage < ATTENDANCE_THRESHOLD.AVERAGE ? 'danger' : 'info'}">
                ${actionRequired}
            </p>
        </div>
    `;

    const toastContainer = document.querySelector('.toast-container');
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function saveAttendanceData() {
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
} 