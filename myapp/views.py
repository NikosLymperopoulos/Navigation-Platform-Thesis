from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST

from .models import Address, Place, UserProfile, City
from .forms import UserProfileForm
import json
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth import authenticate, login as auth_login

from .forms import RegisterForm, LoginForm
from django.contrib import messages
from django.contrib.auth.models import User
# Create your views here.


def register(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('email')
            if User.objects.filter(email=email).exists():
                print('An account with this email already exists.')
                return redirect('register')
            
            user = form.save(commit=False)
            user.username = email  # Set username to email
            user.save()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect('/')
        else :
            for field, errors in form.errors.items():
                for error in errors:
                    print(error)
                    messages.success(request, error)
            return redirect('register')
    else:
        form = RegisterForm()
    return render(request, 'account/register.html', {'form': form})

@csrf_exempt
def login_method(request):
    if request.method == 'POST':
        # Assume request is AJAX (you can check using request.is_ajax() in older Django versions)
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        user = authenticate(request, username=email, password=password)
        if user is not None:
            auth_login(request, user)
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'message': 'Invalid credentials'})
    
    return render(request, 'account/login.html', {'form': LoginForm()})

def logout_view(request):
    logout(request)
    return redirect("/")

@login_required
def homepage(request):
    return render(request, 'homepage.html')

@csrf_exempt
def save_address(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        addresses = data.get('addresses')
        if addresses:
            for address in addresses:
                city = address.get('city')
                street = address.get('street')
                house_number = address.get('house_number')
                latitude = address.get('latitude')
                longitude = address.get('longitude')

                if not city or not street or not house_number:
                    continue
                if 'segment_id' in address: # This is the close vote functionality
                    segment_id = address['segment_id']
                    address_obj, created = Address.objects.get_or_create(
                        city=city,
                        street=street,
                        house_number=int(house_number)
                    )
                    
                    if created:
                        address_obj.segment_id = segment_id
                        address_obj.latitude = latitude
                        address_obj.longitude = longitude

                    address_obj.upvote()
                    address_obj.save()
                else : # This is the open_vote functionality 
                    try:
                        address_obj = Address.objects.get(
                            city=city,
                            street=street,
                            house_number=house_number
                        )
                        if address_obj.votes == 1:
                            address_obj.delete()  # Delete the object if votes will reach zero  
                        else :
                            address_obj.downvote() 
                            address_obj.save()  
                    except Address.DoesNotExist:
                        # Address does not exist, continue to the next address
                        continue
                    
            return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

def get_addresses(request):
    addresses = Address.objects.all().order_by('street', 'house_number')
    addresses_list = list(addresses.values())
    return JsonResponse({'addresses': addresses_list})

def get_segment_ids(request):
    if request.method == 'GET':
        addresses = Address.objects.all()
        segment_ids = [address.segment_id for address in addresses]
        return JsonResponse({'segment_ids': segment_ids})
    
@login_required
def profile(request):
    user_profile = UserProfile.objects.get(user=request.user)
    
    if request.method == 'POST':
        profile_form = UserProfileForm(request.POST, instance=user_profile)
        if profile_form.is_valid():
            profile_form.save()
            return redirect('profile')
    else:
        profile_form = UserProfileForm(instance=user_profile)

    context = {
        'profile_form': profile_form,
        'user_profile': user_profile
    }
    return render(request, 'profile.html', context)

@login_required
def get_user_data(request):
    user_profile = request.user.userprofile  # Get the UserProfile object for the logged-in user
    favorite_places = user_profile.favorite_places.all()  # Get all favorite places

    # Serialize favorite places
    favorite_places_data = [
        {'id': place.id, 'name': place.name } 
        for place in favorite_places
    ]

    user_data = {
        'home': user_profile.home,
        'work': user_profile.work,
        'favorite_places': favorite_places_data,
        'mobility_user': user_profile.mobility_user
    }

    return JsonResponse(user_data)

@login_required
def update_mobility_user(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=400)

    try:
        request_data = json.loads(request.body)
        mobility_user = request_data.get('mobility_user', False)

        user_profile = request.user.userprofile
        user_profile.mobility_user = mobility_user
        user_profile.save()

        user = request.user
        user.mobility_user = mobility_user 
        user.save()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@login_required
@require_POST
def add_favorite_place(request):
    user_profile = request.user.userprofile
    data = json.loads(request.body)
    place_name = data.get('name')
    
    if place_name:
        # Create or get a Place object
        place, created = Place.objects.get_or_create(name=place_name)
        user_profile.favorite_places.add(place)
        user_profile.save()

        # Return updated favorite places
        favorite_places_data = [
            {'id': place.id, 'name': place.name }
            for place in user_profile.favorite_places.all()
        ]
        return JsonResponse({'success': True, 'favorite_places': favorite_places_data})
    else:
        return JsonResponse({'success': False, 'message': 'Invalid place name.'})

@login_required
@require_POST
def delete_favorite_place(request):
    if request.method == 'POST':
        import json
        data = json.loads(request.body)
        place_name = data.get('name')
        user_profile = request.user.userprofile
        
        try:
            place = Place.objects.get(name=place_name)  # Find the place by name
            if place.favorited_by.count() == 1:
                place.delete() # If no users have favorited this place, delete it
            else:
                user_profile.favorite_places.remove(place)
            return JsonResponse({'status': 'success'})
        except Place.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Place not found'})
    return JsonResponse({'status': 'error', 'message': 'Invalid request'})

@csrf_exempt
def save_city_info(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        city_name = data.get('cityName')
        country_name = data.get('countryName')
        postal_code = data.get('postalCode')
        lat = data.get('lat')
        lng = data.get('lng')

        if all([city_name, postal_code, lat, lng]):
            city_info, created = City.objects.get_or_create(user=request.user) # Retrieve the City object

            # Update the City object fields
            city_info.name = city_name 
            city_info.country = country_name 
            city_info.postal_code = postal_code
            city_info.latitude = lat
            city_info.longitude = lng
            city_info.save()

            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'error', 'message': 'Incomplete data'}, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

@login_required
def get_city_info(request):
    try:
        city_info = City.objects.get(user=request.user)
        if city_info:
            data = {
                'name': city_info.name,
                'country': city_info.country,
                'postal_code': city_info.postal_code,
                'latitude': city_info.latitude,
                'longitude': city_info.longitude
            }
            return JsonResponse(data)
        else:
            return JsonResponse({'error': 'No city info found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required 
def map_view(request):
    coordinates_str = request.GET.get('coordinates', '')
    try:
        if coordinates_str:
            parts = coordinates_str.split('/')

            if len(parts) < 2:
                raise ValueError("Insufficient coordinates provided.")
            
            start_end_coords = parts[0]
            waypoint_coords = [wp for wp in parts[1:] if wp]
            waypoints = [wp.split(',') for wp in waypoint_coords]

            start_coords, end_coords = start_end_coords.split('-')
            start_lat, start_lng = start_coords.split(',')
            end_lat, end_lng = end_coords.split(',')

            context = {
                'start_lat': start_lat,
                'start_lng': start_lng,
                'end_lat': end_lat,
                'end_lng': end_lng,
                'waypoints': waypoints,
            }
            return render(request, 'map.html', context)
        return render(request, 'map.html')

    except ValueError:
        return JsonResponse({'status': 'error', 'message': 'Invalid coordinates format'}, status=400)
