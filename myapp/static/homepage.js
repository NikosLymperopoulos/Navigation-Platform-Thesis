const HERE_API_KEY = ''; // Replace with your HERE API key

const FONT_SIZE_STEP = 2; 
const FONT_ORIGINAL_SIZE = parseFloat(getComputedStyle(document.documentElement).fontSize);

let selectedCityData = null; // Variable to store selected city data

document.addEventListener('DOMContentLoaded', async function() {
    
    document.getElementById('cityInput').addEventListener('input', handleCityInput);
    document.getElementById('searchButton').addEventListener('click', handleSearchButtonClick);
    document.getElementById('mapButton').addEventListener('click', handleMapButtonClick);

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
    const searchInput = document.getElementById('cityInput');
    const searchContainer = document.getElementById('search-bar-container');

    // Add an event listener to the input field to monitor changes in its value
    searchInput.addEventListener('input', function() {
        // Check if the input value is not empty
        if (searchInput.value.trim() === '') {
            // Show the search container by adding the 'visible' class
            searchContainer.classList.remove('visible');
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

function showAlert(message) {
    // Find the alert div and message element
    const alertDiv = document.getElementById('alertDiv');
    const alertMessage = document.getElementById('alertMessage');

    // Set the message and type
    alertMessage.textContent = message;
    
    // Show the alert
    alertDiv.classList.add('visible');
    alertDiv.classList.remove('fade-out');

    // Automatically fade out the alert after 1 second
    setTimeout(() => {
        alertDiv.classList.add('fade-out'); // Start fade-out

        // After fade-out completes, hide the alert and clean up classes
        setTimeout(() => {
            alertDiv.classList.remove('visible', 'fade-out'); // Remove classes
        }, 500); // Fade-out duration matches CSS transition
    }, 2000); // Delay before fade-out starts
}

function hideAlert() {
    const alertDiv = document.getElementById('alertDiv');
    
    // Trigger fade-out
    alertDiv.classList.add('fade-out');
    
    // After fade-out, hide the alert and remove all classes
    setTimeout(() => {
        alertDiv.classList.remove('visible', 'fade-out');
    }, 500); // Fade-out duration matches CSS transition
}


async function getPlaceLocation(query) {
    const searchUrl = `https://geocode.search.hereapi.com/v1/geocode?apikey=${HERE_API_KEY}&q=${query}`;
    try {
        // Step 1: Fetch the search results
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.items && searchData.items.length > 0) {
            return searchData;
        } else {
            console.log('No results found');
            return []; // Return an empty array if no results found
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function handleCityInput(event) {
    const query = event.target.value; // Use event.target to get the input field value
    const resultsContainer = document.getElementById('autocomplete-results');
    const searchContainer = document.getElementById('search-bar-container');

    // Clear selected city data and autocomplete results if input is empty
    if (query.length === 0) {
        selectedCityData = null;
        resultsContainer.innerHTML = ''; // Clear results container
        return;
    }

    // Only trigger the API call if the input length is greater than 1 character
    if (query.length > 1) {
        // Wait for the promise to resolve and get the items array
        const result = await getPlaceLocation(query);
        resultsContainer.innerHTML = ''; // Clear previous results
        console.log(result.items);
        if (result && result.items) {
            result.items.forEach(suggestion => {
                if (suggestion.resultType === "locality") {
                    if (!searchContainer.classList.contains('visible')) {
                        searchContainer.classList.add('visible');
                    }
                    const div = document.createElement('div');
                    div.textContent = suggestion.address.label;
                    div.classList.add('autocomplete-item');
                    div.addEventListener('click', () => {
                        console.log('Selected:', suggestion);
                        selectedCityData = suggestion;
                        
                        // Populate the input field with the selected suggestion
                        event.target.value = suggestion.address.label;
                        resultsContainer.innerHTML = ''; // Clear results after selection
                        searchContainer.classList.remove('visible');
                        
                    });
                    resultsContainer.appendChild(div);
                }
            });
        } else {
            searchContainer.classList.remove('visible');
            console.error('No items found');
        }
    }
}

async function handleSearchButtonClick() {
    if (selectedCityData) {
        const cityData = {
            cityName: selectedCityData.address.city,
            countryName: selectedCityData.address.countryName,
            postalCode: selectedCityData.address.postalCode,
            lat: selectedCityData.position.lat,
            lng: selectedCityData.position.lng
        };
        console.log(cityData);
        // Send data to the backend
        const response = await fetch('/save_city_info/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Include CSRF token if needed
            },
            body: JSON.stringify(cityData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            console.log('Data saved successfully');
            window.location.href = '/map/'; // Redirect to map view
        } else {
            console.error('Failed to save data');
        }
    } else {
        showAlert('Please select a city from the autocomplete options');
    }
}

async function handleMapButtonClick() {
    try {
        const response = await fetch('/city_info/'); // Adjust the URL if needed
        if (!response.ok) {
            showAlert('Select a city to visit first!');
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
}

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
