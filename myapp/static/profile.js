const HERE_API_KEY = ''; // Replace with your HERE API key
const FONT_SIZE_STEP = 2; 
const FONT_ORIGINAL_SIZE = parseFloat(getComputedStyle(document.documentElement).fontSize);

// Set up event listeners
document.addEventListener('DOMContentLoaded', async function() {
    await setUpInputFieldListeners();
    await updateUserInputs(); // Fetch and display existing favorite places on load
});

// Set up input field listeners
function setUpInputFieldListeners() {
    console.log('Setting up input field listeners...');

    const homeInput = document.getElementById('homeInput');
    const workInput = document.getElementById('workInput');
    const newFavoritePlaceInput = document.getElementById('id_new_favorite_place');
    const resultsContainer = document.getElementById('autocomplete-results');

    if (!resultsContainer) {
        console.error('Autocomplete results container not found');
        return;
    }

    // Event listener for the Home input field
    homeInput.addEventListener('input', function(event) {
        const query = event.target.value.trim();
        getPlaceLocation(query).then(suggestions => {
            showAutocompleteSuggestions(suggestions, homeInput);
        });
    });

    // Event listener for the Work input field
    workInput.addEventListener('input', function(event) {
        const query = event.target.value.trim();
        getPlaceLocation(query).then(suggestions => {
            showAutocompleteSuggestions(suggestions, workInput);
        });
    });

    // Event listener for the New Favorite Place input field
    newFavoritePlaceInput.addEventListener('input', function(event) {
        const query = event.target.value.trim();
        getPlaceLocation(query).then(suggestions => {
            showAutocompleteSuggestions(suggestions, newFavoritePlaceInput);
        });
    });

    // Accessibility Tool-Bar
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

    document.getElementById('mapButton').addEventListener('click', async function() {
        try {
            const response = await fetch('/city_info/'); // Adjust the URL if needed
            if (!response.ok) {
                const userConfirmed = confirm(`Do you wish to be redirected to the homepage and select a city?`);
                if (userConfirmed) {
                    window.location.href = '/'; // Redirect to map view if confirmed
                }
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const userConfirmed = confirm(`Do you wish to see your last visited city ${data.name}, ${data.country}?`);
            if (userConfirmed) {
                window.location.href = '/map/'; // Redirect to map view if confirmed
            }
        } catch (error) {
            console.error('Error fetching city info:', error);
        }
    });

    const check_box = document.getElementById('form-check-box');

    fetch('/get_user_data/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.mobility_user !== undefined) {
            check_box.checked = data.mobility_user;
        } else {
            console.error('Error fetching user data:', data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });

    check_box.addEventListener('change', function() {
        const isChecked = this.checked;
    
        fetch('/update-mobility-user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // Include CSRF token for security
            },
            body: JSON.stringify({
                mobility_user: isChecked
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Your mobility feature settings have been saved!');
            } else {
                console.error('Error updating mobility user:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
}

async function getPlaceLocation(query = '') {
    if (!query) return []; // Return early if query is empty or undefined

    const searchUrl = `https://geocode.search.hereapi.com/v1/geocode?apikey=${HERE_API_KEY}&q=${encodeURIComponent(query)}`;
    
    try {
        // Step 1: Fetch the search results
        const searchResponse = await fetch(searchUrl);

        // Check if the response is ok (status 200-299)
        if (!searchResponse.ok) {
            console.error('Failed to fetch data:', searchResponse.statusText);
            return [];
        }

        const searchData = await searchResponse.json();

        // Step 2: Return only the items array or an empty array if no items found
        return searchData.items || [];

    } catch (error) {
        console.error('Error fetching location data:', error);
        return []; // Return an empty array in case of error
    }
}

// Fetch autocomplete suggestions from the API
async function fetchAutocomplete(query) {
    const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error('Error fetching autocomplete:', error);
        return [];
    }
}

// Show autocomplete suggestions
function showAutocompleteSuggestions(suggestions, input) {
    const resultsContainer = document.getElementById('autocomplete-results');
    resultsContainer.innerHTML = ''; // Clear previous results

    suggestions.forEach(suggestion => {
        if ((suggestion.resultType === "houseNumber") || (suggestion.resultType === "place")) {
            console.log(suggestion);
            const div = document.createElement('div');
            div.textContent = suggestion.address.label;
            div.classList.add('autocomplete-item');
            div.addEventListener('click', () => {
                console.log('Selected:', suggestion);
                if (input.id === 'id_new_favorite_place') {
                    addFavoritePlace(suggestion.address.label);
                    input.value = '';
                }
                else{
                    input.value = suggestion.address.label;
                    const form = document.getElementById('profile-form');
                    if (form) {
                        form.submit(); // Submit the form
                    }
                }
                resultsContainer.innerHTML = ''; // Clear results after selection
            });
            resultsContainer.appendChild(div);
        }
    });
}

// Clear autocomplete results
function clearAutocompleteResults() {
    const resultsContainer = document.getElementById('autocomplete-results');
    resultsContainer.innerHTML = '';
}

// Add a new favorite place
async function addFavoritePlace(placeName) {
    try {
        const response = await fetch('/add_favorite_place/', {  // Adjust the URL to your endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Fetch CSRF token from cookies
            },
            body: JSON.stringify({ name: placeName })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        await fetchFavoritePlaces(); // Refresh the list after adding
    } catch (error) {
        console.error('Error adding favorite place:', error);
    }
}

async function updateUserInputs() {
    try {
        const response = await fetch('/get_user_data/'); // Adjust the URL to your endpoint

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        const user_home = result.home;
        const user_work = result.work;
        const favoritePlaces = result.favorite_places;
        
        if(user_home){
            const homeInput = document.getElementById('homeInput');
            homeInput.value = user_home;
        }
        if(user_work){
            const workInput = document.getElementById('workInput');
            workInput.value = user_work;
        }
        
        console.log(favoritePlaces);
        displayFavoritePlaces(favoritePlaces);
    } catch (error) {
        console.error('Error fetching favorite places:', error);
    }
}

// Fetch and display favorite places
async function fetchFavoritePlaces() {
    try {
        const response = await fetch('/get_user_data/'); // Adjust the URL to your endpoint

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        const favoritePlaces = result.favorite_places;
        console.log(favoritePlaces);
        displayFavoritePlaces(favoritePlaces);
    } catch (error) {
        console.error('Error fetching favorite places:', error);
    }
}

// Display favorite places with delete buttons
function displayFavoritePlaces(favoritePlaces) {
    const favoritePlacesList = document.getElementById('favorite-places-list');
    favoritePlacesList.innerHTML = ''; // Clear previous list

    favoritePlaces.forEach((place, index) => {
        const div = document.createElement('div');
        div.classList.add('favorite-item');
        
        // Create a span for the text to apply specific styling
        const span = document.createElement('span');
        span.classList.add('favorite-place-text');
        span.innerText = place.name;
    
        // Create the delete button
        const button = document.createElement('button');
        button.classList.add('delete-favorite');
        button.dataset.index = index;
        button.innerText = 'X';
    
        // Add event listener to the delete button
        button.addEventListener('click', (event) => {
            const index = event.target.getAttribute('data-index');
            const placeName = favoritePlaces[index].name;
            deleteFavoritePlace(placeName); // Call the method to delete the place
        });
    
        // Append the span and button to the div
        div.appendChild(span);
        div.appendChild(button);
    
        favoritePlacesList.appendChild(div);
    });
}

// Delete a favorite place
async function deleteFavoritePlace(placeName) {
    try {
        const response = await fetch('/delete_favorite_place/', {  // Adjust the URL to your endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Fetch CSRF token from cookies
            },
            body: JSON.stringify({ name: placeName })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        fetchFavoritePlaces(); // Refresh the list after deleting
    } catch (error) {
        console.error('Error deleting favorite place:', error);
    }
}


// Helper function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

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