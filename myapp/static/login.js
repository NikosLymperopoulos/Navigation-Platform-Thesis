const FONT_SIZE_STEP = 2; 
const FONT_ORIGINAL_SIZE = parseFloat(getComputedStyle(document.documentElement).fontSize);

document.addEventListener('DOMContentLoaded', async function() {
    const toolbarOverlay = document.querySelector('.toolbar-overlay');
    const toolbarToggle = document.querySelector('.toolbar-toggle a');
    document.addEventListener('click', function(event) {
        if (!toolbarOverlay.contains(event.target) && !toolbarToggle.contains(event.target)) {
            if (toolbarOverlay.classList.contains('visible')) {
                toolbarOverlay.classList.remove('visible');
            }
        }
    });

    document.querySelector('.toolbar-toggle a').addEventListener('click', function() {
        console.log('Clicked'); // Ensure this logs to the console
        document.querySelector('.toolbar-overlay').classList.toggle('visible');
    });
    
    function updateFontSize(change) {
        const root = document.documentElement; // Target the html element
        const currentSize = parseFloat(getComputedStyle(root).fontSize); // Get the current font size
        root.style.fontSize = `${currentSize + change}px`; // Update font size
    }
    
    function increaseFontSize() {
        updateFontSize(FONT_SIZE_STEP);
    }
    
    function decreaseFontSize() {
        updateFontSize(-FONT_SIZE_STEP);
    }
    
    document.querySelector('.btn-reset').addEventListener('click', function() {
        // Reset font size to default
        const root = document.documentElement; // Target the html element
        root.style.fontSize = `${FONT_ORIGINAL_SIZE}px`;

        // Remove high-contrast class
        document.body.classList.remove('high-contrast');

        // Remove grayscale class (if any)
        document.body.classList.remove('grayscale');

        // Reset any other accessibility changes here
    });
    
    document.querySelectorAll('.btn-resize-font').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default link behavior
            const action = this.getAttribute('data-action');
            if (action === 'resize-plus') {
                increaseFontSize();
            } else if (action === 'resize-minus') {
                decreaseFontSize();
            }
        });
    })

    document.querySelectorAll('.btn-background-group').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const action = this.getAttribute('data-action');
            if (action === 'grayscale') {
                document.body.classList.toggle('grayscale');
            } else if (action === 'high-contrast') {
                document.body.classList.toggle('high-contrast');
            }
        });
    });

});

document.getElementById('loginButton').addEventListener('click', function() {

    // Get the values of the inputs
    var email = document.getElementById('id_email').value;
    var password = document.getElementById('id_password1').value;

    // Prepare the data to send
    var data = {
        'email': email,
        'password': password
    };

    // Send AJAX POST request
    fetch('/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            'email': email,
            'password': password
        })
    })
    .then(response => response.json())  // Parse JSON response
    .then(data => {
        if (data.success) {
            // Redirect or update UI based on successful login
            window.location.href = '/';
        } else {
            // Handle login failure, e.g., display an error message
            showAlert('Login failed: ' + data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

function showAlert(message) {
    const alertDiv = document.getElementById('alertDiv');
    const alertMessage = document.getElementById('alertMessage');
    
    // Set the message and type
    alertMessage.textContent = message;

    // Show the alert
    alertDiv.classList.add('visible');
    alertDiv.classList.remove('fade-out');

    // Automatically fade out the alert after 2 seconds
    setTimeout(() => {
        alertDiv.classList.add('fade-out');

        // After fade-out completes, hide the alert and clean up classes
        setTimeout(() => {
            alertDiv.classList.remove('visible', 'fade-out');
        }, 500);
    }, 2000);
}

function hideAlert() {
    const alertDiv = document.getElementById('alertDiv');

    // Trigger fade-out
    alertDiv.classList.add('fade-out');

    // After fade-out, hide the alert and remove all classes
    setTimeout(() => {
        alertDiv.classList.remove('visible', 'fade-out');
    }, 500);
}