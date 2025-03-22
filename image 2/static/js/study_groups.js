// Store study groups in localStorage
let studyGroups = JSON.parse(localStorage.getItem('studyGroups') || '[]');

// Initialize Bootstrap components
const joinGroupModal = new bootstrap.Modal(document.getElementById('joinGroupModal'));

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date to today for the date input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('groupDate').min = today;

    // Initialize form submission
    document.getElementById('createGroupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        createGroup();
    });

    // Render groups and start auto-update
    renderGroups();
    setInterval(updateGroupStatus, 60000); // Update every minute
});

function createGroup() {
    const subject = document.getElementById('groupSubject').value;
    const description = document.getElementById('groupDescription').value;
    const date = document.getElementById('groupDate').value;
    const time = document.getElementById('groupTime').value;
    const venue = document.getElementById('groupVenue').value;
    const maxParticipants = document.getElementById('groupMaxParticipants').value;

    if (!subject || !description || !date || !time || !venue || !maxParticipants) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const group = {
        id: Date.now(),
        subject,
        description,
        datetime: `${date}T${time}`,
        venue,
        maxParticipants: parseInt(maxParticipants),
        participants: [],
        createdAt: new Date().toISOString()
    };

    studyGroups.push(group);
    saveGroups();
    renderGroups();
    document.getElementById('createGroupForm').reset();
    showToast('Study group created successfully!', 'success');
}

function showJoinGroupModal(groupId) {
    const group = studyGroups.find(g => g.id === groupId);
    if (!group) return;

    const groupDetails = document.getElementById('groupDetails');
    groupDetails.innerHTML = `
        <h4>${group.subject}</h4>
        <p>${group.description}</p>
        <p><strong>Date & Time:</strong> ${formatDateTime(group.datetime)}</p>
        <p><strong>Venue:</strong> ${group.venue}</p>
        <p><strong>Participants:</strong> ${group.participants.length}/${group.maxParticipants}</p>
        ${group.participants.length > 0 ? 
            `<p><strong>Current Participants:</strong><br>${group.participants.join('<br>')}</p>` : 
            ''}
    `;

    joinGroupModal._groupId = groupId;
    joinGroupModal.show();
}

function joinGroup() {
    const groupId = joinGroupModal._groupId;
    const name = document.getElementById('participantName').value.trim();
    
    if (!name) {
        showToast('Please enter your name', 'error');
        return;
    }

    const group = studyGroups.find(g => g.id === groupId);
    if (!group) return;

    if (group.participants.length >= group.maxParticipants) {
        showToast('This group is already full', 'error');
        return;
    }

    if (group.participants.includes(name)) {
        showToast('You are already in this group', 'error');
        return;
    }

    group.participants.push(name);
    saveGroups();
    renderGroups();
    joinGroupModal.hide();
    document.getElementById('joinGroupForm').reset();
    showToast('Successfully joined the study group!', 'success');
}

function renderGroups() {
    const now = new Date();
    const liveGroups = document.getElementById('liveGroups');
    const upcomingGroups = document.getElementById('upcomingGroups');
    
    liveGroups.innerHTML = '';
    upcomingGroups.innerHTML = '';
    
    let liveCount = 0;
    let upcomingCount = 0;

    studyGroups.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    studyGroups.forEach(group => {
        const groupDate = new Date(group.datetime);
        const timeDiff = (groupDate - now) / (1000 * 60); // difference in minutes
        const isLive = timeDiff >= -30 && timeDiff <= 120; // Consider "live" if within 30 min before to 2 hours after start
        const isPast = timeDiff < -30;

        if (!isPast) {
            const groupCard = createGroupCard(group, isLive);
            
            if (isLive) {
                liveGroups.appendChild(groupCard);
                liveCount++;
            } else {
                upcomingGroups.appendChild(groupCard);
                upcomingCount++;
            }
        }
    });

    document.getElementById('liveCount').textContent = liveCount;
    document.getElementById('upcomingCount').textContent = upcomingCount;

    // Show empty state messages if needed
    if (liveCount === 0) {
        liveGroups.innerHTML = createEmptyState('No live study groups at the moment');
    }
    if (upcomingCount === 0) {
        upcomingGroups.innerHTML = createEmptyState('No upcoming study groups');
    }
}

function createGroupCard(group, isLive) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    const isFull = group.participants.length >= group.maxParticipants;
    const statusClass = isLive ? 'success' : 'primary';
    const statusText = isLive ? 'Live Now' : formatTimeUntil(group.datetime);

    col.innerHTML = `
        <div class="card group-card h-100 ${isLive ? 'border-success' : ''}">
            <div class="card-header bg-${statusClass} bg-opacity-10">
                <h5 class="card-title text-${statusClass} mb-0">
                    ${group.subject}
                    <span class="badge bg-${statusClass} float-end">${statusText}</span>
                </h5>
            </div>
            <div class="card-body">
                <p class="card-text">${group.description}</p>
                <div class="group-info">
                    <p><i class="fas fa-calendar-alt"></i> ${formatDateTime(group.datetime)}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${group.venue}</p>
                    <p><i class="fas fa-users"></i> ${group.participants.length}/${group.maxParticipants} participants</p>
                </div>
                <button class="btn btn-${statusClass} w-100" 
                    onclick="showJoinGroupModal(${group.id})"
                    ${isFull ? 'disabled' : ''}>
                    ${isFull ? 'Group Full' : 'Join Group'}
                </button>
            </div>
        </div>
    `;

    return col;
}

function createEmptyState(message) {
    return `
        <div class="empty-state">
            <i class="fas fa-users-slash"></i>
            <p>${message}</p>
        </div>
    `;
}

function formatDateTime(datetime) {
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    return new Date(datetime).toLocaleString('en-US', options);
}

function formatTimeUntil(datetime) {
    const now = new Date();
    const target = new Date(datetime);
    const diff = target - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
        return `in ${hours}h`;
    } else {
        const days = Math.floor(hours / 24);
        return `in ${days}d`;
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const bgClass = type === 'error' ? 'bg-danger' : 'bg-success';
    
    toast.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <strong class="me-auto">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                ${type === 'error' ? 'Error' : 'Success'}
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

function updateGroupStatus() {
    renderGroups();
}

function saveGroups() {
    localStorage.setItem('studyGroups', JSON.stringify(studyGroups));
} 