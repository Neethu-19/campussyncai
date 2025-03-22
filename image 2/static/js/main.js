// Global variables
let timetables = [];
let showCompletedTasks = true;

// Initialize Bootstrap toast
const toastEl = document.getElementById('notificationToast');
const toast = new bootstrap.Toast(toastEl);

// Drag and drop functionality
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

// Enable multiple file selection
fileInput.setAttribute('multiple', 'true');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropZone.classList.add('dragover');
}

function unhighlight(e) {
    dropZone.classList.remove('dragover');
}

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    files.forEach(handleFile);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach(handleFile);
}

function handleFile(file) {
    if (!file.name.endsWith('.docx')) {
        showNotification('Please upload a .docx file', 'warning');
        return;
    }

    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.classList.remove('d-none');

    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Add metadata to the timetable
        data.timetable.fileName = file.name;
        data.timetable.uploadTime = new Date().toISOString();
        
        // Store in localStorage
        localStorage.setItem('currentTimetable', JSON.stringify(data.timetable));
        
        // Add to timetables array for multiple timetable support
        timetables.push({
            name: file.name,
            data: data.timetable
        });
        
        displaySchedules();
        checkForMinorProject(data.timetable);
        findCommonFreeHours();
        loadingSpinner.classList.add('d-none');
        showNotification(`Schedule ${file.name} loaded successfully!`, 'success');
    })
    .catch(error => {
        showNotification('Error: ' + error.message, 'error');
        loadingSpinner.classList.add('d-none');
    });
}

function displayTimetable(timetable) {
    // Save the current timetable to localStorage before displaying
    localStorage.setItem('currentTimetable', JSON.stringify(timetable));
    
    const container = document.getElementById('timetable');
    if (!container) return;
    
    // Rest of the display logic...
    // ... existing display code ...
}

function displaySchedules() {
    const scheduleDisplay = document.getElementById('scheduleDisplay');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    if (!timetables.length) {
        scheduleDisplay.classList.add('d-none');
        return;
    }

    // Clear existing content
    tableHeader.innerHTML = '<th class="day-header">Day</th>';
    tableBody.innerHTML = '';

    // Get all unique time slots from all timetables
    const timeSlots = new Set();
    timetables.forEach(tt => {
        if (tt.data) {
            const firstDay = Object.values(tt.data)[0];
            if (firstDay) {
                Object.keys(firstDay).forEach(slot => timeSlots.add(slot));
            }
        }
    });

    // Create header with all time slots
    Array.from(timeSlots).sort().forEach(timeSlot => {
        tableHeader.innerHTML += `<th class="time-slot-header">${timeSlot}</th>`;
    });

    // Get all unique days
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Create rows for each day
    days.forEach(day => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="day-cell">${day}</td>`;
        
        Array.from(timeSlots).sort().forEach(timeSlot => {
            let cellContent = [];
            timetables.forEach((tt, index) => {
                if (tt.data && tt.data[day] && tt.data[day][timeSlot]) {
                    cellContent.push(`
                        <div class="timetable-${index}">
                            ${tt.data[day][timeSlot]}
                            <small class="timetable-name">(${tt.name})</small>
                        </div>
                    `);
                }
            });
            
            const isEmpty = cellContent.length === 0;
            const cellClass = isEmpty ? 'free-slot' : '';
            row.innerHTML += `<td class="${cellClass} time-slot-cell">${cellContent.join('') || '-'}</td>`;
        });

        tableBody.appendChild(row);
    });

    scheduleDisplay.classList.remove('d-none');
    startTimeTracking();
}

function findCommonFreeHours() {
    if (timetables.length < 2) return;

    const commonFreeHours = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    days.forEach(day => {
        const timeSlots = new Set();
        // Get all time slots from all timetables
        timetables.forEach(tt => {
            if (tt.data[day]) {
                Object.keys(tt.data[day]).forEach(slot => timeSlots.add(slot));
            }
        });

        // Check each time slot
        timeSlots.forEach(slot => {
            let isFree = true;
            timetables.forEach(tt => {
                if (tt.data[day] && tt.data[day][slot] && tt.data[day][slot].trim() !== '') {
                    isFree = false;
                }
            });
            if (isFree) {
                if (!commonFreeHours[day]) {
                    commonFreeHours[day] = [];
                }
                commonFreeHours[day].push(slot);
            }
        });
    });

    // Show notification for common free hours
    Object.entries(commonFreeHours).forEach(([day, slots]) => {
        if (slots.length > 0) {
            const message = `Common free time found on ${day} at ${slots.join(', ')}. Would you like to join a study group or meet a friend?`;
            showNotificationWithAction(message, () => {
                addTodoItem(`Schedule study group/meeting on ${day} at ${slots[0]}`);
            });
        }
    });
}

function showNotificationWithAction(message, action) {
    const toast = document.getElementById('notificationToast');
    const toastBody = toast.querySelector('.toast-body');
    
    toastBody.innerHTML = `
        ${message}<br>
        <button class="btn btn-primary btn-sm mt-2" onclick="handleNotificationAction()">Yes, Schedule it!</button>
    `;
    
    // Store the action for later use
    toast.dataset.action = action.toString();
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function handleNotificationAction() {
    const toast = document.getElementById('notificationToast');
    const action = new Function('return ' + toast.dataset.action)();
    action();
}

// Time tracking and notifications
function startTimeTracking() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    setInterval(checkClassTimes, 60000);
}

function updateCurrentTime() {
    const currentTimeEl = document.getElementById('currentTime');
    const now = new Date();
    currentTimeEl.textContent = now.toLocaleTimeString();
}

function checkClassTimes() {
    if (!timetables.length) return;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    timetables.forEach(tt => {
        if (tt.data[currentDay]) {
            Object.entries(tt.data[currentDay]).forEach(([timeSlot, subject]) => {
                const [endTime] = timeSlot.split('-')[1].trim().split(' ');
                if (currentTime === endTime && subject.trim() !== '') {
                    showNotification(`Class ended: ${subject}`, 'info');
                    showTodoPopup(subject);
                }
            });
        }
    });

    // Show attendance checklist at the end of the day
    const endOfDay = "17:00"; // 5 PM
    if (currentTime === endOfDay) {
        showAttendanceChecklist();
    }
}

function showTodoPopup(subject) {
    // Create modal element
    const modalHtml = `
        <div class="modal fade" id="todoModal" tabindex="-1" aria-labelledby="todoModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="todoModalLabel">Add Task for ${subject}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="todoTask" class="form-label">Task Description</label>
                            <input type="text" class="form-control" id="todoTask" 
                                value="Complete homework/assignment for ${subject}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Skip</button>
                        <button type="button" class="btn btn-primary" onclick="saveTodoFromModal()">Add Task</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById('todoModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('todoModal'));
    modal.show();

    // Focus on input field
    document.getElementById('todoTask').select();

    // Handle enter key
    document.getElementById('todoTask').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveTodoFromModal();
        }
    });
}

function saveTodoFromModal() {
    const taskInput = document.getElementById('todoTask');
    const task = taskInput.value.trim();
    
    if (task) {
        const todo = {
            id: Date.now(),
            task: task,
            completed: false,
            timestamp: new Date().toISOString()
        };
        todos.push(todo);
        saveTodos();
        renderTodos();
    }
    
    // Hide and remove modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('todoModal'));
    modal.hide();
    setTimeout(() => {
        document.getElementById('todoModal').remove();
    }, 150);
}

function checkForMinorProject(timetable) {
    const minorProjectVariations = [
        'minor project', 'minorproject', 'Minor Project',
        'MinorProject', 'MINOR PROJECT', 'MINORPROJECT'
    ];

    for (const [day, schedule] of Object.entries(timetable)) {
        for (const subject of Object.values(schedule)) {
            if (minorProjectVariations.some(variant => 
                subject.toLowerCase().replace(/\s+/g, '') === variant.toLowerCase().replace(/\s+/g, '')
            )) {
                showNotification('Remember to work on your Minor Project!', 'minor-project');
                return;
            }
        }
    }
}

// Notifications
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastBody = toast.querySelector('.toast-body');
    
    toastBody.textContent = message;
    
    // Update toast styling based on type
    toast.className = `toast ${type}`;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Todo List functionality
let todos = JSON.parse(localStorage.getItem('todos') || '[]');

function addTodoItem(suggestedTask = '') {
    const task = prompt('Enter a new task:', suggestedTask);
    if (task) {
        const todo = {
            id: Date.now(),
            task: task,
            completed: false,
            timestamp: new Date().toISOString()
        };
        todos.push(todo);
        saveTodos();
        renderTodos();
    }
}

function promptForTodoItem(suggestion) {
    if (confirm('Would you like to add a todo item?')) {
        addTodoItem(suggestion);
    }
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
}

function toggleCompletedTasks() {
    showCompletedTasks = !showCompletedTasks;
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    todos
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach(todo => {
            if (!showCompletedTasks && todo.completed) return;

            const li = document.createElement('li');
            li.className = `list-group-item todo-item ${todo.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <input class="form-check-input me-2" type="checkbox" ${todo.completed ? 'checked' : ''}
                        onclick="toggleTodo(${todo.id})">
                    <span class="todo-text">${todo.task}</span>
                    <small class="text-muted ms-2">${new Date(todo.timestamp).toLocaleString()}</small>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteTodo(${todo.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            todoList.appendChild(li);
        });
}

// Initial render of todos
renderTodos();

function showAttendanceChecklist() {
    // For testing, use Friday instead of current day
    const currentDay = 'Friday';
    const todaySubjects = getTodaySubjects(currentDay);

    if (todaySubjects.length === 0) {
        showNotification('No subjects found for Friday. Please upload your timetable first.', 'warning');
        return;
    }

    // Create modal element
    const modalHtml = `
        <div class="modal fade" id="attendanceModal" tabindex="-1" aria-labelledby="attendanceModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="attendanceModalLabel">
                            <i class="fas fa-calendar-check me-2"></i>
                            Mark Friday's Attendance (Test Mode)
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="attendanceForm">
                            ${todaySubjects.map((subject, index) => `
                                <div class="form-check mb-3 attendance-check">
                                    <input class="form-check-input" type="checkbox" id="subject${index}" value="${subject}">
                                    <label class="form-check-label" for="subject${index}">
                                        ${subject}
                                        <small class="text-muted attendance-stats" data-subject="${subject}"></small>
                                    </label>
                                </div>
                            `).join('')}
                        </form>
                        <div class="mt-4">
                            <h6 class="mb-3"><i class="fas fa-chart-bar me-2"></i>Attendance Statistics</h6>
                            <div id="attendanceStats" class="small"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveAttendance()">
                            <i class="fas fa-save me-2"></i>Save Attendance
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById('attendanceModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
    modal.show();

    // Update attendance statistics
    updateAttendanceStats();
}

function getTodaySubjects(currentDay) {
    const subjects = new Set();
    
    // Get current timetable from localStorage
    const currentTimetable = JSON.parse(localStorage.getItem('currentTimetable') || '{}');
    
    if (currentTimetable && currentTimetable[currentDay]) {
        Object.values(currentTimetable[currentDay]).forEach(subject => {
            if (subject && 
                subject !== 'Free Hour' && 
                subject !== '-' && 
                !subject.includes('Break') && 
                !subject.includes('Lunch')) {
                subjects.add(subject);
            }
        });
    }

    return Array.from(subjects);
}

function saveAttendance() {
    const form = document.getElementById('attendanceForm');
    if (!form) {
        showNotification('Error: Attendance form not found', 'error');
        return;
    }

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const date = new Date().toISOString().split('T')[0];
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    
    if (checkboxes.length === 0) {
        showNotification('Error: No subjects found to mark attendance', 'error');
        return;
    }

    // Get attendance data from localStorage
    let attendanceData = JSON.parse(localStorage.getItem('attendanceData') || '{}');

    checkboxes.forEach(checkbox => {
        const subject = checkbox.value;
        if (!attendanceData[subject]) {
            attendanceData[subject] = {
                totalClasses: 0,
                attendedClasses: 0,
                history: []
            };
        }

        // Increment total classes
        attendanceData[subject].totalClasses++;
        
        // If checked, increment attended classes
        if (checkbox.checked) {
            attendanceData[subject].attendedClasses++;
        }

        // Add to history
        attendanceData[subject].history.push({
            date: date,
            day: currentDay,
            status: checkbox.checked ? 'present' : 'absent'
        });
    });

    // Save to localStorage
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));

    // Show success notification
    showNotification('Attendance saved successfully!', 'success');

    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
    if (modal) {
        modal.hide();
    }

    // Update attendance statistics
    updateAttendanceStats();
}

function updateAttendanceStats() {
    const attendanceData = JSON.parse(localStorage.getItem('attendanceData') || '{}');
    const statsDiv = document.getElementById('attendanceStats');
    if (!statsDiv) return;

    let statsHtml = '';
    
    for (const subject in attendanceData) {
        const data = attendanceData[subject];
        const percentage = (data.attendedClasses / data.totalClasses * 100).toFixed(1);
        const statusClass = percentage >= 75 ? 'text-success' : 
                          percentage >= 65 ? 'text-warning' : 'text-danger';

        statsHtml += `
            <div class="mb-2">
                <strong>${subject}:</strong> 
                <span class="${statusClass}">${percentage}%</span>
                (${data.attendedClasses}/${data.totalClasses} classes)
            </div>
        `;

        // Update small stats in checkboxes
        const statLabel = document.querySelector(`.attendance-stats[data-subject="${subject}"]`);
        if (statLabel) {
            statLabel.textContent = ` (${percentage}% attendance)`;
            statLabel.className = `attendance-stats ${statusClass} ms-2`;
        }
    }

    statsDiv.innerHTML = statsHtml;
}

// Add button to manually show attendance checklist
function addAttendanceButton() {
    const navbar = document.querySelector('.navbar-nav');
    if (!navbar) return;

    // Check if button already exists
    if (document.querySelector('.attendance-btn')) return;

    const attendanceButton = document.createElement('li');
    attendanceButton.className = 'nav-item';
    attendanceButton.innerHTML = `
        <button class="btn btn-link nav-link attendance-btn" onclick="showAttendanceChecklist()">
            <i class="fas fa-check-double"></i> Mark Attendance
        </button>
    `;

    navbar.appendChild(attendanceButton);
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize file input and dropzone
    initializeFileHandling();
    
    // Add attendance button to navbar
    addAttendanceButton();
    
    // Start time tracking
    startTimeTracking();
    
    // Render initial todos
    renderTodos();
    
    // Display any existing schedules
    if (timetables.length > 0) {
        displaySchedules();
    }
});

function initializeFileHandling() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (fileInput) {
        fileInput.setAttribute('multiple', 'true');
        fileInput.addEventListener('change', handleFileSelect, false);
    }
    
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
    }
} 