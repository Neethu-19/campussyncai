// Store reminders in localStorage
let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');

// Initialize Bootstrap components
const editReminderModal = new bootstrap.Modal(document.getElementById('editReminderModal'));

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reminderDate').min = today;
    document.getElementById('editReminderDate').min = today;

    // Initialize form submission
    document.getElementById('reminderForm').addEventListener('submit', (e) => {
        e.preventDefault();
        createReminder();
    });

    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);

    // Render reminders and start checking for due reminders
    renderReminders();
    setInterval(checkDueReminders, 60000); // Check every minute
});

function updateClock() {
    const now = new Date();
    const options = {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('clock').textContent = now.toLocaleString('en-US', options);
}

function createReminder() {
    const title = document.getElementById('reminderTitle').value;
    const description = document.getElementById('reminderDescription').value;
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;
    const priority = document.getElementById('reminderPriority').value;
    const repeat = document.getElementById('reminderRepeat').value;

    if (!title || !date || !time) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const reminder = {
        id: Date.now(),
        title,
        description,
        datetime: `${date}T${time}`,
        priority,
        repeat,
        completed: false,
        createdAt: new Date().toISOString()
    };

    reminders.push(reminder);
    saveReminders();
    renderReminders();
    document.getElementById('reminderForm').reset();
    showToast('Reminder created successfully!', 'success');
}

function renderReminders(filter = 'all') {
    const now = new Date();
    const upcomingContainer = document.getElementById('upcomingReminders');
    const completedContainer = document.getElementById('completedReminders');
    
    // Sort reminders by datetime and priority
    reminders.sort((a, b) => {
        if (a.completed === b.completed) {
            const dateCompare = new Date(a.datetime) - new Date(b.datetime);
            if (dateCompare === 0) {
                return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
            }
            return dateCompare;
        }
        return a.completed ? 1 : -1;
    });

    // Filter and render upcoming reminders
    const upcomingReminders = reminders.filter(reminder => {
        if (reminder.completed) return false;
        const reminderDate = new Date(reminder.datetime);
        
        switch (filter) {
            case 'today':
                return isSameDay(reminderDate, now);
            case 'week':
                return isWithinWeek(reminderDate, now);
            default:
                return true;
        }
    });

    upcomingContainer.innerHTML = upcomingReminders.length ? 
        upcomingReminders.map(reminder => createReminderCard(reminder)).join('') :
        createEmptyState('No upcoming reminders');

    // Render completed reminders
    const completedReminders = reminders.filter(r => r.completed);
    completedContainer.innerHTML = completedReminders.length ?
        completedReminders.map(reminder => createReminderCard(reminder)).join('') :
        createEmptyState('No completed reminders');

    // Update filter buttons
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.toggle('active', btn.onclick.toString().includes(filter));
    });
}

function createReminderCard(reminder) {
    const datetime = new Date(reminder.datetime);
    const isOverdue = !reminder.completed && datetime < new Date();
    
    return `
        <div class="reminder-card ${reminder.completed ? 'completed' : ''} priority-${reminder.priority} ${isOverdue ? 'overdue' : ''}" 
             data-id="${reminder.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="reminder-title">
                        ${reminder.title}
                        <span class="badge priority-${reminder.priority}">${reminder.priority}</span>
                        ${reminder.repeat !== 'none' ? 
                            `<span class="repeat-indicator"><i class="fas fa-redo"></i>${reminder.repeat}</span>` : 
                            ''}
                    </div>
                    ${reminder.description ? `<p class="reminder-info mb-2">${reminder.description}</p>` : ''}
                    <div class="reminder-info">
                        <i class="fas fa-calendar"></i> ${formatDateTime(datetime)}
                        ${isOverdue ? '<span class="text-danger ms-2"><i class="fas fa-exclamation-circle"></i> Overdue</span>' : ''}
                    </div>
                </div>
                <div class="reminder-actions">
                    ${!reminder.completed ? `
                        <button class="btn btn-sm btn-success me-1" onclick="completeReminder(${reminder.id})">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary me-1" onclick="showEditModal(${reminder.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteReminder(${reminder.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createEmptyState(message) {
    return `
        <div class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <p>${message}</p>
        </div>
    `;
}

function showEditModal(id) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    document.getElementById('editReminderId').value = reminder.id;
    document.getElementById('editReminderTitle').value = reminder.title;
    document.getElementById('editReminderDescription').value = reminder.description;
    document.getElementById('editReminderDate').value = reminder.datetime.split('T')[0];
    document.getElementById('editReminderTime').value = reminder.datetime.split('T')[1];
    document.getElementById('editReminderPriority').value = reminder.priority;
    document.getElementById('editReminderRepeat').value = reminder.repeat;

    editReminderModal.show();
}

function updateReminder() {
    const id = parseInt(document.getElementById('editReminderId').value);
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    reminder.title = document.getElementById('editReminderTitle').value;
    reminder.description = document.getElementById('editReminderDescription').value;
    reminder.datetime = `${document.getElementById('editReminderDate').value}T${document.getElementById('editReminderTime').value}`;
    reminder.priority = document.getElementById('editReminderPriority').value;
    reminder.repeat = document.getElementById('editReminderRepeat').value;

    saveReminders();
    renderReminders();
    editReminderModal.hide();
    showToast('Reminder updated successfully!', 'success');
}

function completeReminder(id) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    reminder.completed = true;
    
    // Handle repeating reminders
    if (reminder.repeat !== 'none') {
        const newReminder = {...reminder};
        newReminder.id = Date.now();
        newReminder.completed = false;
        
        const nextDate = new Date(reminder.datetime);
        switch (reminder.repeat) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
        }
        newReminder.datetime = nextDate.toISOString().split('.')[0];
        reminders.push(newReminder);
    }

    saveReminders();
    renderReminders();
    showToast('Reminder completed!', 'success');
}

function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    reminders = reminders.filter(r => r.id !== id);
    saveReminders();
    renderReminders();
    showToast('Reminder deleted', 'success');
}

function toggleCompletedReminders() {
    const section = document.getElementById('completedRemindersSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function checkDueReminders() {
    const now = new Date();
    reminders.forEach(reminder => {
        if (!reminder.completed) {
            const dueTime = new Date(reminder.datetime);
            const diffMinutes = Math.floor((dueTime - now) / (1000 * 60));
            
            if (diffMinutes === 0) {
                showNotification(reminder);
            }
        }
    });
}

function showNotification(reminder) {
    // Check if the browser supports notifications
    if (!("Notification" in window)) return;

    // Request permission if needed
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Show notification if permitted
    if (Notification.permission === "granted") {
        new Notification(reminder.title, {
            body: reminder.description || 'Your reminder is due!',
            icon: '/static/favicon.ico'
        });
    }

    // Show toast notification
    showToast(`Reminder: ${reminder.title}`, 'info');
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const bgClass = type === 'error' ? 'bg-danger' : 
                   type === 'success' ? 'bg-success' : 
                   'bg-primary';
    
    toast.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <strong class="me-auto">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                                  type === 'success' ? 'check-circle' : 
                                  'bell'}"></i>
                ${type.charAt(0).toUpperCase() + type.slice(1)}
            </strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function formatDateTime(datetime) {
    const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    return datetime.toLocaleString('en-US', options);
}

function getPriorityWeight(priority) {
    const weights = {
        'urgent': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    };
    return weights[priority] || 0;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function isWithinWeek(date, now) {
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return date >= now && date <= weekFromNow;
}

function saveReminders() {
    localStorage.setItem('reminders', JSON.stringify(reminders));
} 