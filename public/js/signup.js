 // Function to toggle between login and signup forms
 function showSignup() {
    document.getElementById("login").style.display = "none";
    document.getElementById("signup").style.display = "block";
}

function showLogin() {
    document.getElementById("signup").style.display = "none";
    document.getElementById("login").style.display = "block";
}

// Add event listener to the login form
document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent form submission

    // Get login form data
    const loginData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    // Send login data to the server
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            alert(data.message);
            if (data.message === 'Login successful') {

                // Wait for 2 seconds (2000 milliseconds) before redirecting
                setTimeout(() => {
                    window.location.href = '/index';
                }, 500);

            }

        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
});

// Add event listener to the signup form
document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    // Get form data from input fields
    const username = document.getElementById('username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const is_parent = document.getElementById('is_parent').checked ? 1 : 0;

    // Make a POST request to your server for signup
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, is_parent })
        });

        if (response.ok) {
            // If signup is successful, display success message
            alert('Signup successful! Redirecting to index page...');

            // Wait for 2 seconds (2000 milliseconds) before redirecting
            setTimeout(() => {
                window.location.href = '/index';
            }, 2000);
        } else {
            // If signup is unsuccessful, display an error message to the user
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while processing your request.');
    }
});