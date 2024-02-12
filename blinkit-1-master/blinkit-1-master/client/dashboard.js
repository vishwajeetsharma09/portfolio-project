document.addEventListener('DOMContentLoaded', function() {
    const usernameSpan = document.getElementById('username');
    const imageUploadForm = document.getElementById('imageUploadForm');
    const uploadedImagesDiv = document.getElementById('uploadedImages');

    // Fetch the username of the logged-in user
    fetch('/user', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('User not authenticated');
        }
        return response.json();
    })
    .then(data => {
        usernameSpan.textContent = data.username;
    })
    .catch(error => {
        console.error('Error:', error.message);
        window.location.href = '/login.html'; // Redirect to login page if user is not authenticated
    });

    // Handle image upload form submission
    imageUploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(imageUploadForm);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Image upload failed');
            }
            return response.json();
        })
        .then(data => {
            // Display uploaded images
            uploadedImagesDiv.innerHTML += `<img src="/uploads/${data.username}/${data.filename}" alt="Uploaded Image">`;
        })
        .catch(error => {
            console.error('Error:', error.message);
        });
    });
});
