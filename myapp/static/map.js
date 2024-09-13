const HERE_API_KEY = ''; // Replace with your HERE API key
const MAPQUEST_API_KEY = ''; // Replace with your MAPQUEST API key

const FONT_SIZE_STEP = 2; 
const FONT_ORIGINAL_SIZE = parseFloat(getComputedStyle(document.documentElement).fontSize);

const loadingOverlay = document.getElementById('loading-overlay');
let isLoading = false;

let segmentsToAvoid = [];

let viaWaypoints = [];
let viaWaypointsNames = [];
let newUrl = '/map/';
let mode = null;
let clickCount = 0;
let coordinates = [];
let map = null;
let platform = null;
let startInputCoords = null;
let endInputCoords = null;
let city_info = null;
let user_data = null;
let previousRouteLine = [];
let previousMarkers = [];
let userCoords = '';
let userLocationEnabled = true;
let user_location_marker = null;

async function fetchCityInfo() {
    try {
        const response = await fetch('/city_info/'); // Adjust the URL if needed
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        return data;
    } catch (error) {
        console.error('Error fetching city info:', error);
    }
}

async function initMap() {
    toggleLoadingIndicator();
    platform = new H.service.Platform({
        apikey: HERE_API_KEY 
    });

    const rasterTileService = platform.getRasterTileService();
    const rasterTileProvider = new H.service.rasterTile.Provider(rasterTileService);
    const rasterTileLayer = new H.map.layer.TileLayer(rasterTileProvider);

    let defaultLayers = platform.createDefaultLayers();
    city_info = await fetchCityInfo();
    console.log(city_info);

    map = new H.Map(
        document.getElementById('map'),
        defaultLayers.vector.normal.map,
        {
            zoom: 14,
            center: { lat: city_info.latitude, lng: city_info.longitude }
        }
    );
    let behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    let ui = H.ui.UI.createDefault(map, defaultLayers);
    
    user_data = await fetchUserData();
    console.log(user_data);
    if (navigator.geolocation) {
        await MarkUserLocation('tracker');
        setInterval(MarkUserLocation, 20000); // call it every 20 seconds (20000 milliseconds)
    }
    setUpClickListener(map, platform);
    loadRouteFromUrl();
    
    

    let addresses = await fetchAddresses();
    if(addresses){
        let groupedAddresses = await groupAddressesByStreet(addresses);
        drawLinesOnMap(map, groupedAddresses);
    }

    toggleLoadingIndicator();
}

function resetMap() {
    // Reset the variables
    viaWaypoints = [];
    viaWaypointsNames = [];
    mode = null;
    clickCount = 0;
    coordinates = [];
    startInputCoords = null;
    endInputCoords = null;
    newUrl = '/map/';
    if (previousRouteLine) {
        previousRouteLine.forEach((routeLine) => {
            if (routeLine) {
                map.removeObject(routeLine);
            }
        });
        previousRouteLine = [];
    }
    clearMarkers();
    const waypointsList = document.getElementById('waypointsList');
    if (waypointsList) {
        waypointsList.innerHTML = ''; // Remove all waypoint elements 
    }
    const resultsContainer = document.getElementById('autocomplete-results');        
    resultsContainer.innerHTML = ''; // Clear previous results

    document.getElementById('duration-display').textContent = '';
    document.getElementById('distance-display').textContent = '';

    document.getElementById('startInput').value = '';
    document.getElementById('endInput').value = '';
    document.getElementById('viaWaypointsInput').value = '';
    window.history.pushState({}, '', newUrl);
    // Recenter the map to the initial city coordinates
    map.setCenter({ lat: city_info.latitude, lng: city_info.longitude });
    map.setZoom(14); // Reset zoom level if needed

    console.log('Map and variables have been reset');
}

function toggleLoadingIndicator() {
    if (isLoading) {
        loadingOverlay.style.display = 'none'; // Hide the overlay
    } else {
        loadingOverlay.style.display = 'flex'; // Show the overlay
    }
    isLoading = !isLoading; // Toggle the state
}

function showAlert(message) {
    // Find the alert div and message element
    const alertDiv = document.getElementById('alertDiv');
    const alertMessage = document.getElementById('alertMessage');

    // Set the message
    alertMessage.textContent = message;

    // Add fade-in class to show the alert with fade-in effect
    alertDiv.classList.add('visible', 'fade-in');
    alertDiv.classList.remove('fade-out'); // Remove fade-out class in case it exists

    // Automatically fade out the alert after 3 seconds
    setTimeout(() => {
        alertDiv.classList.add('fade-out'); // Start fade-out

        // After fade-out completes, hide the alert and clean up classes
        setTimeout(() => {
            alertDiv.classList.remove('visible', 'fade-in', 'fade-out'); // Remove classes
        }, 500); // Fade-out duration matches CSS transition
    }, 3000); // Delay before fade-out starts
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

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoordinates = [
                        position.coords.latitude.toFixed(7),
                        position.coords.longitude.toFixed(7)
                    ];
                    resolve(userCoordinates); // Resolve the Promise with the coordinates
                },
                (error) => {
                    console.error("Error getting location:", error);
                    reject(error); // Reject the Promise with the error
                }
            );
        } else {
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}

async function MarkUserLocation(mode) {
    try {
        userCoords = await getUserLocation();
        if(user_location_marker){
            map.removeObject(user_location_marker);
        }
        
        if(mode === 'tracker'){
            let svgMarkup = '<svg width="24" height="24" ' +
                'xmlns="http://www.w3.org/2000/svg">' +
                '<rect stroke="white" fill="#1b468d" x="1" y="1" width="22" ' +
                'height="22" /><text x="12" y="18" font-size="12pt" ' +
                'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
                'fill="white">U</text></svg>';
            let icon = new H.map.Icon(svgMarkup);
            user_location_marker = new H.map.Marker({ lat: userCoords[0], lng: userCoords[1] }, {icon: icon});
        
            map.addObject(user_location_marker);
        }
    }
    catch (error) {
        if(userLocationEnabled){
            showAlert("Could not get your location. Please check your browser settings and try again.");
            userLocationEnabled = false;
        }
    }
}

function groupAddressesByStreet(addresses) {
    const grouped = {};

    addresses.forEach(address => {
        if (!grouped[address.street]) {
            grouped[address.street] = [];
        }
        grouped[address.street].push({
            latitude: parseFloat(address.latitude),
            longitude: parseFloat(address.longitude),
            house_number: address.house_number
        });
    });

    // Sort addresses in each group by house number
    Object.keys(grouped).forEach(street => {
        grouped[street].sort((a, b) => a.house_number - b.house_number);
    });

    return grouped;
}

function getLineSegments(addresses) {
    const segments = [];
    let i = 0;

    while (i < addresses.length) {
        const start = addresses[i];
        let end = start;

        // Track the current street
        const currentStreet = start.street;

        // Continue as long as the next address is on the same street
        // and the house number difference is 2 or less
        while (i + 1 < addresses.length &&
               addresses[i + 1].street === currentStreet &&
               addresses[i + 1].house_number - end.house_number <= 2) {
            end = addresses[i + 1];
            i++;
        }

        segments.push({ start, end });
        i++; // Move to the next address for the next segment
    }

    return segments;
}

function drawRouteLinesOnMap(map, sections) {
    sections.forEach((section) => {
        let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);

        // Create the line background
        const routeBackground = new H.map.Polyline(linestring, {
            style: {
                lineWidth: 6,
                strokeColor: 'rgba(0, 128, 255, 0.7)', // Background color
                lineTailCap: 'arrow-tail',
                lineHeadCap: 'arrow-head'
            }
        });

        // Create a patterned polyline with arrows
        const routeArrows = new H.map.Polyline(linestring, {
            style: {
                lineWidth: 6,
                fillColor: 'white',
                strokeColor: 'rgba(255, 255, 255, 1)', // Arrow color
                lineDash: [0, 2], // Dotted line
                lineTailCap: 'arrow-tail',
                lineHeadCap: 'arrow-head'
            }
        });

        var routeLine = new H.map.Group();
        routeLine.addObjects([routeBackground, routeArrows]);
        previousRouteLine.push(routeLine);
        map.addObject(routeLine);

        // Adjust the view to fit the route
        map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() });
    });
}


function drawLinesOnMap(map, groupedAddresses) {
    Object.keys(groupedAddresses).forEach(street => {
        const addresses = groupedAddresses[street];
        const segments = getLineSegments(addresses);

        segments.forEach(segment => {
            if (segment.start !== segment.end) {
                const lineString = new H.geo.LineString();
                lineString.pushPoint({ lat: segment.start.latitude, lng: segment.start.longitude });
                lineString.pushPoint({ lat: segment.end.latitude, lng: segment.end.longitude });

                const line = new H.map.Polyline(lineString, {
                    style: { strokeColor: 'red', lineWidth: 5 }
                });

                map.addObject(line);
            }
        });
    });
}

function addMarkersToMap(addresses) {
    let svgMarkup = '<svg width="24" height="24" ' +
                'xmlns="http://www.w3.org/2000/svg">' +
                'height="22" /><text x="12" y="18" font-size="12pt" ' +
                'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
                'fill="red">X</text></svg>';
    let icon = new H.map.Icon(svgMarkup);
    addresses.forEach(address => {
        if (address.latitude && address.longitude) {
            // Create a marker with the custom icon
            const marker = new H.map.Marker({ lat: address.latitude, lng: address.longitude }, { icon: icon });
            map.addObject(marker);
        }
    });
}
   

function validateAddresses(address1, address2) {
    return address1.street === address2.street;
}

function setUpClickListener(map, platform) {

    const handleMapClick = async (evt) => {
        var coord = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
        clickCount++;
        coordinates.push({lat: coord.lat, lng: coord.lng});

        if (clickCount === 2) {
            map.removeEventListener('tap', handleMapClick); // Remove event listener after two clicks
            const segStart = [coordinates[0].lat, coordinates[0].lng];
            const segEnd = [coordinates[1].lat, coordinates[1].lng];
            
            if(mode === 'route'){
                let startAddress = await getAddressFromCoordinates(segStart[0], segStart[1]);
                let endAddress = await getAddressFromCoordinates(segEnd[0], segEnd[1]);

                resetMap();
                document.getElementById('startInput').value = startAddress.shortLabel;
                document.getElementById('endInput').value = endAddress.shortLabel;
                await calculateRoute(platform, map, segStart, segEnd);
            }
            else if ((mode === 'vote') || (mode === 'open_vote')) {
                const address1 = await getAddressFromCoordinates(coordinates[0].lat, coordinates[0].lng);
                const address2 = await getAddressFromCoordinates(coordinates[1].lat, coordinates[1].lng);
                if(validateAddresses(address1, address2)) {
                    await saveAddress(address1, address2);
                }
                else{
                    showAlert('Addresses are not on the same street');
                }
            }
            else if (mode === 'segment') {
                let segId = await findSegmentId(segStart, segEnd);
                segmentsToAvoid.push(segId);
            }
            
            // Reset counters for future use
            clickCount = 0;
            coordinates = [];
            mode = null;
            
        }
    };

    async function handleRouteInput(event) {
        const query = event.target.value; // Use event.target to get the input field value
        const resultsContainer = document.getElementById('autocomplete-results');
        // Wait for the promise to resolve and get the items array
        let combinedQuery = '';
        let result = '';
        const autocompleteContainer = document.getElementById('autocomplete-container');

        resultsContainer.innerHTML = ''; // Clear previous results

        if (query === '') {
            if (event.target.id === 'startInput') {
                startInputCoords = null;
            } else if (event.target.id === 'endInput') {
                endInputCoords = null;
            }
            return;
        }
        
        combinedQuery = `${query}, ${city_info.name}`;
        result = await getPlaceLocation(combinedQuery);

        if (result && result.items) {
            result.items.forEach(suggestion => {
                if ((suggestion.address.city === city_info.name) && ((suggestion.resultType === "houseNumber") || (suggestion.resultType === "place"))) {
                    if (!autocompleteContainer.classList.contains('visible')) {
                        autocompleteContainer.classList.add('visible');
                    }
                    const div = document.createElement('div');
                    div.textContent = suggestion.address.label;
                    div.classList.add('autocomplete-item');
                    div.addEventListener('click', () => {
                        console.log('Selected:', suggestion);
                        // Populate the input field with the selected suggestion
                        const suggestionParts = suggestion.address.label.split(',');
                        let suggestionFirstPart = '';                       
                        if(suggestion.resultType === "place"){
                            suggestionFirstPart = suggestionParts.slice(0, 2).join(',');
                        }
                        else{
                            suggestionFirstPart = `${suggestionParts.slice(0, 1).join(',')}, ${suggestion.address.city}`;
                        }
                        
                        if (event.target.id === 'startInput') {
                            event.target.value = suggestionFirstPart;
                            startInputCoords = [suggestion.position.lat , suggestion.position.lng];
                        } else if (event.target.id === 'endInput') {
                            event.target.value = suggestionFirstPart;
                            endInputCoords = [suggestion.position.lat , suggestion.position.lng];
                        } else if (event.target.id === 'viaWaypointsInput'){
                            viaWaypointsNames.push(suggestionFirstPart);
                            viaWaypoints.push(`${suggestion.position.lat},${suggestion.position.lng}`);
                            event.target.value = '';
                            displayWaypoints();
                        }
                        processCalculateRouteParameters();
                        resultsContainer.innerHTML = ''; // Clear results after selection
                        autocompleteContainer.classList.remove('visible');

                    });
                    resultsContainer.appendChild(div);
                }
            });
        } else {
            autocompleteContainer.classList.remove('visible');
            console.error('No items found');
        }
    }

    function setRouteInputListeners(inputId, quickAccessId, currentLocationId, homeOptionId, workOptionId) {
        const input = document.getElementById(inputId);
        const quickAccess = document.getElementById(quickAccessId);
        const currentLocationOption = document.getElementById(currentLocationId);
        const homeOption = document.getElementById(homeOptionId);
        const workOption = document.getElementById(workOptionId);
        
        const searchContainer = document.getElementById('search-bar-container');
        if (searchContainer) {
            if (!user_data.home && !user_data.work && !user_data.favorite_places.length) {
                searchContainer.style.display = 'none'; // Hide if both are emptyd
            } else {
                searchContainer.style.display = 'block'; // Show if at least one is not empty
            }
        }
        input.addEventListener('focus', function() {
            if (input.value === '') {
                quickAccess.style.display = 'block';
                currentLocationOption.style.display = 'block';

                if (user_data.home) {
                    homeOption.style.display = 'block';  // Show "Home" option
                } else {
                    homeOption.style.display = 'none';   // Hide "Home" option
                }
    
                if (user_data.work) {
                    workOption.style.display = 'block';  // Show "Work" option
                } else {
                    workOption.style.display = 'none';   // Hide "Work" option
                }

                // Clear any existing favorite places to avoid duplication
                const existingfavoriteElements = quickAccess.querySelectorAll('.favorite-item');
                existingfavoriteElements.forEach(element => element.remove());

                // Populate favorite places dynamically
                user_data.favorite_places.forEach(place => {
                    const div = document.createElement('div');
                    div.textContent = place.name;
                    div.classList.add('quick-access-item', 'favorite-item');
                    div.addEventListener('click', async function() {
                        if (inputId === 'viaWaypointsInput') {
                            // Push to waypoints if this is the waypoints input
                            viaWaypointsNames.push(place.name);

                            viaWaypointsCoords = await getCoordinatesFromAddress(place.name);
                            viaWaypoints.push(`${viaWaypointsCoords[0]},${viaWaypointsCoords[1]}`);
                            displayWaypoints();
                        } else {
                            input.value = place.name;
                        }
                        processCalculateRouteParameters();
                        quickAccess.style.display = 'none';
                    });
                    quickAccess.appendChild(div);
                });
            }
        });

        input.addEventListener('keyup', function() {
            if (input.value !== '') {
                quickAccess.style.display = 'none';
            } else if (input.value === '') {
                quickAccess.style.display = 'block';
            }
        });
    
        input.addEventListener('blur', function() {
            setTimeout(() => {
                quickAccess.style.display = 'none';
            }, 200); // Delay to allow for clicks on quick access items
        });

        currentLocationOption.addEventListener('click', async function() {
            if(userCoords){
                toggleLoadingIndicator();
                try {
                    let currentUserCoords = await getUserLocation();
                    if (inputId === 'viaWaypointsInput') {
                        // Push to waypoints if this is the waypoints input
                        let currentUserAddress = await getAddressFromCoordinates(currentUserCoords[0], currentUserCoords[1]);
                        viaWaypointsNames.push('Current User Location');
                        viaWaypoints.push(`${currentUserCoords[0]},${currentUserCoords[1]}`);
                        displayWaypoints();
                    } else if (inputId === 'startInput') {
                        input.value = 'Current User Location';
                        startInputCoords = currentUserCoords;
                    }
                    else if (inputId === 'endInput') {
                        input.value = 'Current User Location';
                        endInputCoords = currentUserCoords;
                    }
                    processCalculateRouteParameters();
                    quickAccess.style.display = 'none';
                }
                catch (error) {
                    showAlert("Could not get your location. Please check your browser settings and try again.");
                } finally {
                    toggleLoadingIndicator(); // Ensure the loading indicator is hidden in all cases
                }
            }
            else{
                showAlert("Could not get your location. Please check your browser settings and try again.");
            }
        });
    
        homeOption.addEventListener('click', async function() {
            if (inputId === 'viaWaypointsInput') {
                // Push to waypoints if this is the waypoints input
                viaWaypointsNames.push(user_data.home);

                viaWaypointsCoords = await getCoordinatesFromAddress(user_data.home);
                viaWaypoints.push(`${viaWaypointsCoords[0]},${viaWaypointsCoords[1]}`);
                displayWaypoints();
            } else {
                input.value = user_data.home;
            }
            processCalculateRouteParameters();
            quickAccess.style.display = 'none';
        });
    
        workOption.addEventListener('click', async function() {
            if (inputId === 'viaWaypointsInput') {
                // Push to waypoints if this is the waypoints input
                viaWaypointsNames.push(user_data.work);

                viaWaypointsCoords = await getCoordinatesFromAddress(user_data.work);
                viaWaypoints.push(`${viaWaypointsCoords[0]},${viaWaypointsCoords[1]}`);
                displayWaypoints();
            } else {
                input.value = user_data.work;
            }
            processCalculateRouteParameters();
            quickAccess.style.display = 'none';
        });
        
    }

    function toggleDropdown() {
        var dropdown = document.getElementById("actionsDropdown");
        if (dropdown.classList.contains('visible')) {
            dropdown.classList.remove('visible');
        } else {
            dropdown.classList.add('visible');
        }
    }

    function handleActionsBlur() {
        const dropdown = document.getElementById('actionsDropdown');
        setTimeout(() => {
            dropdown.classList.remove('visible');
        }, 200);
    }

    document.getElementById('actionsButton').addEventListener('click', toggleDropdown);
    document.getElementById('actionsButton').addEventListener('blur', handleActionsBlur);

    document.getElementById('routeButton').addEventListener('click', function() {
        mode = 'route';
        showAlert('Now select two points on the map for your route by clicking on them.');
        map.addEventListener('tap', handleMapClick);
    });
    document.getElementById('voteButton').addEventListener('click', function() {
        mode = 'vote';
        showAlert('Now click on the map to report a non-accessible road or section.');
        map.addEventListener('tap', handleMapClick);
    });
    document.getElementById('openButton').addEventListener('click', function() {
        mode = 'open_vote';
        showAlert('Now click on the map to report an accessible road or section.');
        map.addEventListener('tap', handleMapClick);
    });
    
    document.getElementById('clearButton').addEventListener('click', resetMap);
    document.getElementById('shareButton').addEventListener('click', function() {
        const { start_lat, start_lng, end_lat, end_lng, waypoints } = window.contextData;
        const waypointsStr = viaWaypoints.join('/');
        window.history.pushState({}, '', newUrl);
        navigator.clipboard.writeText(window.location.href)
        .then(() => {
            if(newUrl !== '/map/'){
                showAlert('URL copied to clipboard!');
            }
            else{
                showAlert('Calculate a route to share!');
            }
        })
        .catch(err => {
            console.error('Failed to copy URL: ', err);
        });
    });

    function handleBlur() {
        const autocompleteContainer = document.getElementById('autocomplete-container');
        setTimeout(() => {
            autocompleteContainer.classList.remove('visible');
        }, 200);
        
    }
    
    // Add event listeners to the input fields
    document.getElementById('startInput').addEventListener('blur', handleBlur);
    document.getElementById('endInput').addEventListener('blur', handleBlur);
    document.getElementById('viaWaypointsInput').addEventListener('blur', handleBlur);
    

    document.getElementById('startInput').addEventListener('input', handleRouteInput);
    document.getElementById('endInput').addEventListener('input', handleRouteInput);
    document.getElementById('viaWaypointsInput').addEventListener('input', handleRouteInput);
    
    // document.getElementById('calculateRouteButton').addEventListener('click', processCalculateRouteParameters);

    // Apply the listener setup for both startInput and endInput
    setRouteInputListeners('startInput', 'quick-access-start','current-location-start', 'home-option-start', 'work-option-start');
    setRouteInputListeners('endInput', 'quick-access-end','current-location-end', 'home-option-end', 'work-option-end');
    setRouteInputListeners('viaWaypointsInput', 'quick-access-stops','current-location-stops', 'home-option-stops', 'work-option-stops');

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
    

    console.log('Click Listeners Set');
}

async function fetchAddresses() {
    try {
        let response = await fetch('/get_addresses/');  // Adjust the URL if necessary
        if (response.ok) {
            let data = await response.json();
            data.addresses = data.addresses.filter(address => address.city === city_info.name); // Only keep addresses in the same city as the users
            return data.addresses;
        } else {
            console.error("Failed to fetch addresses:", response.status);
        }
    } catch (error) {
        console.error("Error fetching addresses:", error);
    }
}

async function getAddressFromCoordinates(latitude, longitude) {
    const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${latitude},${longitude}&apiKey=${HERE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
      
        const data = await response.json();
        const address = data.items[0].address;
        return {
            label: address.label,
            shortLabel : `${address.label.split(",")[0]}, ${address.city}`,
            city: address.city,
            street: address.street,
            houseNumber: address.houseNumber
        };
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function getCoordinatesFromAddress(addressQuery) {
    const url = `https://www.mapquestapi.com/geocoding/v1/address?key=${MAPQUEST_API_KEY}&location=${encodeURIComponent(addressQuery)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const position = data.results[0].locations[0].latLng;
        return [position.lat, position.lng];
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function saveAddress(address1, address2) {
    toggleLoadingIndicator();

    try {
        let city1 = address1.city;
        let street1 = address1.street;
        let houseNumber1 = parseInt(address1.houseNumber);

        let city2 = address2.city;
        let street2 = address2.street;
        let houseNumber2 = parseInt(address2.houseNumber);

        if ((houseNumber1 % 2 === 0 && houseNumber2 % 2 !== 0) || (houseNumber1 % 2 !== 0 && houseNumber2 % 2 === 0)) {
            showAlert('Both house numbers must be either even or odd. Please ensure the addresses are on the same side of the street.');
            return;
        }



        let smallerHouseNumber = Math.min(houseNumber1, houseNumber2);
        let largerHouseNumber = Math.max(houseNumber1, houseNumber2);
        let addresses = [];
        let promises = [];
        let startCoords = '';
        let endCoords = '';


        for (let houseNumber = smallerHouseNumber; houseNumber <= largerHouseNumber; houseNumber=houseNumber+2) {
            // Get coordinates for current address
            let addressQuery = `${houseNumber} ${street1}, ${city1}`;
            let currentCoords = await getCoordinatesFromAddress(addressQuery);
            if(houseNumber === smallerHouseNumber){
                startCoords = currentCoords;
            }
            else if((houseNumber === largerHouseNumber) || (houseNumber === largerHouseNumber-1)){
                endCoords = currentCoords;
            }

            const addressData = {
                city: city1,
                street: street1,
                house_number: houseNumber
            };

            if (mode === 'vote') {
                // Fetch segment ID for current address pair
                let promise = findSegmentId(currentCoords, currentCoords)
                    .then(segment_id => {
                        addresses.push({
                            ...addressData,
                            segment_id: segment_id,
                            latitude: currentCoords[0],
                            longitude: currentCoords[1]
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching segment ID:', error);
                    });
                promises.push(promise);
            } else if (mode === 'open_vote') {
                addresses.push(addressData);
            }
        }

        if (mode === 'vote') {
            await Promise.all(promises);
        }
        console.log(JSON.stringify({ addresses: addresses }));
        const response = await fetch('/save_address/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // Ensure CSRF token is included
            },
            body: JSON.stringify({ addresses: addresses })
        });
        const result = await response.json();
        if (result.status === 'success') {
            console.log('Address saved successfully');
        } else {
            console.log('Error saving address');
        }
        if(startCoords && endCoords){

            startMarker = createMarker(startCoords[0], startCoords[1], 'V');
            endMarker = createMarker(endCoords[0], endCoords[1], 'V');
            map.addObject(startMarker);
            map.addObject(endMarker);

            const lineString = new H.geo.LineString();
            lineString.pushPoint({ lat: startCoords[0], lng: startCoords[1] });
            lineString.pushPoint({ lat: endCoords[0], lng: endCoords[1] });
            let line = '';
            if (mode === 'vote') {
                line = new H.map.Polyline(lineString, {
                    style: { strokeColor: 'orange', lineWidth: 5 }
                });
                previousRouteLine.push(line);
    
            }
            else if (mode === 'open_vote') {
                line = new H.map.Polyline(lineString, {
                    style: { strokeColor: 'green', lineWidth: 5 }
                });
                previousRouteLine.push(line);
            }
            map.addObject(line);
        }


    } catch (error) {
        console.error('Error:', error);
    } finally {
        toggleLoadingIndicator();
    }
}

// Function to get CSRF token
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

async function findSegmentId(start, end) {
    const [latStart, lngStart] = start;
    const [latEnd, lngEnd] = end;

    const url = `https://router.hereapi.com/v8/routes?apikey=${HERE_API_KEY}&origin=${latStart},${lngStart}&destination=${latEnd},${lngEnd}&return=polyline&spans=segmentId&transportMode=pedestrian`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const segment_id = data.routes[0].sections[0].spans[0].topologySegmentId.replace(/[-+]/g, '');;
        return segment_id;
    } catch (error) {
        console.error('Error finding segment ID:', error);
    }
}

async function fetchSegmentIds() {
    try {
        const response = await fetch('/get_segment_ids/');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        let uniqueSegmentIds = [...new Set(data.segment_ids)];
        return(uniqueSegmentIds);
    } catch (error) {
        console.error('Error fetching segment IDs:', error);
    }
}

function clearMarkers(){
    if (previousMarkers) {
        previousMarkers.forEach((marker) => {
            if (marker) {
                map.removeObject(marker);
            }
        });
        previousMarkers = [];
    }
}

function createMarker(lat, lng, label) {
    // Update the SVG markup with the given label
    let svgMarkup = `<svg width="24" height="24" 
        xmlns="http://www.w3.org/2000/svg">
        <rect stroke="white" fill="#14213d" x="1" y="1" width="22" height="22" rx="4" ry="4"/>
        <text x="12" y="18" font-size="12pt" font-family="Arial" font-weight="bold" 
        text-anchor="middle" fill="#fca311">${label}</text></svg>`;

    // Create a new icon using the updated SVG
    let icon = new H.map.Icon(svgMarkup);
    let marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon })
    previousMarkers.push(marker);
    // Create a new marker with the custom icon
    return marker;
}

function addMarkers(map, start, end, waypoints) {
    // Add marker for the start point with label 'A'
    let startMarker = createMarker(start[0], start[1], 'A');
    map.addObject(startMarker);

    // Add marker for the end point with label 'B'
    let endMarker = createMarker(end[0], end[1], 'B');
    map.addObject(endMarker);

    // Loop through waypoints array and add markers with incremental numbers
    waypoints.forEach((waypoint, index) => {
        let [lat, lng] = waypoint.split(',').map(Number); // Convert lat/lng to numbers
        let waypointMarker = createMarker(lat, lng, (index + 1).toString());
        map.addObject(waypointMarker);
    });

    return false;
}

function displayWaypoints() {
    const waypointsList = document.getElementById('waypointsList');
    waypointsList.innerHTML = ''; // Clear previous waypoints

    viaWaypointsNames.forEach((waypoint, index) => {
        const div = document.createElement('div');
        div.classList.add('waypoint-item');
        div.draggable = true; // Make the item draggable
        div.innerHTML = `${index + 1}: ${waypoint} <button class="delete-waypoint" data-index="${index}">X</button>`;

        div.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', index); // Store the index of the dragged item
            div.classList.add('dragging'); // Add dragging class
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging'); // Remove dragging class
        });

        // Event listener for when dragging enters the drop target
        div.addEventListener('dragover', (event) => {
            event.preventDefault(); // Allow drop
        });

        // Event listener for dropping the item
        div.addEventListener('drop', (event) => {
            event.preventDefault();
            const fromIndex = event.dataTransfer.getData('text/plain'); // Get the index of the dragged item
            const toIndex = index; // Index where the item is dropped

            if (fromIndex !== toIndex) {
                // Reorder waypoints
                const movedWaypoint = viaWaypointsNames.splice(fromIndex, 1)[0];
                const movedCoords = viaWaypoints.splice(fromIndex, 1)[0];

                viaWaypointsNames.splice(toIndex, 0, movedWaypoint);
                viaWaypoints.splice(toIndex, 0, movedCoords);

                displayWaypoints(); // Refresh the displayed waypoints
                processCalculateRouteParameters();
            }
        });

        // Event listener for delete button
        div.querySelector('.delete-waypoint').addEventListener('click', (event) => {
            const index = event.target.getAttribute('data-index');
            viaWaypointsNames.splice(index, 1);
            viaWaypoints.splice(index, 1);
            displayWaypoints(); // Refresh the displayed waypoints
            processCalculateRouteParameters();
        });

        waypointsList.appendChild(div);
    });
}

async function loadRouteFromUrl() {

    if (window.contextData.start_lat) {
        const { start_lat, start_lng, end_lat, end_lng, waypoints } = window.contextData;
        
        console.log('Start Latitude:', start_lat);
        console.log('Start Longitude:', start_lng);
        console.log('End Latitude:', end_lat);
        console.log('End Longitude:', end_lng);
        console.log('Waypoints:', waypoints);

        const startInputName = await getAddressFromCoordinates(start_lat, start_lng);
        const endInputName = await getAddressFromCoordinates(end_lat, end_lng);

        document.getElementById('startInput').value = startInputName.shortLabel;
        document.getElementById('endInput').value = endInputName.shortLabel;

        if (waypoints) {
            for (const waypoint of waypoints) {
                
                const lat = parseFloat(waypoint.lat);
                const lng = parseFloat(waypoint.lng);
                viaWaypoints.push(`${lat},${lng}`);

                try {
                    const address = await getAddressFromCoordinates(lat, lng);
                    viaWaypointsNames.push(address.shortLabel);
                } catch (error) {
                    console.error('Failed to get address:', error);
                    viaWaypointsNames.push(`${viaWaypoints.length}: ${lat},${lng}`); // Fallback to coordinates if address fetch fails
                }
            };
        }

        // Update the waypoints display
        displayWaypoints();
        calculateRoute(platform, map, [start_lat, start_lng], [end_lat, end_lng]);
        
    }
}

async function processCalculateRouteParameters() {
    const startInputValue = document.getElementById('startInput').value;
    const endInputValue = document.getElementById('endInput').value;

    if(!startInputCoords && (startInputValue)){
        startInputCoords = await getCoordinatesFromAddress(startInputValue);
    }
    if(!endInputCoords && (endInputValue)){
        endInputCoords = await getCoordinatesFromAddress(endInputValue);
    }
    if(startInputCoords && endInputCoords){
        await calculateRoute(platform, map, startInputCoords, endInputCoords);
        startInputCoords = null;
        endInputCoords = null;
    }


}

async function calculateRoute(platform, map, start, end) {
    toggleLoadingIndicator();
    let segment_ids = [];
    console.log(user_data);
    if(user_data.mobility_user){
        segment_ids = await fetchSegmentIds();
    }

    
    let router = platform.getRoutingService(null, 8);
    let routingParameters = null;

    if(segment_ids.length){
        routingParameters = {
            transportMode: 'pedestrian',
            origin: start,
            destination: end,
            return: 'polyline,summary',
            'avoid[segments]': segment_ids.join(','),
            'pedestrian[speed]' : 1.15,
            'via': new H.service.Url.MultiValueQueryParameter(viaWaypoints)
        };
    }
    else{
        routingParameters = {
            transportMode: 'pedestrian',
            origin: start,
            destination: end,
            return: 'polyline,summary',
            'pedestrian[speed]' : 1.15,
            'via': new H.service.Url.MultiValueQueryParameter(viaWaypoints)
        };
    }

    function onResult(result) {
        if (result.routes.length) {
            if (previousRouteLine) {
                previousRouteLine.forEach((routeLine) => {
                    if (routeLine) {
                        map.removeObject(routeLine);
                    }
                });
                previousRouteLine = [];
            }
            result.routes[0].sections.forEach((section) => {
                drawRouteLinesOnMap(map, [section]);
            });
            let durationInSeconds = 0;
            let distanceInMeters = 0;

            result.routes[0].sections.forEach((section, index) => {
                durationInSeconds += section.summary.duration;
                distanceInMeters += section.summary.length;
            });
            
            
            // Convert duration to minutes, remove decimals, and add 'minutes'
            let durationInMinutes = Math.floor(durationInSeconds / 60);
            // Convert duration to minutes/hours, remove decimals
            let hours = Math.floor(durationInMinutes / 60);
            let minutes = durationInMinutes % 60;

            // Create a string to display the duration
            let durationString = '';

            if (hours > 0) {
                durationString += hours + ' hour' + (hours > 1 ? 's' : '');
                if (minutes > 0) {
                    durationString += ' and ';
                }
            }

            if (minutes > 0) {
                durationString += minutes + ' minute' + (minutes > 1 ? 's' : '');
            }

            // Handle the case where duration is less than a minute
            if (durationString === '') {
                durationString = 'less than a minute';
            }

            document.getElementById('duration-display').textContent = 'Duration: ' + durationString;

            // Convert length to kilometers, keep one decimal, and add 'km'
            let distanceInKilometers = distanceInMeters / 1000;
            let distanceString = '';
            if (distanceInKilometers >= 1) {
                distanceString = distanceInKilometers.toFixed(1) + ' km';
            } else {
                // If less than 1 km, display in meters
                distanceString = Math.round(distanceInMeters) + ' meters';
            }

            document.getElementById('distance-display').textContent = 'Distance: ' + distanceString;          
            // Construct the new URL
            if (viaWaypoints.length === 0) {
                newUrl = `/map/?coordinates=${start}-${end}/`;
            }
            else{
                const waypointsStr = viaWaypoints.join('/');
                newUrl = `/map/?coordinates=${start}-${end}/${waypointsStr}/`;
            }
            
            clearMarkers();
            addMarkers(map, start, end, viaWaypoints);
        }
    }

    function onError(error) {
        console.error('Error:', error);
    }

    await router.calculateRoute(routingParameters, onResult, onError);
    toggleLoadingIndicator();

    
}

async function findRoute(){
    startDestination = [start["items"][0]["position"]["lat"], start["items"][0]["position"]["lng"]];
    endDestination = [end["items"][0]["position"]["lat"], end["items"][0]["position"]["lng"]];
    calculateRoute(platform, map, startDestination, endDestination);
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
            return []; // Return an empty array if no results found
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchUserData() {
    try {
        const response = await fetch('/get_user_data/');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

// Initialize the map once the window is loaded
window.onload = initMap;

