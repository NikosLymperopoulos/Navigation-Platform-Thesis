from django.contrib import admin
from .models import Address, UserProfile, City, UserProfile, Place

admin.site.register(Address)
admin.site.register(UserProfile)
admin.site.register(City)
admin.site.register(Place)