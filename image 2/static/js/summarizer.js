// Initialize drag and drop functionality
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle file input change
    fileInput.addEventListener('change', handleFileSelect, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('highlight');
}

function unhighlight(e) {
    dropZone.classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.endsWith('.pptx')) {
            uploadFile(file);
        } else {
            showNotification('Please upload a PDF or PPTX file', 'error');
        }
    }
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Show loading spinner
    document.getElementById('loadingSpinner').classList.remove('d-none');

    // Send file to server
    fetch('/summarize', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displaySummary(data.summary, file.name);
        } else {
            showNotification(data.error || 'Error processing file', 'error');
        }
    })
    .catch(error => {
        showNotification('Error uploading file', 'error');
    })
    .finally(() => {
        // Hide loading spinner
        document.getElementById('loadingSpinner').classList.add('d-none');
    });
}

function displaySummary(summary, fileName) {
    const summaryDisplay = document.getElementById('summaryDisplay');
    const fileNameElement = document.getElementById('fileName');
    const summaryTextElement = document.getElementById('summaryText');

    fileNameElement.textContent = fileName;
    summaryTextElement.innerHTML = summary.replace(/\n/g, '<br>');
    summaryDisplay.classList.remove('d-none');

    // Store summary for download
    window.currentSummary = summary;
    window.currentFileName = fileName;

    showNotification('Summary generated successfully', 'success');
}

function downloadSummary() {
    if (window.currentSummary && window.currentFileName) {
        const blob = new Blob([window.currentSummary], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary_${window.currentFileName}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastBody = toast.querySelector('.toast-body');
    const toastHeader = toast.querySelector('.toast-header');

    // Set toast color based on type
    toastHeader.className = 'toast-header';
    if (type === 'error') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else {
        toastHeader.classList.add('bg-primary', 'text-white');
    }

    toastBody.textContent = message;
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
} 